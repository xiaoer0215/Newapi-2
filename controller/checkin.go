package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

type turnstileResp struct {
	Success bool `json:"success"`
}

// verifyCheckinTurnstile validates a Turnstile token against Cloudflare.
// Returns "" on success, or an error message string on failure.
func verifyCheckinTurnstile(token, clientIP string) string {
	rawRes, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", url.Values{
		"secret":   {common.TurnstileSecretKey},
		"response": {token},
		"remoteip": {clientIP},
	})
	if err != nil {
		common.SysLog("checkin turnstile verify error: " + err.Error())
		return "Turnstile 校验请求失败，请重试"
	}
	defer rawRes.Body.Close()
	var res turnstileResp
	if err = json.NewDecoder(rawRes.Body).Decode(&res); err != nil {
		return "Turnstile 响应解析失败，请重试"
	}
	if !res.Success {
		return "Turnstile 校验失败，请刷新重试！"
	}
	return ""
}

// GetCheckinStatus 获取用户签到状态和历史记录
func GetCheckinStatus(c *gin.Context) {
	setting := operation_setting.GetCheckinSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "签到功能未启用")
		return
	}
	userId := c.GetInt("id")
	// 获取月份参数，默认为当前月份
	month := c.DefaultQuery("month", time.Now().Format("2006-01"))

	stats, err := model.GetUserCheckinStats(userId, month)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// 签到时是否需要 Turnstile：开关开启且已配置 site key
	turnstileRequired := setting.TurnstileEnabled && common.TurnstileSiteKey != ""

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"enabled":            setting.Enabled,
			"min_quota":          setting.MinQuota,
			"max_quota":          setting.MaxQuota,
			"turnstile_required": turnstileRequired,
			"stats":              stats,
		},
	})
}

// DoCheckin 执行用户签到
func DoCheckin(c *gin.Context) {
	setting := operation_setting.GetCheckinSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "签到功能未启用")
		return
	}

	// 签到 Turnstile 校验：仅在开关开启且已配置 site key 时强制验证
	if setting.TurnstileEnabled && common.TurnstileSiteKey != "" {
		token := c.Query("turnstile")
		if token == "" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "需要 Turnstile 验证，请完成人机校验后再签到",
			})
			return
		}
		if errMsg := verifyCheckinTurnstile(token, c.ClientIP()); errMsg != "" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": errMsg,
			})
			return
		}
	}

	userId := c.GetInt("id")
	clientIP := c.ClientIP()

	checkin, err := model.UserCheckin(userId, clientIP)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("用户签到，获得额度 %s", logger.LogQuota(checkin.QuotaAwarded)))
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "签到成功",
		"data": gin.H{
			"quota_awarded": checkin.QuotaAwarded,
			"checkin_date":  checkin.CheckinDate},
	})
}
