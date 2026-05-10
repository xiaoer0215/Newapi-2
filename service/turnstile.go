package service

import (
	"errors"
	"net/http"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type turnstileVerifyResponse struct {
	Success bool `json:"success"`
}

func IsTurnstileConfigured() bool {
	return strings.TrimSpace(common.TurnstileSiteKey) != "" && strings.TrimSpace(common.TurnstileSecretKey) != ""
}

func VerifyTurnstileToken(token, clientIP string) error {
	if strings.TrimSpace(token) == "" {
		return errors.New("需要 Turnstile 验证，请完成人机校验后再继续")
	}

	rawRes, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", url.Values{
		"secret":   {common.TurnstileSecretKey},
		"response": {token},
		"remoteip": {clientIP},
	})
	if err != nil {
		common.SysLog("turnstile verify error: " + err.Error())
		return errors.New("Turnstile 校验请求失败，请重试")
	}
	defer rawRes.Body.Close()

	var res turnstileVerifyResponse
	if err = common.DecodeJson(rawRes.Body, &res); err != nil {
		return errors.New("Turnstile 响应解析失败，请重试")
	}
	if !res.Success {
		return errors.New("Turnstile 校验失败，请刷新重试！")
	}
	return nil
}
