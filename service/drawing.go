package service

import (
	"errors"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/model_setting"
	"gorm.io/gorm"
)

const (
	SystemDrawingTokenName = "system-drawing-token"

	DrawingRequestModeImageGeneration = "image_generation"
	DrawingRequestModeGeminiNative    = "gemini_generate_content"
)

type DrawingConfig struct {
	Enabled      bool     `json:"enabled"`
	Group        string   `json:"group"`
	Models       []string `json:"models"`
	DefaultModel string   `json:"default_model"`
}

func GetDrawingConfig() DrawingConfig {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()

	return DrawingConfig{
		Enabled:      common.OptionMap["DrawingEnabled"] == "true",
		Group:        strings.TrimSpace(common.OptionMap["DrawingTokenGroup"]),
		Models:       splitDrawingModels(common.OptionMap["DrawingTokenModels"]),
		DefaultModel: strings.TrimSpace(common.OptionMap["DrawingDefaultModel"]),
	}
}

func GetDrawingModelsByGroup(group string) []string {
	group = strings.TrimSpace(group)
	if group == "" {
		return []string{}
	}

	model.GetPricing()
	models := uniqueStrings(model.GetGroupEnabledModels(group))
	if len(models) == 0 {
		return []string{}
	}

	drawingModels := make([]string, 0, len(models))
	for _, modelName := range models {
		if GetDrawingModelRequestMode(modelName) != "" {
			drawingModels = append(drawingModels, modelName)
		}
	}

	if len(drawingModels) > 0 {
		sort.Strings(drawingModels)
		return uniqueStrings(drawingModels)
	}

	return []string{}
}

func GetDrawingModelRequestMode(modelName string) string {
	modelName = strings.TrimSpace(modelName)
	if modelName == "" {
		return ""
	}

	if model_setting.IsGeminiModelSupportImagine(modelName) {
		return DrawingRequestModeGeminiNative
	}

	if strings.HasPrefix(modelName, "imagen") {
		return DrawingRequestModeImageGeneration
	}

	for _, endpointType := range model.GetModelSupportEndpointTypes(modelName) {
		if endpointType == constant.EndpointTypeImageGeneration {
			return DrawingRequestModeImageGeneration
		}
	}

	return ""
}

func GetDrawingModelRequestModes(models []string) map[string]string {
	requestModes := make(map[string]string, len(models))
	for _, modelName := range models {
		if requestMode := GetDrawingModelRequestMode(modelName); requestMode != "" {
			requestModes[modelName] = requestMode
		}
	}
	return requestModes
}

func ResolveDrawingConfig() (DrawingConfig, error) {
	config := GetDrawingConfig()
	if !config.Enabled {
		return config, nil
	}
	if config.Group == "" {
		return config, errors.New("请先在绘图设置中选择绘图分组")
	}

	availableModels := GetDrawingModelsByGroup(config.Group)
	if len(availableModels) == 0 {
		return config, errors.New("当前绘图分组下没有可用模型")
	}

	if len(config.Models) == 0 {
		config.Models = availableModels
	} else {
		config.Models = filterDrawingModels(config.Models, availableModels)
		if len(config.Models) == 0 {
			return config, errors.New("当前绘图设置中的模型已不可用，请重新选择")
		}
	}

	if config.DefaultModel == "" || !containsString(config.Models, config.DefaultModel) {
		config.DefaultModel = config.Models[0]
	}

	return config, nil
}

func EnsureUserDrawingToken(userId int) (*model.Token, DrawingConfig, error) {
	config, err := ResolveDrawingConfig()
	if err != nil {
		return nil, config, err
	}
	if !config.Enabled {
		return nil, config, nil
	}

	token, err := model.GetUserTokenByName(userId, SystemDrawingTokenName)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, config, err
	}

	modelLimits := strings.Join(config.Models, ",")
	if errors.Is(err, gorm.ErrRecordNotFound) {
		key, keyErr := common.GenerateKey()
		if keyErr != nil {
			return nil, config, keyErr
		}
		now := common.GetTimestamp()
		token = &model.Token{
			UserId:             userId,
			Key:                key,
			Status:             common.TokenStatusEnabled,
			Name:               SystemDrawingTokenName,
			CreatedTime:        now,
			AccessedTime:       now,
			ExpiredTime:        -1,
			RemainQuota:        0,
			UnlimitedQuota:     true,
			ModelLimitsEnabled: true,
			ModelLimits:        modelLimits,
			Group:              config.Group,
			CrossGroupRetry:    false,
		}
		if err = token.Insert(); err != nil {
			return nil, config, err
		}
		return token, config, nil
	}

	shouldUpdate := false
	if token.Name != SystemDrawingTokenName {
		token.Name = SystemDrawingTokenName
		shouldUpdate = true
	}
	if token.Status != common.TokenStatusEnabled {
		token.Status = common.TokenStatusEnabled
		shouldUpdate = true
	}
	if token.ExpiredTime != -1 {
		token.ExpiredTime = -1
		shouldUpdate = true
	}
	if token.RemainQuota != 0 {
		token.RemainQuota = 0
		shouldUpdate = true
	}
	if !token.UnlimitedQuota {
		token.UnlimitedQuota = true
		shouldUpdate = true
	}
	if !token.ModelLimitsEnabled {
		token.ModelLimitsEnabled = true
		shouldUpdate = true
	}
	if token.ModelLimits != modelLimits {
		token.ModelLimits = modelLimits
		shouldUpdate = true
	}
	if token.Group != config.Group {
		token.Group = config.Group
		shouldUpdate = true
	}
	if token.CrossGroupRetry {
		token.CrossGroupRetry = false
		shouldUpdate = true
	}
	if token.AllowIps != nil {
		token.AllowIps = nil
		shouldUpdate = true
	}

	if shouldUpdate {
		if err = token.Update(); err != nil {
			return nil, config, err
		}
	}

	return token, config, nil
}

func splitDrawingModels(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return []string{}
	}
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" && !containsString(result, part) {
			result = append(result, part)
		}
	}
	return result
}

func uniqueStrings(values []string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" && !containsString(result, value) {
			result = append(result, value)
		}
	}
	return result
}

func filterDrawingModels(selected []string, available []string) []string {
	availableSet := make(map[string]struct{}, len(available))
	for _, modelName := range available {
		availableSet[modelName] = struct{}{}
	}
	filtered := make([]string, 0, len(selected))
	for _, modelName := range selected {
		if _, ok := availableSet[modelName]; ok && !containsString(filtered, modelName) {
			filtered = append(filtered, modelName)
		}
	}
	return filtered
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
