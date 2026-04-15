package controller

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
)

func GetTopUpInfo(c *gin.Context) {
	// Load configured payment methods.
	payMethods := operation_setting.PayMethods

	// Append Stripe when it is enabled but missing from the list.
	if setting.StripeApiSecret != "" && setting.StripeWebhookSecret != "" && setting.StripePriceId != "" {
		// Avoid duplicate Stripe entries.
		hasStripe := false
		for _, method := range payMethods {
			if method["type"] == "stripe" {
				hasStripe = true
				break
			}
		}

		if !hasStripe {
			stripeMethod := map[string]string{
				"name":      "Stripe",
				"type":      "stripe",
				"color":     "rgba(var(--semi-purple-5), 1)",
				"min_topup": strconv.Itoa(setting.StripeMinTopUp),
			}
			payMethods = append(payMethods, stripeMethod)
		}
	}

	// Append Waffo when it is enabled but missing from the list.
	enableWaffo := setting.WaffoEnabled &&
		((!setting.WaffoSandbox &&
			setting.WaffoApiKey != "" &&
			setting.WaffoPrivateKey != "" &&
			setting.WaffoPublicCert != "") ||
			(setting.WaffoSandbox &&
				setting.WaffoSandboxApiKey != "" &&
				setting.WaffoSandboxPrivateKey != "" &&
				setting.WaffoSandboxPublicCert != ""))
	if enableWaffo {
		hasWaffo := false
		for _, method := range payMethods {
			if method["type"] == "waffo" {
				hasWaffo = true
				break
			}
		}

		if !hasWaffo {
			waffoMethod := map[string]string{
				"name":      "Waffo (Global Payment)",
				"type":      "waffo",
				"color":     "rgba(var(--semi-blue-5), 1)",
				"min_topup": strconv.Itoa(setting.WaffoMinTopUp),
			}
			payMethods = append(payMethods, waffoMethod)
		}
	}

	// Auto delivery products (only when feature is enabled)
	var autoDeliveryProducts interface{}
	if operation_setting.IsAutoDeliveryEnabled() {
		autoDeliveryProducts, _ = model.GetAutoDeliveryProducts(true)
	}

	data := gin.H{
		"enable_online_topup": operation_setting.PayAddress != "" && operation_setting.EpayId != "" && operation_setting.EpayKey != "",
		"enable_stripe_topup": setting.StripeApiSecret != "" && setting.StripeWebhookSecret != "" && setting.StripePriceId != "",
		"enable_creem_topup":  setting.CreemApiKey != "" && setting.CreemProducts != "[]",
		"enable_waffo_topup":  enableWaffo,
		"waffo_pay_methods": func() interface{} {
			if enableWaffo {
				return setting.GetWaffoPayMethods()
			}
			return nil
		}(),
		"creem_products":         setting.CreemProducts,
		"pay_methods":            payMethods,
		"min_topup":              operation_setting.MinTopUp,
		"stripe_min_topup":       setting.StripeMinTopUp,
		"waffo_min_topup":        setting.WaffoMinTopUp,
		"amount_options":         operation_setting.GetPaymentSetting().AmountOptions,
		"discount":               operation_setting.GetPaymentSetting().AmountDiscount,
		"gift":                   operation_setting.GetPaymentSetting().AmountGift,
		"custom_discount":        operation_setting.GetPaymentSetting().GetCustomDiscount(),
		"auto_delivery_products": autoDeliveryProducts,
	}
	common.ApiSuccess(c, data)
}

type EpayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

type AmountRequest struct {
	Amount int64 `json:"amount"`
}

func GetEpayClient() *epay.Client {
	if operation_setting.PayAddress == "" || operation_setting.EpayId == "" || operation_setting.EpayKey == "" {
		return nil
	}
	withUrl, err := epay.NewClient(&epay.Config{
		PartnerID: operation_setting.EpayId,
		Key:       operation_setting.EpayKey,
	}, operation_setting.PayAddress)
	if err != nil {
		return nil
	}
	return withUrl
}

func getPayMoney(amount int64, group string) float64 {
	dAmount := decimal.NewFromInt(amount)
	// Normalize the request amount based on the configured display type.
	// - USD/CNY: the frontend sends the monetary amount.
	// - TOKENS: the frontend sends token quota and it must be converted back to USD.
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		dAmount = dAmount.Div(dQuotaPerUnit)
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	dTopupGroupRatio := decimal.NewFromFloat(topupGroupRatio)
	dPrice := decimal.NewFromFloat(operation_setting.Price)
	// apply optional preset discount by the original request amount (if configured), default 1.0
	discount := operation_setting.GetPaymentSetting().GetDiscount(amount)
	dDiscount := decimal.NewFromFloat(discount)

	payMoney := dAmount.Mul(dPrice).Mul(dTopupGroupRatio).Mul(dDiscount)

	return payMoney.InexactFloat64()
}

