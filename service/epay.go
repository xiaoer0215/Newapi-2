package service

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

// isAllowedCallbackHost checks whether the given host is in the whitelist.
// The whitelist is a comma-separated list of exact hosts or wildcard patterns
// like *.example.com.
func isAllowedCallbackHost(host, whitelist string) bool {
	if whitelist == "" {
		return false
	}
	// Strip port if present
	if idx := strings.LastIndex(host, ":"); idx != -1 {
		host = host[:idx]
	}
	for _, entry := range strings.Split(whitelist, ",") {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		if strings.HasPrefix(entry, "*.") {
			// wildcard: *.example.com matches sub.example.com
			suffix := entry[1:] // .example.com
			if strings.HasSuffix(host, suffix) {
				return true
			}
		} else {
			if host == entry {
				return true
			}
		}
	}
	return false
}

// GetCallbackAddress returns the base URL to use for payment callbacks.
// Priority:
//  1. If AllowedCallbackDomains is configured and the request Host matches,
//     use scheme+host from the request.
//  2. If CustomCallbackAddress is set, use it.
//  3. Fall back to ServerAddress.
func GetCallbackAddress(c *gin.Context) string {
	if c != nil && operation_setting.AllowedCallbackDomains != "" {
		host := c.Request.Host
		if isAllowedCallbackHost(host, operation_setting.AllowedCallbackDomains) {
			scheme := "https"
			if c.Request.TLS == nil {
				// Check X-Forwarded-Proto set by reverse proxy
				if proto := c.GetHeader("X-Forwarded-Proto"); proto != "" {
					scheme = proto
				} else {
					scheme = "http"
				}
			}
			return scheme + "://" + host
		}
	}
	if operation_setting.CustomCallbackAddress != "" {
		return operation_setting.CustomCallbackAddress
	}
	return system_setting.ServerAddress
}
