package operation_setting

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/shopspring/decimal"
)

var InvitationRegisterReward = 0.0
var InvitationFirstTopupThreshold = 0.0
var InvitationFirstTopupReward = 0.0
var InvitationRewardRule = ""

func DisplayAmountToQuota(amount float64) int {
	if amount <= 0 {
		return 0
	}

	if GetQuotaDisplayType() == QuotaDisplayTypeTokens {
		return int(decimal.NewFromFloat(amount).Round(0).IntPart())
	}

	rate := GetUsdToCurrencyRate(USDExchangeRate)
	if rate <= 0 {
		rate = 1
	}

	usdAmount := decimal.NewFromFloat(amount).Div(decimal.NewFromFloat(rate))
	quota := usdAmount.Mul(decimal.NewFromFloat(common.QuotaPerUnit))
	return int(quota.Round(0).IntPart())
}
