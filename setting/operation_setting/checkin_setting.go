package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

// CheckinSetting stores the feature-specific check-in switches.
// Shared IP risk-control rules now live under ip_restriction_setting.*.
type CheckinSetting struct {
	Enabled          bool `json:"enabled"`
	MinQuota         int  `json:"min_quota"`
	MaxQuota         int  `json:"max_quota"`
	TurnstileEnabled bool `json:"turnstile_enabled"`
	IPLimitEnabled   bool `json:"ip_limit_enabled"`

	// Legacy fields are kept so existing option keys can still be loaded
	// before users resave them into the new shared IP restriction module.
	BlockVPN         bool   `json:"block_vpn"`
	BlockDatacenter  bool   `json:"block_datacenter"`
	BlockResidential bool   `json:"block_residential"`
	IPCheckProvider  string `json:"ip_check_provider"`
	IPInfoToken      string `json:"ipinfo_token"`
	IPApiKey         string `json:"ip_api_key"`
}

var checkinSetting = CheckinSetting{
	Enabled:          false,
	MinQuota:         1000,
	MaxQuota:         10000,
	TurnstileEnabled: false,
	IPLimitEnabled:   false,
	BlockVPN:         false,
	BlockDatacenter:  false,
	BlockResidential: false,
	IPCheckProvider:  "",
	IPInfoToken:      "",
	IPApiKey:         "",
}

func init() {
	config.GlobalConfig.Register("checkin_setting", &checkinSetting)
}

func GetCheckinSetting() *CheckinSetting {
	return &checkinSetting
}

func IsCheckinEnabled() bool {
	return checkinSetting.Enabled
}

func GetCheckinQuotaRange() (min, max int) {
	return checkinSetting.MinQuota, checkinSetting.MaxQuota
}
