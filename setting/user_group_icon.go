package setting

import (
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

var userGroupIcons = map[string]string{}
var userGroupIconsMutex sync.RWMutex

func GetUserGroupIconsCopy() map[string]string {
	userGroupIconsMutex.RLock()
	defer userGroupIconsMutex.RUnlock()

	copyIcons := make(map[string]string, len(userGroupIcons))
	for k, v := range userGroupIcons {
		copyIcons[k] = v
	}
	return copyIcons
}

func UserGroupIcons2JSONString() string {
	userGroupIconsMutex.RLock()
	defer userGroupIconsMutex.RUnlock()

	jsonBytes, err := common.Marshal(userGroupIcons)
	if err != nil {
		common.SysLog("error marshalling user group icons: " + err.Error())
	}
	return string(jsonBytes)
}

func UpdateUserGroupIconsByJSONString(jsonStr string) error {
	userGroupIconsMutex.Lock()
	defer userGroupIconsMutex.Unlock()

	decoded := make(map[string]string)
	if err := common.Unmarshal([]byte(jsonStr), &decoded); err != nil {
		return err
	}

	userGroupIcons = make(map[string]string, len(decoded))
	for groupName, icon := range decoded {
		trimmedGroup := strings.TrimSpace(groupName)
		trimmedIcon := strings.TrimSpace(icon)
		if trimmedGroup == "" || trimmedIcon == "" {
			continue
		}
		userGroupIcons[trimmedGroup] = trimmedIcon
	}
	return nil
}

func GetUserGroupIcon(groupName string) string {
	userGroupIconsMutex.RLock()
	defer userGroupIconsMutex.RUnlock()

	return strings.TrimSpace(userGroupIcons[strings.TrimSpace(groupName)])
}
