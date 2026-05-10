package router

import (
	"bytes"
	"embed"
	"html"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

func currentSEOIndexPage(indexPage []byte) []byte {
	page := indexPage
	if strings.TrimSpace(common.GetSystemTitle()) != "" {
		page = replaceHTMLTagContent(page, "title", common.GetSystemTitle())
	}
	description := strings.TrimSpace(common.SEODescription)
	if description != "" {
		page = replaceMetaContent(page, "description", description)
	}
	logo := strings.TrimSpace(common.Logo)
	if logo != "" {
		page = replaceLinkHref(page, "icon", logo)
	}
	return page
}

func replaceHTMLTagContent(page []byte, tag string, value string) []byte {
	lower := bytes.ToLower(page)
	openTag := []byte("<" + tag + ">")
	closeTag := []byte("</" + tag + ">")
	start := bytes.Index(lower, openTag)
	if start < 0 {
		return page
	}
	contentStart := start + len(openTag)
	end := bytes.Index(lower[contentStart:], closeTag)
	if end < 0 {
		return page
	}
	contentEnd := contentStart + end
	escaped := []byte(html.EscapeString(value))
	out := make([]byte, 0, len(page)-contentEnd+contentStart+len(escaped))
	out = append(out, page[:contentStart]...)
	out = append(out, escaped...)
	out = append(out, page[contentEnd:]...)
	return out
}

func replaceMetaContent(page []byte, name string, value string) []byte {
	searchFrom := 0
	escaped := []byte(html.EscapeString(value))
	matchedDoubleQuoteName := []byte(`name="` + strings.ToLower(name) + `"`)
	matchedSingleQuoteName := []byte(`name='` + strings.ToLower(name) + `'`)
	for {
		lower := bytes.ToLower(page)
		idx := bytes.Index(lower[searchFrom:], []byte("<meta"))
		if idx < 0 {
			return page
		}
		start := searchFrom + idx
		endRel := bytes.Index(lower[start:], []byte(">"))
		if endRel < 0 {
			return page
		}
		end := start + endRel + 1
		tagLower := lower[start:end]
		if bytes.Contains(tagLower, matchedDoubleQuoteName) || bytes.Contains(tagLower, matchedSingleQuoteName) {
			contentIdx := bytes.Index(tagLower, []byte("content="))
			if contentIdx < 0 {
				searchFrom = end
				continue
			}
			attrStart := start + contentIdx + len("content=")
			if attrStart >= len(page) {
				searchFrom = end
				continue
			}
			quote := page[attrStart]
			if quote != '\'' && quote != '"' {
				searchFrom = end
				continue
			}
			valueStart := attrStart + 1
			valueEndRel := bytes.IndexByte(page[valueStart:end], quote)
			if valueEndRel < 0 {
				searchFrom = end
				continue
			}
			valueEnd := valueStart + valueEndRel
			out := make([]byte, 0, len(page)-valueEnd+valueStart+len(escaped))
			out = append(out, page[:valueStart]...)
			out = append(out, escaped...)
			out = append(out, page[valueEnd:]...)
			page = out
			searchFrom = valueStart + len(escaped)
			continue
		}
		searchFrom = end
	}
}

func replaceLinkHref(page []byte, rel string, value string) []byte {
	lower := bytes.ToLower(page)
	searchFrom := 0
	escaped := []byte(html.EscapeString(value))
	for {
		idx := bytes.Index(lower[searchFrom:], []byte("<link"))
		if idx < 0 {
			return page
		}
		start := searchFrom + idx
		endRel := bytes.Index(lower[start:], []byte(">"))
		if endRel < 0 {
			return page
		}
		end := start + endRel + 1
		tagLower := lower[start:end]
		if bytes.Contains(tagLower, []byte(`rel="`+strings.ToLower(rel)+`"`)) || bytes.Contains(tagLower, []byte(`rel='`+strings.ToLower(rel)+`'`)) {
			hrefIdx := bytes.Index(tagLower, []byte("href="))
			if hrefIdx < 0 {
				return page
			}
			attrStart := start + hrefIdx + len("href=")
			if attrStart >= len(page) {
				return page
			}
			quote := page[attrStart]
			if quote != '\'' && quote != '"' {
				return page
			}
			valueStart := attrStart + 1
			valueEndRel := bytes.IndexByte(page[valueStart:end], quote)
			if valueEndRel < 0 {
				return page
			}
			valueEnd := valueStart + valueEndRel
			out := make([]byte, 0, len(page)-valueEnd+valueStart+len(escaped))
			out = append(out, page[:valueStart]...)
			out = append(out, escaped...)
			out = append(out, page[valueEnd:]...)
			return out
		}
		searchFrom = end
	}
}

func SetWebRouter(router *gin.Engine, buildFS embed.FS, indexPage []byte) {
	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(middleware.GlobalWebRateLimit())
	router.Use(middleware.Cache())
	router.Use(static.Serve("/", common.EmbedFolder(buildFS, "web/dist")))
	router.NoRoute(func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		if strings.HasPrefix(c.Request.RequestURI, "/v1") || strings.HasPrefix(c.Request.RequestURI, "/api") || strings.HasPrefix(c.Request.RequestURI, "/assets") {
			controller.RelayNotFound(c)
			return
		}
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", currentSEOIndexPage(indexPage))
	})
}
