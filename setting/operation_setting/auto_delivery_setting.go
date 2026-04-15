package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

type AutoDeliverySetting struct {
	Enabled bool `json:"enabled"`
}

var autoDeliverySetting = AutoDeliverySetting{
	Enabled: true,
}

func init() {
	config.GlobalConfig.Register("auto_delivery_setting", &autoDeliverySetting)
}

func GetAutoDeliverySetting() *AutoDeliverySetting {
	return &autoDeliverySetting
}

func IsAutoDeliveryEnabled() bool {
	return autoDeliverySetting.Enabled
}
