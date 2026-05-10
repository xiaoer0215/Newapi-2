package controller

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
)

type SubscriptionEpayPayRequest struct {
	PlanId        int    `json:"plan_id"`
	PaymentMethod string `json:"payment_method"`
}

func SubscriptionRequestEpay(c *gin.Context) {
	var req SubscriptionEpayPayRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	plan, err := model.GetSubscriptionPlanById(req.PlanId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !plan.Enabled {
		common.ApiErrorMsg(c, "套餐未启用")
		return
	}
	if plan.PriceAmount < 0.01 {
		common.ApiErrorMsg(c, "套餐金额过低")
		return
	}
	if !operation_setting.ContainsPayMethod(req.PaymentMethod) {
		common.ApiErrorMsg(c, "支付方式不存在")
		return
	}

	userId := c.GetInt("id")
	if plan.MaxPurchasePerUser > 0 {
		count, err := model.CountUserSubscriptionsByPlan(userId, plan.Id)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		if count >= int64(plan.MaxPurchasePerUser) {
			common.ApiErrorMsg(c, "已达到该套餐购买上限")
			return
		}
	}

	callBackAddress := service.GetCallbackAddress(c)
	returnUrl, err := url.Parse(callBackAddress + "/api/subscription/epay/return")
	if err != nil {
		common.ApiErrorMsg(c, "回调地址配置错误")
		return
	}
	notifyUrl, err := url.Parse(callBackAddress + "/api/subscription/epay/notify")
	if err != nil {
		common.ApiErrorMsg(c, "回调地址配置错误")
		return
	}

	tradeNo := fmt.Sprintf("%s%d", common.GetRandomString(6), time.Now().Unix())
	tradeNo = fmt.Sprintf("SUBUSR%dNO%s", userId, tradeNo)

	client := GetEpayClient()
	if client == nil {
		common.ApiErrorMsg(c, "当前管理员未配置支付信息")
		return
	}

	orderName := fmt.Sprintf("SUBPLAN%d", plan.Id)
	moneyText := strconv.FormatFloat(plan.PriceAmount, 'f', 2, 64)
	order := &model.SubscriptionOrder{
		UserId:        userId,
		PlanId:        plan.Id,
		Money:         plan.PriceAmount,
		TradeNo:       tradeNo,
		PaymentMethod: req.PaymentMethod,
		CreateTime:    time.Now().Unix(),
		Status:        common.TopUpStatusPending,
	}
	uri, params, err := client.Purchase(&epay.PurchaseArgs{
		Type:           req.PaymentMethod,
		ServiceTradeNo: tradeNo,
		Name:           orderName,
		Money:          moneyText,
		Device:         epay.PC,
		NotifyUrl:      notifyUrl,
		ReturnUrl:      returnUrl,
	})
	if err != nil {
		log.Printf(
			"subscription epay pay: purchase failed trade_no=%s plan_id=%d method=%s callback=%s return=%s notify=%s err=%v",
			tradeNo,
			plan.Id,
			req.PaymentMethod,
			callBackAddress,
			returnUrl.String(),
			notifyUrl.String(),
			err,
		)
		common.ApiErrorMsg(c, "拉起支付失败")
		return
	}
	if err := order.Insert(); err != nil {
		log.Printf("subscription epay pay: insert order failed trade_no=%s err=%v", tradeNo, err)
		common.ApiErrorMsg(c, "创建订单失败")
		return
	}
	log.Printf(
		"subscription epay pay: created trade_no=%s plan_id=%d method=%s name=%s money=%s callback=%s return=%s notify=%s uri=%s param_keys=%s",
		tradeNo,
		plan.Id,
		req.PaymentMethod,
		orderName,
		moneyText,
		callBackAddress,
		returnUrl.String(),
		notifyUrl.String(),
		uri,
		strings.Join(lo.Keys(params), ","),
	)
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": params, "url": uri})
}

func SubscriptionEpayNotify(c *gin.Context) {
	params, err := getEpayParams(c)
	if err != nil {
		log.Printf("subscription epay notify: parse params failed, method=%s raw_query=%s err=%v", c.Request.Method, c.Request.URL.RawQuery, err)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	log.Printf("subscription epay notify: received method=%s raw_query=%s keys=%s", c.Request.Method, c.Request.URL.RawQuery, strings.Join(lo.Keys(params), ","))

	verifyInfo, err := verifyEpayParams(params)
	if err != nil {
		log.Printf("subscription epay notify: verify failed raw_query=%s err=%v", c.Request.URL.RawQuery, err)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	log.Printf("subscription epay notify: verified trade_no=%s status=%s", verifyInfo.ServiceTradeNo, verifyInfo.TradeStatus)

	if verifyInfo.TradeStatus != epay.StatusTradeSuccess {
		log.Printf("subscription epay notify: unexpected trade status=%s trade_no=%s", verifyInfo.TradeStatus, verifyInfo.ServiceTradeNo)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	log.Printf("subscription epay notify: locking trade_no=%s", verifyInfo.ServiceTradeNo)
	LockOrder(verifyInfo.ServiceTradeNo)
	defer UnlockOrder(verifyInfo.ServiceTradeNo)
	log.Printf("subscription epay notify: locked trade_no=%s", verifyInfo.ServiceTradeNo)

	log.Printf("subscription epay notify: completing trade_no=%s", verifyInfo.ServiceTradeNo)
	if err := model.CompleteSubscriptionOrder(verifyInfo.ServiceTradeNo, common.GetJsonString(verifyInfo), verifyInfo.TradeNo); err != nil {
		log.Printf("subscription epay notify: complete order failed trade_no=%s err=%v", verifyInfo.ServiceTradeNo, err)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	log.Printf("subscription epay notify: completed trade_no=%s", verifyInfo.ServiceTradeNo)

	_, _ = c.Writer.Write([]byte("success"))
}

// SubscriptionEpayReturn handles browser return after payment.
// It verifies the payload and completes the order, then redirects to console.
func SubscriptionEpayReturn(c *gin.Context) {
	params, err := getEpayParams(c)
	if err != nil {
		log.Printf("subscription epay return: parse params failed, method=%s raw_query=%s err=%v", c.Request.Method, c.Request.URL.RawQuery, err)
		c.Redirect(http.StatusFound, consoleTopupRedirect("pay=fail&show_history=true"))
		return
	}
	log.Printf("subscription epay return: received method=%s raw_query=%s keys=%s", c.Request.Method, c.Request.URL.RawQuery, strings.Join(lo.Keys(params), ","))

	verifyInfo, err := verifyEpayParams(params)
	if err != nil {
		log.Printf("subscription epay return: verify failed raw_query=%s err=%v", c.Request.URL.RawQuery, err)
		c.Redirect(http.StatusFound, consoleTopupRedirect("pay=fail&show_history=true"))
		return
	}
	log.Printf("subscription epay return: verified trade_no=%s status=%s", verifyInfo.ServiceTradeNo, verifyInfo.TradeStatus)
	if verifyInfo.TradeStatus == epay.StatusTradeSuccess {
		log.Printf("subscription epay return: locking trade_no=%s", verifyInfo.ServiceTradeNo)
		LockOrder(verifyInfo.ServiceTradeNo)
		defer UnlockOrder(verifyInfo.ServiceTradeNo)
		log.Printf("subscription epay return: locked trade_no=%s", verifyInfo.ServiceTradeNo)
		log.Printf("subscription epay return: completing trade_no=%s", verifyInfo.ServiceTradeNo)
		if err := model.CompleteSubscriptionOrder(verifyInfo.ServiceTradeNo, common.GetJsonString(verifyInfo), verifyInfo.TradeNo); err != nil {
			log.Printf("subscription epay return: complete order failed trade_no=%s err=%v", verifyInfo.ServiceTradeNo, err)
			c.Redirect(http.StatusFound, consoleTopupRedirect("pay=fail&show_history=true"))
			return
		}
		log.Printf("subscription epay return: completed trade_no=%s", verifyInfo.ServiceTradeNo)
		log.Printf("subscription epay return: success trade_no=%s", verifyInfo.ServiceTradeNo)
		c.Redirect(http.StatusFound, consoleTopupRedirect("pay=success&show_history=true"))
		return
	}
	log.Printf("subscription epay return: pending trade status=%s trade_no=%s", verifyInfo.TradeStatus, verifyInfo.ServiceTradeNo)
	c.Redirect(http.StatusFound, consoleTopupRedirect("pay=pending&show_history=true"))
}
