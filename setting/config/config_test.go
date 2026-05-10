package config

import "testing"

type testPaymentConfig struct {
	AmountDiscount map[int]float64 `json:"amount_discount"`
}

func TestUpdateConfigFromMapReplacesMapFields(t *testing.T) {
	cfg := &testPaymentConfig{
		AmountDiscount: map[int]float64{
			10: 0.6,
		},
	}

	if err := UpdateConfigFromMap(cfg, map[string]string{
		"amount_discount": "{}",
	}); err != nil {
		t.Fatalf("UpdateConfigFromMap returned error: %v", err)
	}

	if len(cfg.AmountDiscount) != 0 {
		t.Fatalf("expected map to be cleared, got %#v", cfg.AmountDiscount)
	}

	if err := UpdateConfigFromMap(cfg, map[string]string{
		"amount_discount": "{\"20\":0.8}",
	}); err != nil {
		t.Fatalf("UpdateConfigFromMap returned error: %v", err)
	}

	if len(cfg.AmountDiscount) != 1 || cfg.AmountDiscount[20] != 0.8 {
		t.Fatalf("expected map to be replaced with new values, got %#v", cfg.AmountDiscount)
	}
}
