package operation_setting

import (
	"strings"

	"github.com/QuantumNous/new-api/setting/config"
)

type GroupAmountOverride struct {
	DiscountedPrice *float64 `json:"discounted_price,omitempty"`
	Gift            *int64   `json:"gift,omitempty"`
	Amount          *int64   `json:"amount,omitempty"`
}

type PaymentSetting struct {
	AmountOptions        []int                                  `json:"amount_options"`
	AmountDiscount       map[int]float64                        `json:"amount_discount"`
	AmountGift           map[int]int64                          `json:"amount_gift"`
	CustomDiscount       float64                                `json:"custom_discount"` // Deprecated: custom amount discount is disabled, kept only for config compatibility.
	GroupAmountOverrides map[string]map[int]GroupAmountOverride `json:"group_amount_overrides"`
	GroupMinTopup        map[string]int64                       `json:"group_min_topup"`
}

var paymentSetting = PaymentSetting{
	AmountOptions:        []int{10, 20, 50, 100, 200, 500},
	AmountDiscount:       map[int]float64{},
	AmountGift:           map[int]int64{},
	CustomDiscount:       0,
	GroupAmountOverrides: map[string]map[int]GroupAmountOverride{},
	GroupMinTopup:        map[string]int64{},
}

func init() {
	config.GlobalConfig.Register("payment_setting", &paymentSetting)
}

func GetPaymentSetting() *PaymentSetting {
	return &paymentSetting
}

func (p *PaymentSetting) GetGroupAmountOverride(group string, amount int64) (GroupAmountOverride, bool) {
	if p == nil || group == "" || p.GroupAmountOverrides == nil {
		return GroupAmountOverride{}, false
	}
	groupOverrides, ok := p.GroupAmountOverrides[group]
	if !ok || groupOverrides == nil {
		return GroupAmountOverride{}, false
	}
	override, ok := groupOverrides[int(amount)]
	if !ok {
		return GroupAmountOverride{}, false
	}
	return override, true
}

func (p *PaymentSetting) HasGroupPricingOverride(group string) bool {
	if p == nil || group == "" || p.GroupAmountOverrides == nil {
		return false
	}
	groupOverrides, ok := p.GroupAmountOverrides[group]
	if !ok || groupOverrides == nil {
		return false
	}
	for _, override := range groupOverrides {
		if override.DiscountedPrice != nil || (override.Amount != nil && *override.Amount > 0) {
			return true
		}
	}
	return false
}

func (p *PaymentSetting) GetGroupAmountOverrideByEffectiveAmount(group string, effectiveAmount int64) (int64, GroupAmountOverride, bool) {
	if p == nil || group == "" || effectiveAmount <= 0 || p.GroupAmountOverrides == nil {
		return 0, GroupAmountOverride{}, false
	}
	groupOverrides, ok := p.GroupAmountOverrides[group]
	if !ok || groupOverrides == nil {
		return 0, GroupAmountOverride{}, false
	}
	var (
		matchedBase        int64
		matchedOverride    GroupAmountOverride
		found              bool
		matchedExplicitAmt bool
	)
	for baseAmount, override := range groupOverrides {
		overrideAmount := int64(baseAmount)
		explicitAmount := override.Amount != nil && *override.Amount > 0
		if explicitAmount {
			overrideAmount = *override.Amount
		}
		if overrideAmount == effectiveAmount {
			candidateBase := int64(baseAmount)
			if !found ||
				(explicitAmount && !matchedExplicitAmt) ||
				(explicitAmount == matchedExplicitAmt && candidateBase < matchedBase) {
				matchedBase = candidateBase
				matchedOverride = override
				matchedExplicitAmt = explicitAmount
				found = true
			}
		}
	}
	if !found {
		return 0, GroupAmountOverride{}, false
	}
	return matchedBase, matchedOverride, true
}

func (p *PaymentSetting) GetAmountForGroup(amount int64, group string) int64 {
	if amount <= 0 {
		return 0
	}
	override, ok := p.GetGroupAmountOverride(group, amount)
	if ok && override.Amount != nil && *override.Amount > 0 {
		return *override.Amount
	}
	return amount
}

