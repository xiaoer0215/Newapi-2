package ipcheck

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
)

// IPCheckResult 表示 IP 检测结果
type IPCheckResult struct {
	IsProxy       bool   // VPN / 代理
	IsDatacenter  bool   // 数据中心 / 云服务器 / 机场出口
	IsResidential bool   // 住宅代理
	Provider      string // 使用的检测服务商
}

var ipCheckClient = &http.Client{
	Timeout: 5 * time.Second,
}

// CheckIP 调用配置的 IP 情报服务检测 IP 类型
// provider: "ip-api" | "ipinfo" | ""（空表示不检测）
func CheckIP(ip, provider, ipApiKey, ipInfoToken string) (*IPCheckResult, error) {
	if ip == "" {
		return nil, nil
	}
	// 过滤私有/本地地址，不检测
	if isPrivateIP(ip) {
		return nil, nil
	}

	switch provider {
	case "ip-api":
		return checkIPViaIPAPI(ip, ipApiKey)
	case "ipinfo":
		return checkIPViaIPInfo(ip, ipInfoToken)
	default:
		return nil, nil
	}
}

// checkIPViaIPAPI 使用 ip-api.com 检测
// 免费版：45次/分钟，仅 HTTP，无需 Key
// Pro版：需要 Key，支持 HTTPS，速率更高
// 文档：https://ip-api.com/docs/api:json
func checkIPViaIPAPI(ip, apiKey string) (*IPCheckResult, error) {
	fields := "proxy,hosting"
	var url string
	if apiKey != "" {
		url = fmt.Sprintf("https://pro.ip-api.com/json/%s?fields=%s&key=%s", ip, fields, apiKey)
	} else {
		url = fmt.Sprintf("http://ip-api.com/json/%s?fields=%s", ip, fields)
	}

	resp, err := ipCheckClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("ip-api.com 请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ip-api.com 读取响应失败: %w", err)
	}

	var data map[string]interface{}
	if err := common.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("ip-api.com 解析响应失败: %w", err)
	}

	// ip-api.com: proxy=true 表示 VPN/代理/Tor；hosting=true 表示数据中心/托管
	isProxy := getBool(data, "proxy")
	isHosting := getBool(data, "hosting")

	return &IPCheckResult{
		IsProxy:      isProxy,
		IsDatacenter: isHosting,
		Provider:     "ip-api",
	}, nil
}

// checkIPViaIPInfo 使用 ipinfo.io 检测
// 免费版：每月5万次，需要注册获取 Token（也可不传 token，但速率更低）
// Privacy Detection 功能需要付费计划
// 文档：https://ipinfo.io/developers
func checkIPViaIPInfo(ip, token string) (*IPCheckResult, error) {
	var url string
	if token != "" {
		url = fmt.Sprintf("https://ipinfo.io/%s/privacy?token=%s", ip, token)
	} else {
		url = fmt.Sprintf("https://ipinfo.io/%s/privacy", ip)
	}

	resp, err := ipCheckClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("ipinfo.io 请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 403 || resp.StatusCode == 401 {
		// Privacy API 需要付费计划，降级：尝试 /json 端点
		return checkIPViaIPInfoJSON(ip, token)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ipinfo.io 读取响应失败: %w", err)
	}

	var data map[string]interface{}
	if err := common.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("ipinfo.io 解析响应失败: %w", err)
	}

	// Privacy API 返回字段：vpn, proxy, tor, relay, hosting, service
	isVPN := getBool(data, "vpn")
	isProxy := getBool(data, "proxy")
	isTor := getBool(data, "tor")
	isHosting := getBool(data, "hosting")

	return &IPCheckResult{
		IsProxy:      isVPN || isProxy || isTor,
		IsDatacenter: isHosting,
		Provider:     "ipinfo",
	}, nil
}

// checkIPViaIPInfoJSON 使用 ipinfo.io 的基础 JSON 端点（免费）
// 基础端点没有 privacy 字段，只有 org 字段可以做简单判断
func checkIPViaIPInfoJSON(ip, token string) (*IPCheckResult, error) {
	var url string
	if token != "" {
		url = fmt.Sprintf("https://ipinfo.io/%s?token=%s", ip, token)
	} else {
		url = fmt.Sprintf("https://ipinfo.io/%s", ip)
	}

	resp, err := ipCheckClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("ipinfo.io JSON 请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ipinfo.io JSON 读取响应失败: %w", err)
	}

	var data map[string]interface{}
	if err := common.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("ipinfo.io JSON 解析响应失败: %w", err)
	}

	// 通过 org 字段做粗略判断（云服务商 ASN）
	org := getString(data, "org")
	isDatacenter := isDatacenterOrg(org)

	return &IPCheckResult{
		IsDatacenter: isDatacenter,
		Provider:     "ipinfo-basic",
	}, nil
}

// isDatacenterOrg 通过 org 字段粗略判断是否为数据中心
func isDatacenterOrg(org string) bool {
	if org == "" {
		return false
	}
	org = strings.ToLower(org)
	datacenterKeywords := []string{
		"amazon", "aws", "google", "microsoft", "azure", "alibaba", "tencent",
		"digitalocean", "linode", "vultr", "ovh", "hetzner", "contabo",
		"cloudflare", "fastly", "akamai", "leaseweb", "choopa", "quadranet",
		"serverius", "psychz", "datacamp", "m247", "nexeon", "tzulo",
	}
	for _, kw := range datacenterKeywords {
		if strings.Contains(org, kw) {
			return true
		}
	}
	return false
}

// isPrivateIP 判断是否为私有/本地 IP（不需要检测）
func isPrivateIP(ip string) bool {
	privateRanges := []string{
		"127.", "10.", "192.168.", "::1", "fc", "fd",
	}
	// 172.16.0.0/12
	if strings.HasPrefix(ip, "172.") {
		parts := strings.Split(ip, ".")
		if len(parts) >= 2 {
			second := parts[1]
			for i := 16; i <= 31; i++ {
				if second == fmt.Sprintf("%d", i) {
					return true
				}
			}
		}
	}
	for _, prefix := range privateRanges {
		if strings.HasPrefix(ip, prefix) {
			return true
		}
	}
	return false
}

func getBool(m map[string]interface{}, key string) bool {
	v, ok := m[key]
	if !ok {
		return false
	}
	b, ok := v.(bool)
	return ok && b
}

func getString(m map[string]interface{}, key string) string {
	v, ok := m[key]
	if !ok {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		return ""
	}
	return s
}
