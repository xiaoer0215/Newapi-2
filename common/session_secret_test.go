package common

import (
	"path/filepath"
	"testing"
)

func TestLoadOrInitLocalSessionSecretCreatesAndReusesFile(t *testing.T) {
	secretPath := filepath.Join(t.TempDir(), ".session_secret")

	first, err := loadOrInitLocalSessionSecret(secretPath, "secret-one")
	if err != nil {
		t.Fatalf("first init failed: %v", err)
	}
	if first != "secret-one" {
		t.Fatalf("expected first secret to be reused, got %q", first)
	}

	second, err := loadOrInitLocalSessionSecret(secretPath, "secret-two")
	if err != nil {
		t.Fatalf("second init failed: %v", err)
	}
	if second != "secret-one" {
		t.Fatalf("expected persisted secret to win, got %q", second)
	}
}

func TestLoadOrInitLocalSessionSecretRejectsEmptyFallback(t *testing.T) {
	secretPath := filepath.Join(t.TempDir(), ".session_secret")
	if _, err := loadOrInitLocalSessionSecret(secretPath, ""); err == nil {
		t.Fatal("expected empty fallback to fail")
	}
}
