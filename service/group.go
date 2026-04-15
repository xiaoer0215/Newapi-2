package service

import (
	"strings"

	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
)

func resolveUsableGroupDescription(groupName, desc string) string {
	if strings.TrimSpace(desc) != "" {
		return strings.TrimSpace(desc)
	}
	return setting.GetUsableGroupDescription(strings.TrimSpace(groupName))
}

func normalizeMappedGroupKey(groupName string) string {
	normalized := strings.TrimSpace(groupName)
	if strings.HasPrefix(normalized, "+:") {
		return strings.TrimSpace(strings.TrimPrefix(normalized, "+:"))
	}
	if strings.HasPrefix(normalized, "-:") {
		return strings.TrimSpace(strings.TrimPrefix(normalized, "-:"))
	}
	return normalized
}

func GetUserUsableGroups(userGroup string) map[string]string {
	userGroup = strings.TrimSpace(userGroup)
	groupsCopy := make(map[string]string)

	if userGroup == "" {
		return setting.GetUserUsableGroupsCopy()
	}

	specialSettings, hasSpecialSettings := ratio_setting.GetGroupRatioSetting().GroupSpecialUsableGroup.Get(userGroup)

	// When a user group has an explicit mapping, that mapping becomes the final
	// usable-group list instead of appending to the global defaults.
	if hasSpecialSettings {
		for specialGroup, desc := range specialSettings {
			targetGroup := strings.TrimSpace(specialGroup)
			if targetGroup == "" {
				continue
			}

			if strings.HasPrefix(targetGroup, "-:") {
				delete(groupsCopy, normalizeMappedGroupKey(targetGroup))
				continue
			}

			targetGroup = normalizeMappedGroupKey(targetGroup)
			if targetGroup == "" {
				continue
			}

			groupsCopy[targetGroup] = resolveUsableGroupDescription(targetGroup, desc)
		}
		return groupsCopy
	}

	groupsCopy = setting.GetUserUsableGroupsCopy()
	if _, ok := groupsCopy[userGroup]; !ok {
		groupsCopy[userGroup] = setting.GetUsableGroupDescription(userGroup)
	}

	return groupsCopy
}

func GroupInUserUsableGroups(userGroup, groupName string) bool {
	_, ok := GetUserUsableGroups(userGroup)[groupName]
	return ok
}

func GetUserAutoGroup(userGroup string) []string {
	groups := GetUserUsableGroups(userGroup)
	autoGroups := make([]string, 0)
	for _, group := range setting.GetAutoGroups() {
		if _, ok := groups[group]; ok {
			autoGroups = append(autoGroups, group)
		}
	}
	return autoGroups
}

// GetUserGroupRatio gets the ratio applied when a user group uses a model group.
func GetUserGroupRatio(userGroup, group string) float64 {
	ratio, ok := ratio_setting.GetGroupGroupRatio(userGroup, group)
	if ok {
		return ratio
	}
	return ratio_setting.GetGroupRatio(group)
}