func (p *PaymentSetting) GetGroupDiscountedPrice(group string, amount int64) (float64, bool) {
	if _, override, found := p.GetGroupAmountOverrideByEffectiveAmount(group, amount); found && override.DiscountedPrice != nil {
		discountedPrice := *override.DiscountedPrice
		if discountedPrice <= 0 {
			return 0, false
		}
		return discountedPrice, true
	}
	override, ok := p.GetGroupAmountOverride(group, amount)
	if !ok || override.DiscountedPrice == nil {
		return 0, false
	}
	discountedPrice := *override.DiscountedPrice
	if discountedPrice <= 0 {
		return 0, false
	}
	return discountedPrice, true
}

func (p *PaymentSetting) HasAmountOption(amount int64) bool {
	if p == nil || amount <= 0 {
		return false
	}
	amountInt := int(amount)
	for _, option := range p.AmountOptions {
		if option == amountInt {
			return true
		}
	}
	if p.AmountDiscount != nil {
		if _, ok := p.AmountDiscount[amountInt]; ok {
			return true
		}
	}
	if p.AmountGift != nil {
		if _, ok := p.AmountGift[amountInt]; ok {
			return true
		}
	}
	return false
}

func (p *PaymentSetting) GetPresetDiscountedPrice(amount int64) (float64, bool) {
	if p == nil || amount <= 0 || !p.HasAmountOption(amount) {
		return 0, false
	}
	return float64(amount) * p.GetDiscount(amount), true
}

func (p *PaymentSetting) GetDiscount(amount int64) float64 {
	if p == nil {
		return 1
	}
	if p.AmountDiscount != nil {
		if discount, ok := p.AmountDiscount[int(amount)]; ok && discount > 0 {
			return discount
		}
	}
	return 1
}

func (p *PaymentSetting) GetDiscountForGroup(amount int64, group string) float64 {
	if discountedPrice, ok := p.GetGroupDiscountedPrice(group, amount); ok && amount > 0 {
		return discountedPrice / float64(amount)
	}
	if discountedPrice, ok := p.GetPresetDiscountedPrice(amount); ok && amount > 0 {
		return discountedPrice / float64(amount)
	}
	return 1
}

func (p *PaymentSetting) GetGift(amount int64) int64 {
	if p == nil || p.AmountGift == nil {
		return 0
	}
	if gift, ok := p.AmountGift[int(amount)]; ok && gift > 0 {
		return gift
	}
	return 0
}

func (p *PaymentSetting) GetGiftForGroup(amount int64, group string) int64 {
	if _, override, found := p.GetGroupAmountOverrideByEffectiveAmount(group, amount); found && override.Gift != nil {
		if *override.Gift <= 0 {
			return 0
		}
		return *override.Gift
	}
	override, ok := p.GetGroupAmountOverride(group, amount)
	if ok && override.Gift != nil {
		if *override.Gift <= 0 {
			return 0
		}
		return *override.Gift
	}
	return p.GetGift(amount)
}

func (p *PaymentSetting) GetMinTopupForGroup(group string, fallback int64) int64 {
	if fallback <= 0 {
		fallback = 1
	}
	if p == nil || p.GroupMinTopup == nil {
		return fallback
	}
	group = strings.TrimSpace(group)
	if group == "" {
		return fallback
	}
	if minTopup, ok := p.GroupMinTopup[group]; ok && minTopup > 0 {
		return minTopup
	}
	return fallback
}

func (p *PaymentSetting) HasGroupMinTopup(group string) bool {
	if p == nil || p.GroupMinTopup == nil {
		return false
	}
	group = strings.TrimSpace(group)
	if group == "" {
		return false
	}
	minTopup, ok := p.GroupMinTopup[group]
	return ok && minTopup > 0
}

// GetCustomDiscount returns 0 because custom-amount discounts are disabled.
func (p *PaymentSetting) GetCustomDiscount() float64 {
	return 0
}
