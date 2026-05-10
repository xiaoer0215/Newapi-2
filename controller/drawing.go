package controller

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

type drawingCDNUploadRequest struct {
	Image    string `json:"image"`
	Filename string `json:"filename"`
}

func GetDrawingGroupModels(c *gin.Context) {
	group := strings.TrimSpace(c.Query("group"))
	if group == "" {
		common.ApiSuccess(c, []string{})
		return
	}
	common.ApiSuccess(c, service.GetAllModelsByGroup(group))
}

func GetUserDrawingInit(c *gin.Context) {
	userId := c.GetInt("id")
	token, config, err := service.EnsureUserDrawingToken(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	requestModes := service.GetDrawingModelRequestModes(config.Models)

	if !config.Enabled {
		common.ApiSuccess(c, gin.H{
			"enabled":              false,
			"group":                "",
			"models":               []string{},
			"default_model":        "",
			"default_request_mode": "",
			"model_request_modes":  map[string]string{},
			"token_name":           "",
			"token_key":            "",
			"authorization":        "",
			"endpoint":             "/v1/images/generations",
			"responses_endpoint":   "/v1/responses",
			"edit_endpoint":        "/v1/images/edits",
		})
		return
	}

	common.ApiSuccess(c, gin.H{
		"enabled":              true,
		"group":                config.Group,
		"models":               config.Models,
		"default_model":        config.DefaultModel,
		"default_request_mode": requestModes[config.DefaultModel],
		"model_request_modes":  requestModes,
		"token_name":           token.Name,
		"token_key":            token.GetFullKey(),
		"authorization":        "Bearer sk-" + token.GetFullKey(),
		"endpoint":             "/v1/images/generations",
		"responses_endpoint":   "/v1/responses",
		"edit_endpoint":        "/v1/images/edits",
	})
}

func UploadUserDrawingImage(c *gin.Context) {
	var req drawingCDNUploadRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiError(c, err)
		return
	}
	result, err := service.UploadDrawingImageToConfiguredCDN(c.Request.Context(), req.Image, req.Filename)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"url":        result.URL,
		"provider":   result.Provider,
		"elapsed_ms": result.Elapsed,
	})
}

func ResolveUserDrawingImage(c *gin.Context) {
	var req drawingCDNUploadRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiError(c, err)
		return
	}
	base64Data, mimeType, size, err := service.ResolveDrawingImageAsBase64(c.Request.Context(), req.Image)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"base64":    base64Data,
		"mimeType":  mimeType,
		"mime_type": mimeType,
		"data_url":  "data:" + mimeType + ";base64," + base64Data,
		"size":      size,
	})
}
