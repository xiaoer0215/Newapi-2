package controller

import (
	"math"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

func TestPresetTopupPricingIgnoresGroupRatio(t *testing.T) {
	originalPaymentSetting := *operation_setting.GetPaymentSetting()
	originalTopupRatio := common.TopupGroupRatio2JSONString()
	originalPrice := operation_setting.Price
	originalStripeUnitPrice := setting.StripeUnitPrice
	originalWaffoUnitPrice := setting.WaffoUnitPrice

	t.Cleanup(func() {
		*operation_setting.GetPaymentSetting() = originalPaymentSetting
		_ = common.UpdateTopupGroupRatioByJSONString(originalTopupRatio)
		operation_setting.Price = originalPrice
		setting.StripeUnitPrice = originalStripeUnitPrice
		setting.WaffoUnitPrice = originalWaffoUnitPrice
	})

	operation_setting.Price = 1
	setting.StripeUnitPrice = 1
	setting.WaffoUnitPrice = 1
	if err := common.UpdateTopupGroupRatioByJSONString(`{"default":1,"svip":0.05}`); err != nil {
		t.Fatalf("update topup group ratio failed: %v", err)
	}

	*operation_setting.GetPaymentSetting() = operation_setting.PaymentSetting{
		AmountOptions:        []int{10},
		AmountDiscount:       map[int]float64{10: 0.6},
		AmountGift:           map[int]int64{},
		CustomDiscount:       0.2,
		GroupAmountOverrides: map[string]map[int]operation_setting.GroupAmountOverride{},
	}

	assertFloatEqual(t, getPayMoney(10, "svip"), 6)
	assertFloatEqual(t, getStripePayMoney(10, "svip"), 6)
	assertFloatEqual(t, getWaffoPayMoney(10, "svip"), 6)
	assertFloatEqual(t, getPayMoney(11, "svip"), 0.55)
}

func TestGroupSpecificPresetPriceOverridesRatio(t *testing.T) {
	originalPaymentSetting := *operation_setting.GetPaymentSetting()
	originalTopupRatio := common.TopupGroupRatio2JSONString()
	originalPrice := operation_setting.Price

	t.Cleanup(func() {
		*operation_setting.GetPaymentSetting() = originalPaymentSetting
		_ = common.UpdateTopupGroupRatioByJSONString(originalTopupRatio)
		operation_setting.Price = originalPrice
	})

	operation_setting.Price = 1
	if err := common.UpdateTopupGroupRatioByJSONString(`{"default":1,"svip":0.05}`); err != nil {
		t.Fatalf("update topup group ratio failed: %v", err)
	}

	overridePrice := 4.0
	*operation_setting.GetPaymentSetting() = operation_setting.PaymentSetting{
		AmountOptions:  []int{10},
		AmountDiscount: map[int]float64{10: 0.6},
		AmountGift:     map[int]int64{},
		GroupAmountOverrides: map[string]map[int]operation_setting.GroupAmountOverride{
			"svip": {
				10: {DiscountedPrice: &overridePrice},
			},
		},
	}

	assertFloatEqual(t, getPayMoney(10, "svip"), 4)
}

func TestGroupSpecificPresetAmountOverrideChangesDisplayedAndChargedAmount(t *testing.T) {
	originalPaymentSetting := *operation_setting.GetPaymentSetting()
	originalTopupRatio := common.TopupGroupRatio2JSONString()
	originalPrice := operation_setting.Price
	originalStripeUnitPrice := setting.StripeUnitPrice
	originalWaffoUnitPrice := setting.WaffoUnitPrice

	t.Cleanup(func() {
		*operation_setting.GetPaymentSetting() = originalPaymentSetting
		_ = common.UpdateTopupGroupRatioByJSONString(originalTopupRatio)
		operation_setting.Price = originalPrice
		setting.StripeUnitPrice = originalStripeUnitPrice
		setting.WaffoUnitPrice = originalWaffoUnitPrice
	})

	operation_setting.Price = 1
	setting.StripeUnitPrice = 1
	setting.WaffoUnitPrice = 1
	if err := common.UpdateTopupGroupRatioByJSONString(`{"default":1,"svip":0.05}`); err != nil {
		t.Fatalf("update topup group ratio failed: %v", err)
	}

	overridePrice := 10.0
	overrideGift := int64(3)
	overrideAmount := int64(20)
	*operation_setting.GetPaymentSetting() = operation_setting.PaymentSetting{
		AmountOptions:  []int{100},
		AmountDiscount: map[int]float64{100: 0.5},
		AmountGift:     map[int]int64{100: 8},
		GroupAmountOverrides: map[string]map[int]operation_setting.GroupAmountOverride{
			"svip": {
				100: {
					DiscountedPrice: &overridePrice,
					Gift:            &overrideGift,
					Amount:          &overrideAmount,
				},
			},
		},
	}

	if got := operation_setting.GetPaymentSetting().GetAmountForGroup(100, "svip"); got != 20 {
		t.Fatalf("expected effective amount 20, got %d", got)
	}
	assertFloatEqual(t, getPayMoney(20, "svip"), 10)
	assertFloatEqual(t, getStripePayMoney(20, "svip"), 10)
	assertFloatEqual(t, getWaffoPayMoney(20, "svip"), 10)
	if gotGift := operation_setting.GetPaymentSetting().GetGiftForGroup(20, "svip"); gotGift != 3 {
		t.Fatalf("expected effective gift 3, got %d", gotGift)
	}
}

func TestGroupSpecificPresetAmountOverrideWinsOnEffectiveAmountCollision(t *testing.T) {
	originalPaymentSetting := *operation_setting.GetPaymentSetting()
	originalTopupRatio := common.TopupGroupRatio2JSONString()
	originalPrice := operation_setting.Price

	t.Cleanup(func() {
		*operation_setting.GetPaymentSetting() = originalPaymentSetting
		_ = common.UpdateTopupGroupRatioByJSONString(originalTopupRatio)
		operation_setting.Price = originalPrice
	})

	operation_setting.Price = 1
	if err := common.UpdateTopupGroupRatioByJSONString(`{"default":1,"svip":0.05}`); err != nil {
		t.Fatalf("update topup group ratio failed: %v", err)
	}

	defaultTwentyPrice := 18.0
	overrideHundredPrice := 10.0
	overrideAmount := int64(20)
	*operation_setting.GetPaymentSetting() = operation_setting.PaymentSetting{
		AmountOptions: []int{20, 100},
		AmountDiscount: map[int]float64{
			20:  0.9,
			100: 0.5,
		},
		AmountGift: map[int]int64{},
		GroupAmountOverrides: map[string]map[int]operation_setting.GroupAmountOverride{
			"svip": {
				20: {
					DiscountedPrice: &defaultTwentyPrice,
				},
				100: {
					DiscountedPrice: &overrideHundredPrice,
					Amount:          &overrideAmount,
				},
			},
		},
	}

	assertFloatEqual(t, getPayMoney(20, "svip"), 10)
}

func TestGroupMinTopupStillUsesPresetPricing(t *testing.T) {
	originalPaymentSetting := *operation_setting.GetPaymentSetting()
	originalTopupRatio := common.TopupGroupRatio2JSONString()
	originalPrice := operation_setting.Price

	t.Cleanup(func() {
		*operation_setting.GetPaymentSetting() = originalPaymentSetting
		_ = common.UpdateTopupGroupRatioByJSONString(originalTopupRatio)
		operation_setting.Price = originalPrice
	})

	operation_setting.Price = 1
	if err := common.UpdateTopupGroupRatioByJSONString(`{"default":1,"svip":0.8}`); err != nil {
		t.Fatalf("update topup group ratio failed: %v", err)
	}

	*operation_setting.GetPaymentSetting() = operation_setting.PaymentSetting{
		AmountOptions:  []int{100},
		AmountDiscount: map[int]float64{100: 0.5},
		AmountGift:     map[int]int64{},
		GroupMinTopup: map[string]int64{
			"svip": 100,
		},
	}

	assertFloatEqual(t, getPayMoney(100, "svip"), 50)
	assertFloatEqual(t, getEffectivePresetDiscountedAmount(100, "svip"), 50)
}

func TestPresetConfiguredPriceIsFinalPrice(t *testing.T) {
	originalPaymentSetting := *operation_setting.GetPaymentSetting()
	originalTopupRatio := common.TopupGroupRatio2JSONString()
	originalPrice := operation_setting.Price

	t.Cleanup(func() {
		*operation_setting.GetPaymentSetting() = originalPaymentSetting
		_ = common.UpdateTopupGroupRatioByJSONString(originalTopupRatio)
		operation_setting.Price = originalPrice
	})

	operation_setting.Price = 0.5
	if err := common.UpdateTopupGroupRatioByJSONString(`{"default":0.05,"svip":1}`); err != nil {
		t.Fatalf("update topup group ratio failed: %v", err)
	}

	*operation_setting.GetPaymentSetting() = operation_setting.PaymentSetting{
		AmountOptions:  []int{20, 50, 200},
		AmountDiscount: map[int]float64{20: 0.05, 50: 0.05, 200: 0.049},
		AmountGift:     map[int]int64{},
	}

	assertFloatEqual(t, getPayMoney(200, "default"), 9.8)
}

func TestOtherGroupOverrideShouldNotMakeCustomAmountLookLikePreset(t *testing.T) {
	originalPaymentSetting := *operation_setting.GetPaymentSetting()
	originalTopupRatio := common.TopupGroupRatio2JSONString()
	originalPrice := operation_setting.Price

	t.Cleanup(func() {
		*operation_setting.GetPaymentSetting() = originalPaymentSetting
		_ = common.UpdateTopupGroupRatioByJSONString(originalTopupRatio)
		operation_setting.Price = originalPrice
	})

	operation_setting.Price = 1
	if err := common.UpdateTopupGroupRatioByJSONString(`{"default":0.05,"svip":1}`); err != nil {
		t.Fatalf("update topup group ratio failed: %v", err)
	}

	*operation_setting.GetPaymentSetting() = operation_setting.PaymentSetting{
		AmountOptions:  []int{20, 50, 200},
		AmountDiscount: map[int]float64{20: 0.05, 50: 0.5, 200: 0.049},
		AmountGift:     map[int]int64{},
		GroupAmountOverrides: map[string]map[int]operation_setting.GroupAmountOverride{
			"svip": {
				20: {
					DiscountedPrice: common.GetPointer(2.0),
					Amount:          common.GetPointer(int64(100)),
				},
			},
		},
		GroupMinTopup: map[string]int64{
			"default": 100,
		},
	}

	assertFloatEqual(t, getPayMoney(100, "default"), 5)
}

func assertFloatEqual(t *testing.T, got float64, want float64) {
	t.Helper()
	if math.Abs(got-want) > 0.000001 {
		t.Fatalf("unexpected value: got %.6f want %.6f", got, want)
	}
}
