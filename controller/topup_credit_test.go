package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestAdjustTopupStoredCredit(t *testing.T) {
	original := common.TopupGroupCreditRatio2JSONString()
	t.Cleanup(func() {
		_ = common.UpdateTopupGroupCreditRatioByJSONString(original)
	})

	if err := common.UpdateTopupGroupCreditRatioByJSONString(`{"default":1,"lite":0.1}`); err != nil {
		t.Fatalf("failed to set topup group credit ratio: %v", err)
	}

	gift, credited := adjustTopupStoredCredit(10, 190, "lite")
	if gift != 10 || credited != 20 {
		t.Fatalf("expected gift=10 credited=20, got gift=%d credited=%d", gift, credited)
	}

	gift, credited = adjustTopupStoredCredit(10, 0, "lite")
	if gift != 0 || credited != 10 {
		t.Fatalf("expected unchanged no-gift topup, got gift=%d credited=%d", gift, credited)
	}
}
