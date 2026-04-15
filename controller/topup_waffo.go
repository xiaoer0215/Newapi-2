package controller

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/thanhpk/randstr"
	waffo "github.com/waffo-com/waffo-go"
	"github.com/waffo-com/waffo-go/config"
	"github.com/waffo-com/waffo-go/core"
	"github.com/waffo-com/waffo-go/types/order"
)

func getWaffoSDK() (*waffo.Waffo, error) {
	env := config.Sandbox
	apiKey := setting.WaffoSandboxApiKey
	privateKey := setting.WaffoSandboxPrivateKey
	publicKey := setting.WaffoSandboxPublicCert
	if !setting.WaffoSandbox {
		env = config.Production
		apiKey = setting.WaffoApiKey
		privateKey = setting.WaffoPrivateKey
		publicKey = setting.WaffoPublicCert
	}

	builder := config.NewConfigBuilder().
		APIKey(apiKey).
		PrivateKey(privateKey).
		WaffoPublicKey(publicKey).
		Environment(env)
	if setting.WaffoMerchantId != "" {
		builder = builder.MerchantID(setting.WaffoMerchantId)
	}
	cfg, err := builder.Build()
	if err != nil {
		return nil, err
	}
	return waffo.New(cfg), nil
}

func getWaffoUserEmail(user *model.User) string {
	return fmt.Sprintf("%d@examples.com", user.Id)
}

func getWaffoCurrency() string {
	if setting.WaffoCurrency != "" {
		return setting.WaffoCurrency
	}
	return "USD"
}

var zeroDecimalCurrencies = map[string]bool{
	"IDR": true,
	"JPY": true,
	"KRW": true,
	"VND": true,
}

func formatWaffoAmount(amount float64, currency string) string {
	if zeroDecimalCurrencies[currency] {
		return fmt.Sprintf("%.0f", amount)
	}
	return fmt.Sprintf("%.2f", amount)
}

func getWaffoPayMoney(amount float64, group string) float64 {
	originalAmount := amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		amount = amount / common.QuotaPerUnit
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	discount := operation_setting.GetPaymentSetting().GetDiscount(int64(originalAmount))
	return amount * setting.WaffoUnitPrice * topupGroupRatio * discount
}

type WaffoPayRequest struct {
	Amount         int64  `json:"amount"`
	PayMethodIndex *int   `json:"pay_method_index"`
	PayMethodType  string `json:"pay_method_type"`
	PayMethodName  string `json:"pay_method_name"`
}

