package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

type PaymentSetting struct {
	AmountOptions  []int           `json:"amount_options"`
	AmountDiscount map[int]float64 `json:"amount_discount"`
	AmountGift     map[int]int64   `json:"amount_gift"`
	CustomDiscount float64         `json:"custom_discount"` // 自定义数量折扣 (0=不启用, 0~1=折扣率)
}

var paymentSetting = PaymentSetting{
	AmountOptions:  []int{10, 20, 50, 100, 200, 500},
	AmountDiscount: map[int]float64{},
	AmountGift:     map[int]int64{},
	CustomDiscount: 0,
}

func init() {
	config.GlobalConfig.Register("payment_setting", &paymentSetting)
}

func GetPaymentSetting() *PaymentSetting {
	return &paymentSetting
}

func (p *PaymentSetting) GetDiscount(amount int64) float64 {
	if p == nil {
		return 1
	}
	// Preset-amount discount takes priority
	if p.AmountDiscount != nil {
		if discount, ok := p.AmountDiscount[int(amount)]; ok && discount > 0 {
			return discount
		}
	}
	// Non-preset amount: apply custom_discount if configured
	if p.CustomDiscount > 0 && p.CustomDiscount < 1 {
		return p.CustomDiscount
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

// GetCustomDiscount returns the custom-amount discount rate (0 means disabled/no discount).
func (p *PaymentSetting) GetCustomDiscount() float64 {
	if p == nil {
		return 0
	}
	// Values >= 1 mean "no discount"; only return actual discount rates (0 < v < 1)
	if p.CustomDiscount > 0 && p.CustomDiscount < 1 {
		return p.CustomDiscount
	}
	return 0
}
