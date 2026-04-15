package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

// CheckinSetting 签到功能配置
type CheckinSetting struct {
	Enabled  bool `json:"enabled"`   // 是否启用签到功能
	MinQuota int  `json:"min_quota"` // 签到最小额度奖励
	MaxQuota int  `json:"max_quota"` // 签到最大额度奖励

	// Turnstile 人机验证
	TurnstileEnabled bool `json:"turnstile_enabled"` // 签到时是否需要 Turnstile 验证

	// IP 限制相关
	IPLimitEnabled   bool `json:"ip_limit_enabled"`   // 启用IP限制（同IP每天只能签到一次，不同账号不允许重复）
	BlockVPN         bool `json:"block_vpn"`          // 屏蔽VPN/代理IP
	BlockDatacenter  bool `json:"block_datacenter"`   // 屏蔽数据中心/服务器IP
	BlockResidential bool `json:"block_residential"`  // 屏蔽住宅网络（较少用，默认关闭）

	// IP 检测服务配置
	// Provider: "" = 不检测, "ip-api" = ip-api.com, "ipinfo" = ipinfo.io
	IPCheckProvider string `json:"ip_check_provider"` // IP检测服务商
	IPInfoToken     string `json:"ipinfo_token"`      // ipinfo.io API Token（免费版可为空，每月5万次）
	IPApiKey        string `json:"ip_api_key"`        // ip-api.com API Key（Pro版，免费版可为空，但有速率限制）
}

// 默认配置
var checkinSetting = CheckinSetting{
	Enabled:  false, // 默认关闭
	MinQuota: 1000,  // 默认最小额度 1000 (约 0.002 USD)
	MaxQuota: 10000, // 默认最大额度 10000 (约 0.02 USD)

	TurnstileEnabled: false,

	IPLimitEnabled:   false,
	BlockVPN:         false,
	BlockDatacenter:  false,
	BlockResidential: false,

	IPCheckProvider: "",
	IPInfoToken:     "",
	IPApiKey:        "",
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("checkin_setting", &checkinSetting)
}

// GetCheckinSetting 获取签到配置
func GetCheckinSetting() *CheckinSetting {
	return &checkinSetting
}

// IsCheckinEnabled 是否启用签到功能
func IsCheckinEnabled() bool {
	return checkinSetting.Enabled
}

// GetCheckinQuotaRange 获取签到额度范围
func GetCheckinQuotaRange() (min, max int) {
	return checkinSetting.MinQuota, checkinSetting.MaxQuota
}