func RequestWaffoPay(c *gin.Context) {
	if !setting.WaffoEnabled {
		c.JSON(200, gin.H{"message": "error", "data": "Waffo 支付未启用"})
		return
	}

	var req WaffoPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	waffoMinTopup := int64(setting.WaffoMinTopUp)
	if req.Amount < waffoMinTopup {
		c.JSON(200, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", waffoMinTopup)})
		return
	}

	id := c.GetInt("id")
	user, err := model.GetUserById(id, false)
	if err != nil || user == nil {
		c.JSON(200, gin.H{"message": "error", "data": "用户不存在"})
		return
	}

	var resolvedPayMethodType, resolvedPayMethodName string
	methods := setting.GetWaffoPayMethods()
	if req.PayMethodIndex != nil {
		idx := *req.PayMethodIndex
		if idx < 0 || idx >= len(methods) {
			log.Printf("invalid waffo pay method index: %d, user=%d", idx, id)
			c.JSON(200, gin.H{"message": "error", "data": "不支持的支付方式"})
			return
		}
		resolvedPayMethodType = methods[idx].PayMethodType
		resolvedPayMethodName = methods[idx].PayMethodName
	} else if req.PayMethodType != "" {
		valid := false
		for _, method := range methods {
			if method.PayMethodType == req.PayMethodType && method.PayMethodName == req.PayMethodName {
				valid = true
				resolvedPayMethodType = method.PayMethodType
				resolvedPayMethodName = method.PayMethodName
				break
			}
		}
		if !valid {
			log.Printf("invalid waffo pay method: type=%s name=%s user=%d", req.PayMethodType, req.PayMethodName, id)
			c.JSON(200, gin.H{"message": "error", "data": "不支持的支付方式"})
			return
		}
	}

	group, _ := model.GetUserGroup(id, true)
	payMoney := getWaffoPayMoney(float64(req.Amount), group)
	if payMoney < 0.01 {
		c.JSON(200, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	merchantOrderId := fmt.Sprintf("WAFFO-%d-%d-%s", id, time.Now().UnixMilli(), randstr.String(6))
	paymentRequestId := merchantOrderId

	amount := normalizeTopUpStoredAmount(req.Amount)
	if amount <= 0 {
		amount = 1
	}
	giftAmount := getStoredGiftAmount(req.Amount)

	topUp := &model.TopUp{
		UserId:            id,
		Amount:            amount,
		GiftAmount:        giftAmount,
		CreditAmount:      amount + giftAmount,
		Money:             payMoney,
		TradeNo:           merchantOrderId,
		PaymentMethod:     "waffo",
		ClientIP:          c.ClientIP(),
		DeviceFingerprint: getRequestDeviceFingerprint(c),
		CreateTime:        time.Now().Unix(),
		Status:            common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		log.Printf("create waffo order failed: %v", err)
		c.JSON(200, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	sdk, err := getWaffoSDK()
	if err != nil {
		log.Printf("init waffo sdk failed: %v", err)
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		c.JSON(200, gin.H{"message": "error", "data": "支付配置错误"})
		return
	}

	callbackAddr := service.GetCallbackAddress(c)
	notifyURL := callbackAddr + "/api/waffo/webhook"
	if setting.WaffoNotifyUrl != "" {
		notifyURL = setting.WaffoNotifyUrl
	}
	returnURL := system_setting.ServerAddress + "/console/topup?show_history=true"
	if setting.WaffoReturnUrl != "" {
		returnURL = setting.WaffoReturnUrl
	}

	currency := getWaffoCurrency()
	createParams := &order.CreateOrderParams{
		PaymentRequestID: paymentRequestId,
		MerchantOrderID:  merchantOrderId,
		OrderAmount:      formatWaffoAmount(payMoney, currency),
		OrderCurrency:    currency,
		OrderDescription: fmt.Sprintf("Recharge %d credits", req.Amount),
		OrderRequestedAt: time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
		NotifyURL:        notifyURL,
		MerchantInfo: &order.MerchantInfo{
			MerchantID: setting.WaffoMerchantId,
		},
		UserInfo: &order.UserInfo{
			UserID:       strconv.Itoa(user.Id),
			UserEmail:    getWaffoUserEmail(user),
			UserTerminal: "WEB",
		},
		PaymentInfo: &order.PaymentInfo{
			ProductName:   "ONE_TIME_PAYMENT",
			PayMethodType: resolvedPayMethodType,
			PayMethodName: resolvedPayMethodName,
		},
		SuccessRedirectURL: returnURL,
		FailedRedirectURL:  returnURL,
	}

	resp, err := sdk.Order().Create(c.Request.Context(), createParams, nil)
	if err != nil {
		log.Printf("create waffo remote order failed: %v", err)
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		c.JSON(200, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}
	if !resp.IsSuccess() {
		log.Printf("waffo order business failed: [%s] %s, resp=%+v", resp.Code, resp.Message, resp)
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		c.JSON(200, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	orderData := resp.GetData()
	if orderData.AcquiringOrderID != "" {
		topUp.PaymentOrderNo = orderData.AcquiringOrderID
		if err := topUp.Update(); err != nil {
			log.Printf("update waffo payment order no failed: %v", err)
		}
	}
	paymentURL := orderData.FetchRedirectURL()
	if paymentURL == "" {
		paymentURL = orderData.OrderAction
	}

	c.JSON(200, gin.H{
		"message": "success",
		"data": gin.H{
			"payment_url": paymentURL,
			"order_id":    merchantOrderId,
		},
	})
}

type webhookPayloadWithSubInfo struct {
	EventType string `json:"eventType"`
	Result    struct {
		core.PaymentNotificationResult
		SubscriptionInfo *webhookSubscriptionInfo `json:"subscriptionInfo,omitempty"`
	} `json:"result"`
}

type webhookSubscriptionInfo struct {
	Period              string `json:"period,omitempty"`
	MerchantRequest     string `json:"merchantRequest,omitempty"`
	SubscriptionID      string `json:"subscriptionId,omitempty"`
	SubscriptionRequest string `json:"subscriptionRequest,omitempty"`
}

func WaffoWebhook(c *gin.Context) {
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("read waffo webhook body failed: %v", err)
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	sdk, err := getWaffoSDK()
	if err != nil {
		log.Printf("init waffo webhook sdk failed: %v", err)
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	wh := sdk.Webhook()
	bodyStr := string(bodyBytes)
	signature := c.GetHeader("X-SIGNATURE")
	if !wh.VerifySignature(bodyStr, signature) {
		log.Printf("verify waffo webhook signature failed")
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	var event core.WebhookEvent
	if err := common.Unmarshal(bodyBytes, &event); err != nil {
		log.Printf("parse waffo webhook failed: %v", err)
		sendWaffoWebhookResponse(c, wh, false, "invalid payload")
		return
	}

	switch event.EventType {
	case core.EventPayment:
		var payload webhookPayloadWithSubInfo
		if err := common.Unmarshal(bodyBytes, &payload); err != nil {
			sendWaffoWebhookResponse(c, wh, false, "invalid payment payload")
			return
		}
		handleWaffoPayment(c, wh, &payload.Result.PaymentNotificationResult)
	default:
		log.Printf("ignore unknown waffo event: %s", event.EventType)
		sendWaffoWebhookResponse(c, wh, true, "")
	}
}

func handleWaffoPayment(c *gin.Context, wh *core.WebhookHandler, result *core.PaymentNotificationResult) {
	if result.OrderStatus != "PAY_SUCCESS" {
		log.Printf("waffo order not successful: %s, order=%s", result.OrderStatus, result.MerchantOrderID)
		if result.MerchantOrderID != "" {
			if topUp := model.GetTopUpByTradeNo(result.MerchantOrderID); topUp != nil && topUp.Status == common.TopUpStatusPending {
				topUp.Status = common.TopUpStatusFailed
				_ = topUp.Update()
			}
		}
		sendWaffoWebhookResponse(c, wh, true, "")
		return
	}

	merchantOrderID := result.MerchantOrderID
	LockOrder(merchantOrderID)
	defer UnlockOrder(merchantOrderID)

	if err := model.RechargeWaffo(merchantOrderID, result.AcquiringOrderID); err != nil {
		log.Printf("waffo recharge failed: %v, order=%s", err, merchantOrderID)
		sendWaffoWebhookResponse(c, wh, false, err.Error())
		return
	}

	sendWaffoWebhookResponse(c, wh, true, "")
}

func sendWaffoWebhookResponse(c *gin.Context, wh *core.WebhookHandler, success bool, msg string) {
	var body string
	var sig string
	if success {
		body, sig = wh.BuildSuccessResponse()
	} else {
		body, sig = wh.BuildFailedResponse(msg)
	}
	c.Header("X-SIGNATURE", sig)
	c.Data(http.StatusOK, "application/json", []byte(body))
}
