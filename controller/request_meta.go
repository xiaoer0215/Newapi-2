package controller

import (
	"net"
	"strings"

	"github.com/gin-gonic/gin"
)

const deviceFingerprintHeader = "X-NewAPI-Device-Fingerprint"

func getRequestDeviceFingerprint(c *gin.Context) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(c.GetHeader(deviceFingerprintHeader))
}

func getRequestClientIP(c *gin.Context) string {
	if c == nil {
		return ""
	}

	originalIP := strings.TrimSpace(c.ClientIP())
	if isUsablePublicIP(originalIP) {
		return originalIP
	}

	candidates := []string{
		c.GetHeader("CF-Connecting-IP"),
		c.GetHeader("True-Client-IP"),
		c.GetHeader("X-Forwarded-For"),
		c.GetHeader("X-Real-IP"),
	}

	var fallback string
	for _, candidate := range candidates {
		for _, ip := range splitIPHeader(candidate) {
			if isUsablePublicIP(ip) {
				return ip
			}
			if fallback == "" && isValidIP(ip) {
				fallback = ip
			}
		}
	}

	if fallback != "" {
		return fallback
	}
	return originalIP
}

func splitIPHeader(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}

func isValidIP(raw string) bool {
	return net.ParseIP(strings.TrimSpace(raw)) != nil
}

func isUsablePublicIP(raw string) bool {
	ip := net.ParseIP(strings.TrimSpace(raw))
	if ip == nil {
		return false
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() || ip.IsMulticast() {
		return false
	}
	return true
}
