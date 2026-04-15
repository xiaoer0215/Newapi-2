package controller

import (
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