func normalizeTopUpStoredAmount(amount int64) int64 {
	if amount <= 0 {
		return 0
	}
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(amount)
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		return dAmount.Div(dQuotaPerUnit).IntPart()
	}
	return amount
}

func getStoredGiftAmount(amount int64) int64 {
	giftAmount := operation_setting.GetPaymentSetting().GetGift(amount)
	if giftAmount <= 0 {
		return 0
	}
	return normalizeTopUpStoredAmount(giftAmount)
}

func getMinTopup() int64 {
	minTopup := operation_setting.MinTopUp
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dMinTopup := decimal.NewFromInt(int64(minTopup))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		minTopup = int(dMinTopup.Mul(dQuotaPerUnit).IntPart())
	}
	return int64(minTopup)
}

func RequestEpay(c *gin.Context) {
	var req EpayRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "\u53c2\u6570\u9519\u8bef"})
		return
	}
	if req.Amount < getMinTopup() {
		c.JSON(200, gin.H{"message": "error", "data": fmt.Sprintf("\u5145\u503c\u6570\u91cf\u4e0d\u80fd\u5c0f\u4e8e %d", getMinTopup())})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "\u83b7\u53d6\u7528\u6237\u5206\u7ec4\u5931\u8d25"})
		return
	}
	payMoney := getPayMoney(req.Amount, group)
	if payMoney < 0.01 {
		c.JSON(200, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	if !operation_setting.ContainsPayMethod(req.PaymentMethod) {
		c.JSON(200, gin.H{"message": "error", "data": "支付方式不存在"})
		return
	}

	callBackAddress := service.GetCallbackAddress(c)
	returnUrl, _ := url.Parse(callBackAddress + "/api/user/epay/return")
	notifyUrl, _ := url.Parse(callBackAddress + "/api/user/epay/notify")
	tradeNo := fmt.Sprintf("%s%d", common.GetRandomString(6), time.Now().Unix())
	tradeNo = fmt.Sprintf("USR%dNO%s", id, tradeNo)
	client := GetEpayClient()
	if client == nil {
		c.JSON(200, gin.H{"message": "error", "data": "\u5f53\u524d\u7ba1\u7406\u5458\u672a\u914d\u7f6e\u652f\u4ed8\u4fe1\u606f"})
		return
	}
	uri, params, err := client.Purchase(&epay.PurchaseArgs{
		Type:           req.PaymentMethod,
		ServiceTradeNo: tradeNo,
		Name:           fmt.Sprintf("TUC%d", req.Amount),
		Money:          strconv.FormatFloat(payMoney, 'f', 2, 64),
		Device:         epay.PC,
		NotifyUrl:      notifyUrl,
		ReturnUrl:      returnUrl,
	})
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "\u62c9\u8d77\u652f\u4ed8\u5931\u8d25"})
		return
	}
	amount := normalizeTopUpStoredAmount(req.Amount)
	giftAmount := getStoredGiftAmount(req.Amount)
	topUp := &model.TopUp{
		UserId:            id,
		Amount:            amount,
		GiftAmount:        giftAmount,
		CreditAmount:      amount + giftAmount,
		Money:             payMoney,
		TradeNo:           tradeNo,
		PaymentMethod:     req.PaymentMethod,
		ClientIP:          c.ClientIP(),
		DeviceFingerprint: getRequestDeviceFingerprint(c),
		CreateTime:        time.Now().Unix(),
		Status:            common.TopUpStatusPending,
	}
	err = topUp.Insert()
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "\u521b\u5efa\u8ba2\u5355\u5931\u8d25"})
		return
	}
	c.JSON(200, gin.H{"message": "success", "data": params, "url": uri})
}

// tradeNo lock
var orderLocks sync.Map
var createLock sync.Mutex

// refCountedMutex keeps a reference-counted mutex per trade number.
type refCountedMutex struct {
	mu       sync.Mutex
	refCount int
}

// LockOrder 灏濊瘯瀵圭粰瀹氳鍗曞彿鍔犻攣
func LockOrder(tradeNo string) {
	createLock.Lock()
	var rcm *refCountedMutex
	if v, ok := orderLocks.Load(tradeNo); ok {
		rcm = v.(*refCountedMutex)
	} else {
		rcm = &refCountedMutex{}
		orderLocks.Store(tradeNo, rcm)
	}
	rcm.refCount++
	createLock.Unlock()
	rcm.mu.Lock()
}

// UnlockOrder releases the mutex for a trade number.
func UnlockOrder(tradeNo string) {
	v, ok := orderLocks.Load(tradeNo)
	if !ok {
		return
	}
	rcm := v.(*refCountedMutex)
	rcm.mu.Unlock()

	createLock.Lock()
	rcm.refCount--
	if rcm.refCount == 0 {
		orderLocks.Delete(tradeNo)
	}
	createLock.Unlock()
}

