package service

import (
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
)

func TestGetCallbackAddressPrefersLocalRequestHost(t *testing.T) {
	originalAllowed := operation_setting.AllowedCallbackDomains
	originalCustom := operation_setting.CustomCallbackAddress
	originalServer := system_setting.ServerAddress
	t.Cleanup(func() {
		operation_setting.AllowedCallbackDomains = originalAllowed
		operation_setting.CustomCallbackAddress = originalCustom
		system_setting.ServerAddress = originalServer
	})

	operation_setting.AllowedCallbackDomains = ""
	operation_setting.CustomCallbackAddress = ""
	system_setting.ServerAddress = "http://127.0.0.1:3000"

	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest("GET", "http://localhost:3000/api/subscription/epay/pay", nil)
	req.Host = "localhost:3000"
	c.Request = req

	callbackAddress := GetCallbackAddress(c)
	if callbackAddress != "http://localhost:3000" {
		t.Fatalf("expected localhost callback address, got %s", callbackAddress)
	}
}

func TestGetCallbackAddressFallsBackToServerAddressForUnknownPublicHost(t *testing.T) {
	originalAllowed := operation_setting.AllowedCallbackDomains
	originalCustom := operation_setting.CustomCallbackAddress
	originalServer := system_setting.ServerAddress
	t.Cleanup(func() {
		operation_setting.AllowedCallbackDomains = originalAllowed
		operation_setting.CustomCallbackAddress = originalCustom
		system_setting.ServerAddress = originalServer
	})

	operation_setting.AllowedCallbackDomains = ""
	operation_setting.CustomCallbackAddress = ""
	system_setting.ServerAddress = "https://panel.example.com"

	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest("GET", "https://evil.example.net/api/subscription/epay/pay", nil)
	req.Host = "evil.example.net"
	c.Request = req

	callbackAddress := GetCallbackAddress(c)
	if callbackAddress != "https://panel.example.com" {
		t.Fatalf("expected server address fallback, got %s", callbackAddress)
	}
}
