package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestGetEffectiveRedemptionQuota(t *testing.T) {
	original := common.TopupGroupCreditRatio2JSONString()
	t.Cleanup(func() {
		_ = common.UpdateTopupGroupCreditRatioByJSONString(original)
	})

	if err := common.UpdateTopupGroupCreditRatioByJSONString(`{"default":1,"svip":0.1,"vip":2}`); err != nil {
		t.Fatalf("failed to set topup group credit ratio: %v", err)
	}

	testCases := []struct {
		name      string
		baseQuota int
		userGroup string
		expected  int
	}{
		{name: "default group keeps base quota", baseQuota: 10, userGroup: "default", expected: 10},
		{name: "svip group uses reduced credit ratio", baseQuota: 10, userGroup: "svip", expected: 1},
		{name: "vip group uses increased credit ratio", baseQuota: 10, userGroup: "vip", expected: 20},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			actual := getEffectiveRedemptionQuota(tc.baseQuota, tc.userGroup)
			if actual != tc.expected {
				t.Fatalf("expected %d, got %d", tc.expected, actual)
			}
		})
	}
}
