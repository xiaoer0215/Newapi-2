package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

// IPRestrictionSetting stores reusable IP risk-control rules.
// Features such as check-in only decide whether they opt into this shared policy.
type IPRestrictionSetting struct {
	Configured           bool   `json:"configured"`
	SingleIPLimitEnabled bool   `json:"single_ip_limit_enabled"`
	BlockVPN             bool   `json:"block_vpn"`
	BlockDatacenter      bool   `json:"block_datacenter"`
	BlockResidential     bool   `json:"block_residential"`
	IPCheckProvider      string `json:"ip_check_provider"`
	IPInfoToken          string `json:"ipinfo_token"`
	IPApiKey             string `json:"ip_api_key"`
}

var ipRestrictionSetting = IPRestrictionSetting{
	Configured:           false,
	SingleIPLimitEnabled: false,
	BlockVPN:             false,
	BlockDatacenter:      false,
	BlockResidential:     false,
	IPCheckProvider:      "",
	IPInfoToken:          "",
	IPApiKey:             "",
}

func init() {
	config.GlobalConfig.Register("ip_restriction_setting", &ipRestrictionSetting)
}

func GetIPRestrictionSetting() *IPRestrictionSetting {
	return &ipRestrictionSetting
}

func GetEffectiveIPRestrictionSetting() IPRestrictionSetting {
	if ipRestrictionSetting.Configured {
		return ipRestrictionSetting
	}

	legacy := GetCheckinSetting()
	return IPRestrictionSetting{
		Configured:           false,
		SingleIPLimitEnabled: legacy.IPLimitEnabled,
		BlockVPN:             legacy.BlockVPN,
		BlockDatacenter:      legacy.BlockDatacenter,
		BlockResidential:     legacy.BlockResidential,
		IPCheckProvider:      legacy.IPCheckProvider,
		IPInfoToken:          legacy.IPInfoToken,
		IPApiKey:             legacy.IPApiKey,
	}
}
