package setting

import (
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

type UserGroupWelcomeOverlay struct {
	SVG                   string `json:"svg"`
	AutoCloseSeconds      int    `json:"auto_close_seconds"`
	RepeatIntervalSeconds int    `json:"repeat_interval_seconds"`
}

const maxUserGroupWelcomeOverlayDurationSeconds = 7 * 24 * 60 * 60

var userGroupWelcomeOverlays = map[string]UserGroupWelcomeOverlay{}
var userGroupWelcomeOverlaysMutex sync.RWMutex

func normalizeUserGroupWelcomeOverlay(overlay UserGroupWelcomeOverlay) UserGroupWelcomeOverlay {
	overlay.SVG = strings.TrimSpace(overlay.SVG)
	if overlay.AutoCloseSeconds < 0 {
		overlay.AutoCloseSeconds = 0
	}
	if overlay.AutoCloseSeconds > maxUserGroupWelcomeOverlayDurationSeconds {
		overlay.AutoCloseSeconds = maxUserGroupWelcomeOverlayDurationSeconds
	}
	if overlay.RepeatIntervalSeconds < 0 {
		overlay.RepeatIntervalSeconds = 0
	}
	if overlay.RepeatIntervalSeconds > maxUserGroupWelcomeOverlayDurationSeconds {
		overlay.RepeatIntervalSeconds = maxUserGroupWelcomeOverlayDurationSeconds
	}
	return overlay
}

func GetUserGroupWelcomeOverlaysCopy() map[string]UserGroupWelcomeOverlay {
	userGroupWelcomeOverlaysMutex.RLock()
	defer userGroupWelcomeOverlaysMutex.RUnlock()

	copyOverlays := make(map[string]UserGroupWelcomeOverlay, len(userGroupWelcomeOverlays))
	for k, v := range userGroupWelcomeOverlays {
		copyOverlays[k] = v
	}
	return copyOverlays
}

func UserGroupWelcomeOverlays2JSONString() string {
	userGroupWelcomeOverlaysMutex.RLock()
	defer userGroupWelcomeOverlaysMutex.RUnlock()

	jsonBytes, err := common.Marshal(userGroupWelcomeOverlays)
	if err != nil {
		common.SysLog("error marshalling user group welcome overlays: " + err.Error())
	}
	return string(jsonBytes)
}

func UpdateUserGroupWelcomeOverlaysByJSONString(jsonStr string) error {
	userGroupWelcomeOverlaysMutex.Lock()
	defer userGroupWelcomeOverlaysMutex.Unlock()

	decoded := make(map[string]UserGroupWelcomeOverlay)
	if err := common.Unmarshal([]byte(jsonStr), &decoded); err != nil {
		return err
	}

	userGroupWelcomeOverlays = make(map[string]UserGroupWelcomeOverlay, len(decoded))
	for groupName, overlay := range decoded {
		trimmedGroup := strings.TrimSpace(groupName)
		normalizedOverlay := normalizeUserGroupWelcomeOverlay(overlay)
		if trimmedGroup == "" || normalizedOverlay.SVG == "" {
			continue
		}
		userGroupWelcomeOverlays[trimmedGroup] = normalizedOverlay
	}
	return nil
}

func GetUserGroupWelcomeOverlay(groupName string) (UserGroupWelcomeOverlay, bool) {
	userGroupWelcomeOverlaysMutex.RLock()
	defer userGroupWelcomeOverlaysMutex.RUnlock()

	overlay, ok := userGroupWelcomeOverlays[strings.TrimSpace(groupName)]
	return overlay, ok
}
