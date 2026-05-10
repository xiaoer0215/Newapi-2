package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

func Cache() func(c *gin.Context) {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		isStaticAsset := strings.HasPrefix(path, "/assets/") ||
			strings.HasSuffix(path, ".js") ||
			strings.HasSuffix(path, ".css") ||
			strings.HasSuffix(path, ".png") ||
			strings.HasSuffix(path, ".jpg") ||
			strings.HasSuffix(path, ".jpeg") ||
			strings.HasSuffix(path, ".svg") ||
			strings.HasSuffix(path, ".ico") ||
			strings.HasSuffix(path, ".woff") ||
			strings.HasSuffix(path, ".woff2") ||
			strings.HasSuffix(path, ".ttf")
		if !isStaticAsset {
			c.Header("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
		} else {
			c.Header("Cache-Control", "max-age=604800") // one week
		}
		c.Header("Cache-Version", "20260504-0135-register-cn-green-buckets")
		c.Next()
	}
}
