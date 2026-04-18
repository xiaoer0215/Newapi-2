package setting

var StripeApiSecret = ""
var StripeWebhookSecret = ""
var StripePriceId = ""
var StripeUnitPrice = 8.0
var StripeMinTopUp = 1
var StripeTopUpEnabled = true
var StripePromotionCodesEnabled = false

func IsStripeTopUpEnabled() bool {
	return StripeTopUpEnabled &&
		StripeApiSecret != "" &&
		StripeWebhookSecret != "" &&
		StripePriceId != ""
}
