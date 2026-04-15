package operation_setting

import (
	"github.com/QuantumNous/new-api/setting/config"
)

type GroupMonitorSetting struct {
	EnabledGroups      []string `json:"enabled_groups"`
	RefreshInterval    int      `json:"refresh_interval"` // seconds
	PublicVisible      bool     `json:"public_visible"`
	ModelDetailVisible bool     `json:"model_detail_visible"` // 普通用户是否可展开模型详情
	DefaultWindow      string   `json:"default_window"`       // 默认时间窗口: 1h/6h/12h/24h
}

var groupMonitorSetting = GroupMonitorSetting{
	EnabledGroups:      []string{},
	RefreshInterval:    60,
	PublicVisible:      false,
	ModelDetailVisible: false,
	DefaultWindow:      "6h",
}

func init() {
	config.GlobalConfig.Register("group_monitor_setting", &groupMonitorSetting)
}

func GetGroupMonitorSetting() *GroupMonitorSetting {
	return &groupMonitorSetting
}

func UpdateGroupMonitorSetting(newSetting GroupMonitorSetting) {
	if newSetting.RefreshInterval < 10 {
		newSetting.RefreshInterval = 10
	}
	groupMonitorSetting = newSetting
}
