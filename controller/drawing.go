package controller

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func GetDrawingGroupModels(c *gin.Context) {
	group := strings.TrimSpace(c.Query("group"))
	if group == "" {
		common.ApiSuccess(c, []string{})
		return
	}
	common.ApiSuccess(c, service.GetDrawingModelsByGroup(group))
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
		"edit_endpoint":        "/v1/images/edits",
	})
}