func getEpayParams(c *gin.Context) (map[string]string, error) {
	var params map[string]string

	if c.Request.Method == http.MethodPost {
		if err := c.Request.ParseForm(); err != nil {
			return nil, err
		}
		params = lo.Reduce(lo.Keys(c.Request.PostForm), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.PostForm.Get(t)
			return r
		}, map[string]string{})
	} else {
		params = lo.Reduce(lo.Keys(c.Request.URL.Query()), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.URL.Query().Get(t)
			return r
		}, map[string]string{})
	}

	if len(params) == 0 {
		return nil, fmt.Errorf("empty epay params")
	}
	return params, nil
}

func verifyEpayParams(params map[string]string) (*epay.VerifyRes, error) {
	if len(params) == 0 {
		return nil, fmt.Errorf("empty epay params")
	}
	client := GetEpayClient()
	if client == nil {
		return nil, fmt.Errorf("epay client is not configured")
	}
	verifyInfo, err := client.Verify(params)
	if err != nil {
		return nil, err
	}
	if !verifyInfo.VerifyStatus {
		return nil, fmt.Errorf("epay signature verification failed")
	}
	return verifyInfo, nil
}

func finalizeEpayTopUp(tradeNo string, paymentOrderNo string) error {
	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)
	return model.CompleteTopUpWithPaymentOrderNo(tradeNo, paymentOrderNo)
}

func EpayNotify(c *gin.Context) {
	params, err := getEpayParams(c)
	if err != nil {
		log.Println("failed to parse epay notify params:", err)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	verifyInfo, err := verifyEpayParams(params)
	if err != nil {
		log.Println("failed to verify epay notify:", err)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if verifyInfo.TradeStatus != epay.StatusTradeSuccess {
		log.Printf("unexpected epay trade status: %s, trade_no=%s", verifyInfo.TradeStatus, verifyInfo.ServiceTradeNo)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	if err := finalizeEpayTopUp(verifyInfo.ServiceTradeNo, verifyInfo.TradeNo); err != nil {
		log.Printf("failed to complete epay topup %s: %v", verifyInfo.ServiceTradeNo, err)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	_, _ = c.Writer.Write([]byte("success"))
}

func EpayReturn(c *gin.Context) {
	params, err := getEpayParams(c)
	if err != nil {
		log.Println("failed to parse epay return params:", err)
		c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=fail&show_history=true")
		return
	}

	verifyInfo, err := verifyEpayParams(params)
	if err != nil {
		log.Println("failed to verify epay return:", err)
		c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=fail&show_history=true")
		return
	}
	if verifyInfo.TradeStatus != epay.StatusTradeSuccess {
		c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=pending&show_history=true")
		return
	}

	if err := finalizeEpayTopUp(verifyInfo.ServiceTradeNo, verifyInfo.TradeNo); err != nil {
		log.Printf("failed to complete epay return topup %s: %v", verifyInfo.ServiceTradeNo, err)
		c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=fail&show_history=true")
		return
	}

	c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=success&show_history=true")
}

func RequestAmount(c *gin.Context) {
	var req AmountRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "\u53c2\u6570\u9519\u8bef"})
		return
	}

	if req.Amount < getMinTopup() {
		c.JSON(200, gin.H{"message": "error", "data": fmt.Sprintf("\u5145\u503c\u6570\u91cf\u4e0d\u80fd\u5c0f\u4e8e %d", getMinTopup())})
		return
	}
	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "\u83b7\u53d6\u7528\u6237\u5206\u7ec4\u5931\u8d25"})
		return
	}
	payMoney := getPayMoney(req.Amount, group)
	if payMoney <= 0.01 {
		c.JSON(200, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}
	c.JSON(200, gin.H{"message": "success", "data": strconv.FormatFloat(payMoney, 'f', 2, 64)})
}

func GetUserTopUps(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")

	var (
		topups []*model.TopUp
		total  int64
		err    error
	)
	if keyword != "" {
		topups, total, err = model.SearchUserTopUps(userId, keyword, pageInfo)
	} else {
		topups, total, err = model.GetUserTopUps(userId, pageInfo)
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(topups)
	common.ApiSuccess(c, pageInfo)
}

// GetAllTopUps returns all topup records for admins.
func GetAllTopUps(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")

	var (
		topups []*model.TopUp
		total  int64
		err    error
	)
	if keyword != "" {
		topups, total, err = model.SearchAllTopUps(keyword, pageInfo)
	} else {
		topups, total, err = model.GetAllTopUps(pageInfo)
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(topups)
	common.ApiSuccess(c, pageInfo)
}

type AdminCompleteTopupRequest struct {
	TradeNo string `json:"trade_no"`
}

// AdminCompleteTopUp manually completes a pending topup order.
func AdminCompleteTopUp(c *gin.Context) {
	var req AdminCompleteTopupRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.TradeNo == "" {
		common.ApiErrorMsg(c, "\u53c2\u6570\u9519\u8bef")
		return
	}

	// 璁㈠崟绾т簰鏂ワ紝闃叉骞跺彂琛ュ崟
	LockOrder(req.TradeNo)
	defer UnlockOrder(req.TradeNo)

	if err := model.ManualCompleteTopUp(req.TradeNo); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}
