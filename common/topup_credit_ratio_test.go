package common

import "testing"

func TestScaleQuotaByTopupGroupCreditRatio(t *testing.T) {
	original := TopupGroupCreditRatio2JSONString()
	defer func() {
		_ = UpdateTopupGroupCreditRatioByJSONString(original)
	}()

	if err := UpdateTopupGroupCreditRatioByJSONString(`{"default":1,"lite":0.1,"pro":2}`); err != nil {
		t.Fatalf("failed to set topup group credit ratio: %v", err)
	}

	testCases := []struct {
		name      string
		quota     int
		fromGroup string
		toGroup   string
		expected  int
	}{
		{name: "downgrade quota with lower credit ratio", quota: 200, fromGroup: "default", toGroup: "lite", expected: 20},
		{name: "upgrade quota with higher credit ratio", quota: 20, fromGroup: "lite", toGroup: "default", expected: 200},
		{name: "scale quota to higher multiplier", quota: 100, fromGroup: "default", toGroup: "pro", expected: 200},
		{name: "same group keeps quota", quota: 88, fromGroup: "default", toGroup: "default", expected: 88},
		{name: "non-positive quota stays zero", quota: 0, fromGroup: "default", toGroup: "lite", expected: 0},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			actual := ScaleQuotaByTopupGroupCreditRatio(tc.quota, tc.fromGroup, tc.toGroup)
			if actual != tc.expected {
				t.Fatalf("expected %d, got %d", tc.expected, actual)
			}
		})
	}
}
