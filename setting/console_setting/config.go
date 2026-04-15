package console_setting

import "github.com/QuantumNous/new-api/setting/config"

type ConsoleSetting struct {
	ApiInfo              string `json:"api_info"`
	UptimeKumaGroups     string `json:"uptime_kuma_groups"`
	Announcements        string `json:"announcements"`
	FAQ                  string `json:"faq"`
	ContactImage         string `json:"contact_image"`
	ContactTitle         string `json:"contact_title"`
	ContactCaption       string `json:"contact_caption"`
	ContactImage2        string `json:"contact_image2"`
	ContactTitle2        string `json:"contact_title2"`
	ContactCaption2      string `json:"contact_caption2"`
	HomePageConfig       string `json:"home_page_config"`
	ApiInfoEnabled       bool   `json:"api_info_enabled"`
	UptimeKumaEnabled    bool   `json:"uptime_kuma_enabled"`
	AnnouncementsEnabled bool   `json:"announcements_enabled"`
	FAQEnabled           bool   `json:"faq_enabled"`
	ContactEnabled       bool   `json:"contact_enabled"`
	Contact2Enabled      bool   `json:"contact2_enabled"`
}

var defaultConsoleSetting = ConsoleSetting{
	ApiInfo:              "",
	UptimeKumaGroups:     "",
	Announcements:        "",
	FAQ:                  "",
	ContactImage:         "",
	ContactTitle:         "",
	ContactCaption:       "",
	ContactImage2:        "",
	ContactTitle2:        "",
	ContactCaption2:      "",
	HomePageConfig:       "",
	ApiInfoEnabled:       true,
	UptimeKumaEnabled:    true,
	AnnouncementsEnabled: true,
	FAQEnabled:           true,
	ContactEnabled:       false,
	Contact2Enabled:      false,
}

// 全局实例
var consoleSetting = defaultConsoleSetting

func init() {
	// 注册到全局配置管理器，键名为 console_setting
	config.GlobalConfig.Register("console_setting", &consoleSetting)
}

// GetConsoleSetting 获取 ConsoleSetting 配置实例
func GetConsoleSetting() *ConsoleSetting {
	return &consoleSetting
}
