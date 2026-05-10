package ratio_setting

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestGetAllGroupNamesMergesTopupGroups(t *testing.T) {
	originalGroupRatio := GroupRatio2JSONString()
	originalTopupRatio := common.TopupGroupRatio2JSONString()
	originalTopupCreditRatio := common.TopupGroupCreditRatio2JSONString()

	t.Cleanup(func() {
		_ = UpdateGroupRatioByJSONString(originalGroupRatio)
		_ = common.UpdateTopupGroupRatioByJSONString(originalTopupRatio)
		_ = common.UpdateTopupGroupCreditRatioByJSONString(originalTopupCreditRatio)
	})

	if err := UpdateGroupRatioByJSONString(`{"default":1,"vip":1}`); err != nil {
		t.Fatalf("update group ratio failed: %v", err)
	}
	if err := common.UpdateTopupGroupRatioByJSONString(`{"default":1,"wallet_only":0.5}`); err != nil {
		t.Fatalf("update topup group ratio failed: %v", err)
	}
	if err := common.UpdateTopupGroupCreditRatioByJSONString(`{"default":1,"credit_only":0.2}`); err != nil {
		t.Fatalf("update topup group credit ratio failed: %v", err)
	}

	allGroups := GetAllGroupNames()
	if len(allGroups) < 4 {
		t.Fatalf("expected merged groups, got %v", allGroups)
	}
	if !ContainsGroup("default") {
		t.Fatalf("expected default group in %v", allGroups)
	}
	if !ContainsGroup("wallet_only") {
		t.Fatalf("expected topup-only group in %v", allGroups)
	}
	if !ContainsGroup("credit_only") {
		t.Fatalf("expected credit-only group in %v", allGroups)
	}
}
