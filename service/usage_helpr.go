package service

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/gin-gonic/gin"
)

//func GetPromptTokens(textRequest dto.GeneralOpenAIRequest, relayMode int) (int, error) {
//	switch relayMode {
//	case constant.RelayModeChatCompletions:
//		return CountTokenMessages(textRequest.Messages, textRequest.Model)
//	case constant.RelayModeCompletions:
//		return CountTokenInput(textRequest.Prompt, textRequest.Model), nil
//	case constant.RelayModeModerations:
//		return CountTokenInput(textRequest.Input, textRequest.Model), nil
//	}
//	return 0, errors.New("unknown relay mode")
//}

func ResponseText2Usage(c *gin.Context, responseText string, modeName string, promptTokens int) *dto.Usage {
	common.SetContextKey(c, constant.ContextKeyLocalCountTokens, true)
	usage := &dto.Usage{}
	usage.PromptTokens = promptTokens
	usage.CompletionTokens = EstimateTokenByModel(modeName, responseText)
	usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	return usage
}

func NormalizeUsage(usage *dto.Usage) *dto.Usage {
	if usage == nil {
		return nil
	}

	if usage.InputTokensDetails != nil {
		if usage.PromptTokensDetails.CachedTokens == 0 {
			usage.PromptTokensDetails.CachedTokens = usage.InputTokensDetails.CachedTokens
		}
		if usage.PromptTokensDetails.CachedCreationTokens == 0 {
			usage.PromptTokensDetails.CachedCreationTokens = usage.InputTokensDetails.CachedCreationTokens
		}
		if usage.PromptTokensDetails.TextTokens == 0 {
			usage.PromptTokensDetails.TextTokens = usage.InputTokensDetails.TextTokens
		}
		if usage.PromptTokensDetails.AudioTokens == 0 {
			usage.PromptTokensDetails.AudioTokens = usage.InputTokensDetails.AudioTokens
		}
		if usage.PromptTokensDetails.ImageTokens == 0 {
			usage.PromptTokensDetails.ImageTokens = usage.InputTokensDetails.ImageTokens
		}
	}

	if usage.PromptTokensDetails.CachedTokens == 0 && usage.PromptCacheHitTokens > 0 {
		usage.PromptTokensDetails.CachedTokens = usage.PromptCacheHitTokens
	}

	if usage.PromptTokens == 0 && usage.InputTokens > 0 {
		usage.PromptTokens = usage.InputTokens
	}
	if usage.CompletionTokens == 0 && usage.OutputTokens > 0 {
		usage.CompletionTokens = usage.OutputTokens
	}
	if usage.TotalTokens == 0 {
		if usage.InputTokens > 0 || usage.OutputTokens > 0 {
			usage.TotalTokens = usage.InputTokens + usage.OutputTokens
		} else {
			usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
		}
	}

	return usage
}

func ValidUsage(usage *dto.Usage) bool {
	usage = NormalizeUsage(usage)
	return usage != nil && (usage.PromptTokens != 0 || usage.CompletionTokens != 0)
}
