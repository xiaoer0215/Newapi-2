package service

import (
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	operation_setting "github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/bytedance/gopkg/util/gopool"
)

var groupMonitorOnce sync.Once

// StartGroupMonitorTask launches a background goroutine (master node only)
// that periodically refreshes group monitor statistics.
func StartGroupMonitorTask() {
	groupMonitorOnce.Do(func() {
		if !common.IsMasterNode {
			return
		}
		gopool.Go(func() {
			for {
				setting := operation_setting.GetGroupMonitorSetting()
				if len(setting.EnabledGroups) > 0 {
					for _, w := range []string{"1h", "6h", "12h", "24h"} {
						_ = model.RefreshGroupMonitorStats(setting.EnabledGroups, w)
					}
				}
				interval := setting.RefreshInterval
				if interval < 10 {
					interval = 10
				}
				time.Sleep(time.Duration(interval) * time.Second)
			}
		})
	})
}
