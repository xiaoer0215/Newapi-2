package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	operation_setting "github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// validWindow validates and normalises the window query parameter.
func validWindow(raw string) string {
	switch raw {
	case "1h", "6h", "12h", "24h":
		return raw
	default:
		return "24h"
	}
}

// GetGroupMonitorStatus returns cached group stats.
// Requires UserAuth; non-admin users only see results when public_visible is true.
// If the cache is older than the configured refresh interval, it triggers a
// synchronous refresh so the caller always gets up-to-date data.
func GetGroupMonitorStatus(c *gin.Context) {
	setting := operation_setting.GetGroupMonitorSetting()

	role := c.GetInt("role")
	if role < common.RoleAdminUser && !setting.PublicVisible {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "暂无权限查看分组监控",
		})
		return
	}

	window := validWindow(c.DefaultQuery("window", "24h"))

	maxAge := int64(setting.RefreshInterval)
	if maxAge < 10 {
		maxAge = 10
	}

	// Refresh group-level cache on-demand if stale
	if len(setting.EnabledGroups) > 0 {
		if model.GetGroupMonitorCacheAge(window) >= maxAge {
			_ = model.RefreshGroupMonitorStats(setting.EnabledGroups, window)
		}
	}

	stats := model.GetGroupMonitorStats(setting.EnabledGroups, window)

	// Model detail: admin always allowed; non-admin only when model_detail_visible is on
	wantModelDetail := c.DefaultQuery("model_detail", "false") == "true"
	canSeeModelDetail := role >= common.RoleAdminUser || setting.ModelDetailVisible
	var modelDetail map[string][]*model.ModelBucketStats
	if wantModelDetail && canSeeModelDetail && len(setting.EnabledGroups) > 0 {
		if model.GetModelDetailCacheAge(window) >= maxAge {
			_ = model.RefreshModelDetailStats(setting.EnabledGroups, window)
		}
		modelDetail = model.GetModelDetailStats(setting.EnabledGroups, window)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":              true,
		"message":              "",
		"data":                 stats,
		"model_detail":         modelDetail,
		"model_detail_visible": canSeeModelDetail,
		"default_window":       setting.DefaultWindow,
	})
}

// AdminGetGroupMonitorConfig returns the current group monitor setting.
func AdminGetGroupMonitorConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    operation_setting.GetGroupMonitorSetting(),
	})
}

type groupMonitorConfigRequest struct {
	EnabledGroups      []string `json:"enabled_groups"`
	RefreshInterval    int      `json:"refresh_interval"`
	PublicVisible      bool     `json:"public_visible"`
	ModelDetailVisible bool     `json:"model_detail_visible"`
	DefaultWindow      string   `json:"default_window"`
}

// AdminUpdateGroupMonitorConfig saves a new group monitor setting.
func AdminUpdateGroupMonitorConfig(c *gin.Context) {
	var req groupMonitorConfigRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	if req.RefreshInterval < 10 {
		req.RefreshInterval = 10
	}
	req.DefaultWindow = validWindow(req.DefaultWindow)

	newSetting := operation_setting.GroupMonitorSetting{
		EnabledGroups:      req.EnabledGroups,
		RefreshInterval:    req.RefreshInterval,
		PublicVisible:      req.PublicVisible,
		ModelDetailVisible: req.ModelDetailVisible,
		DefaultWindow:      req.DefaultWindow,
	}
	operation_setting.UpdateGroupMonitorSetting(newSetting)

	// Persist individual keys so we don't overwrite unrelated config
	enabledJSON, _ := common.Marshal(req.EnabledGroups)
	if err := model.UpdateOption("group_monitor_setting.enabled_groups", string(enabledJSON)); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if err := model.UpdateOption("group_monitor_setting.refresh_interval", strconv.Itoa(req.RefreshInterval)); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if err := model.UpdateOption("group_monitor_setting.public_visible", strconv.FormatBool(req.PublicVisible)); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if err := model.UpdateOption("group_monitor_setting.model_detail_visible", strconv.FormatBool(req.ModelDetailVisible)); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if err := model.UpdateOption("group_monitor_setting.default_window", req.DefaultWindow); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	// Refresh stats immediately so the caller sees data right away
	if len(req.EnabledGroups) > 0 {
		_ = model.RefreshGroupMonitorStats(req.EnabledGroups, "24h")
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "配置已保存"})
}
