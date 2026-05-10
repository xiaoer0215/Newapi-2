package helper

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"
	"github.com/samber/lo"

	"github.com/gin-gonic/gin"
)

func isGPTImageModel(modelName string) bool {
	normalized := strings.ToLower(strings.TrimSpace(modelName))
	if normalized == "" {
		return false
	}

	return strings.HasPrefix(normalized, "gpt-image-") || normalized == "chatgpt-image-latest"
}

func GetAndValidateRequest(c *gin.Context, format types.RelayFormat) (request dto.Request, err error) {
	relayMode := relayconstant.Path2RelayMode(c.Request.URL.Path)

	switch format {
	case types.RelayFormatOpenAI:
		textRequest, textErr := GetAndValidateTextRequest(c, relayMode)
		if textErr != nil {
			return nil, textErr
		}
		if relayMode == relayconstant.RelayModeChatCompletions && common.IsImageGenerationModel(textRequest.Model) {
			return BuildOpenAIImageRequestFromChatCompletions(c, textRequest)
		}
		request = textRequest
	case types.RelayFormatGemini:
		if strings.Contains(c.Request.URL.Path, ":embedContent") {
			request, err = GetAndValidateGeminiEmbeddingRequest(c)
		} else if strings.Contains(c.Request.URL.Path, ":batchEmbedContents") {
			request, err = GetAndValidateGeminiBatchEmbeddingRequest(c)
		} else {
			request, err = GetAndValidateGeminiRequest(c)
		}
	case types.RelayFormatClaude:
		request, err = GetAndValidateClaudeRequest(c)
	case types.RelayFormatOpenAIResponses:
		request, err = GetAndValidateResponsesRequest(c)
	case types.RelayFormatOpenAIResponsesCompaction:
		request, err = GetAndValidateResponsesCompactionRequest(c)

	case types.RelayFormatOpenAIImage:
		request, err = GetAndValidOpenAIImageRequest(c, relayMode)
	case types.RelayFormatEmbedding:
		request, err = GetAndValidateEmbeddingRequest(c, relayMode)
	case types.RelayFormatRerank:
		request, err = GetAndValidateRerankRequest(c)
	case types.RelayFormatOpenAIAudio:
		request, err = GetAndValidAudioRequest(c, relayMode)
	case types.RelayFormatOpenAIRealtime:
		request = &dto.BaseRequest{}
	default:
		return nil, fmt.Errorf("unsupported relay format: %s", format)
	}
	return request, err
}

func GetAndValidAudioRequest(c *gin.Context, relayMode int) (*dto.AudioRequest, error) {
	audioRequest := &dto.AudioRequest{}
	err := common.UnmarshalBodyReusable(c, audioRequest)
	if err != nil {
		return nil, err
	}
	switch relayMode {
	case relayconstant.RelayModeAudioSpeech:
		if audioRequest.Model == "" {
			return nil, errors.New("model is required")
		}
	default:
		if audioRequest.Model == "" {
			return nil, errors.New("model is required")
		}
		if audioRequest.ResponseFormat == "" {
			audioRequest.ResponseFormat = "json"
		}
	}
	return audioRequest, nil
}

func GetAndValidateRerankRequest(c *gin.Context) (*dto.RerankRequest, error) {
	var rerankRequest *dto.RerankRequest
	err := common.UnmarshalBodyReusable(c, &rerankRequest)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("getAndValidateTextRequest failed: %s", err.Error()))
		return nil, types.NewError(err, types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
	}

	if rerankRequest.Query == "" {
		return nil, types.NewError(fmt.Errorf("query is empty"), types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
	}
	if len(rerankRequest.Documents) == 0 {
		return nil, types.NewError(fmt.Errorf("documents is empty"), types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
	}
	return rerankRequest, nil
}

func GetAndValidateEmbeddingRequest(c *gin.Context, relayMode int) (*dto.EmbeddingRequest, error) {
	var embeddingRequest *dto.EmbeddingRequest
	err := common.UnmarshalBodyReusable(c, &embeddingRequest)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("getAndValidateTextRequest failed: %s", err.Error()))
		return nil, types.NewError(err, types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
	}

	if embeddingRequest.Input == nil {
		return nil, fmt.Errorf("input is empty")
	}
	if relayMode == relayconstant.RelayModeModerations && embeddingRequest.Model == "" {
		embeddingRequest.Model = "omni-moderation-latest"
	}
	if relayMode == relayconstant.RelayModeEmbeddings && embeddingRequest.Model == "" {
		embeddingRequest.Model = c.Param("model")
	}
	return embeddingRequest, nil
}

func GetAndValidateResponsesRequest(c *gin.Context) (*dto.OpenAIResponsesRequest, error) {
	request := &dto.OpenAIResponsesRequest{}
	err := common.UnmarshalBodyReusable(c, request)
	if err != nil {
		return nil, err
	}
	if request.Model == "" {
		return nil, errors.New("model is required")
	}
	if request.Input == nil {
		return nil, errors.New("input is required")
	}
	return request, nil
}

func GetAndValidateResponsesCompactionRequest(c *gin.Context) (*dto.OpenAIResponsesCompactionRequest, error) {
	request := &dto.OpenAIResponsesCompactionRequest{}
	if err := common.UnmarshalBodyReusable(c, request); err != nil {
		return nil, err
	}
	if request.Model == "" {
		return nil, errors.New("model is required")
	}
	return request, nil
}

func GetAndValidOpenAIImageRequest(c *gin.Context, relayMode int) (*dto.ImageRequest, error) {
	imageRequest := &dto.ImageRequest{}

	switch relayMode {
	case relayconstant.RelayModeImagesEdits:
		if strings.Contains(c.Request.Header.Get("Content-Type"), "multipart/form-data") {
			_, err := c.MultipartForm()
			if err != nil {
				return nil, fmt.Errorf("failed to parse image edit form request: %w", err)
			}
			formData := c.Request.PostForm
			imageRequest.Prompt = formData.Get("prompt")
			imageRequest.Model = formData.Get("model")
			imageRequest.N = common.GetPointer(uint(common.String2Int(formData.Get("n"))))
			imageRequest.Quality = formData.Get("quality")
			imageRequest.Size = formData.Get("size")
			if imageValue := formData.Get("image"); imageValue != "" {
				imageRequest.Image, _ = json.Marshal(imageValue)
			}

			if isGPTImageModel(imageRequest.Model) {
				if imageRequest.Quality == "" {
					imageRequest.Quality = "auto"
				}
			}
			if imageRequest.N == nil || *imageRequest.N == 0 {
				imageRequest.N = common.GetPointer(uint(1))
			}

			hasWatermark := formData.Has("watermark")
			if hasWatermark {
				watermark := formData.Get("watermark") == "true"
				imageRequest.Watermark = &watermark
			}
			break
		}
		fallthrough
	default:
		err := common.UnmarshalBodyReusable(c, imageRequest)
		if err != nil {
			return nil, err
		}

		if imageRequest.Model == "" {
			//imageRequest.Model = "dall-e-3"
			return nil, errors.New("model is required")
		}

		if strings.Contains(imageRequest.Size, "×") {
			return nil, errors.New("size an unexpected error occurred in the parameter, please use 'x' instead of the multiplication sign '×'")
		}

		// Not "256x256", "512x512", or "1024x1024"
		if imageRequest.Model == "dall-e-2" || imageRequest.Model == "dall-e" {
			if imageRequest.Size != "" && imageRequest.Size != "256x256" && imageRequest.Size != "512x512" && imageRequest.Size != "1024x1024" {
				return nil, errors.New("size must be one of 256x256, 512x512, or 1024x1024 for dall-e-2 or dall-e")
			}
			if imageRequest.Size == "" {
				imageRequest.Size = "1024x1024"
			}
		} else if imageRequest.Model == "dall-e-3" {
			if imageRequest.Size != "" && imageRequest.Size != "1024x1024" && imageRequest.Size != "1024x1792" && imageRequest.Size != "1792x1024" {
				return nil, errors.New("size must be one of 1024x1024, 1024x1792 or 1792x1024 for dall-e-3")
			}
			if imageRequest.Quality == "" {
				imageRequest.Quality = "standard"
			}
			if imageRequest.Size == "" {
				imageRequest.Size = "1024x1024"
			}
		} else if isGPTImageModel(imageRequest.Model) {
			if imageRequest.Quality == "" {
				imageRequest.Quality = "auto"
			}
		}

		//if imageRequest.Prompt == "" {
		//	return nil, errors.New("prompt is required")
		//}

		if imageRequest.N == nil || *imageRequest.N == 0 {
			imageRequest.N = common.GetPointer(uint(1))
		}
	}

	return imageRequest, nil
}

func GetAndValidateClaudeRequest(c *gin.Context) (textRequest *dto.ClaudeRequest, err error) {
	textRequest = &dto.ClaudeRequest{}
	err = common.UnmarshalBodyReusable(c, textRequest)
	if err != nil {
		return nil, err
	}
	if textRequest.Messages == nil || len(textRequest.Messages) == 0 {
		return nil, errors.New("field messages is required")
	}
	if textRequest.Model == "" {
		return nil, errors.New("field model is required")
	}

	//if textRequest.Stream {
	//	relayInfo.IsStream = true
	//}

	return textRequest, nil
}

func GetAndValidateTextRequest(c *gin.Context, relayMode int) (*dto.GeneralOpenAIRequest, error) {
	textRequest := &dto.GeneralOpenAIRequest{}
	err := common.UnmarshalBodyReusable(c, textRequest)
	if err != nil {
		return nil, err
	}

	if relayMode == relayconstant.RelayModeModerations && textRequest.Model == "" {
		textRequest.Model = "text-moderation-latest"
	}
	if relayMode == relayconstant.RelayModeEmbeddings && textRequest.Model == "" {
		textRequest.Model = c.Param("model")
	}

	if lo.FromPtrOr(textRequest.MaxTokens, uint(0)) > math.MaxInt32/2 {
		return nil, errors.New("max_tokens is invalid")
	}
	if textRequest.Model == "" {
		return nil, errors.New("model is required")
	}
	if textRequest.WebSearchOptions != nil {
		if textRequest.WebSearchOptions.SearchContextSize != "" {
			validSizes := map[string]bool{
				"high":   true,
				"medium": true,
				"low":    true,
			}
			if !validSizes[textRequest.WebSearchOptions.SearchContextSize] {
				return nil, errors.New("invalid search_context_size, must be one of: high, medium, low")
			}
		} else {
			textRequest.WebSearchOptions.SearchContextSize = "medium"
		}
	}
	switch relayMode {
	case relayconstant.RelayModeCompletions:
		if textRequest.Prompt == "" {
			return nil, errors.New("field prompt is required")
		}
	case relayconstant.RelayModeChatCompletions:
		// For FIM (Fill-in-the-middle) requests with prefix/suffix, messages is optional
		// It will be filled by provider-specific adaptors if needed (e.g., SiliconFlow)。Or it is allowed by model vendor(s) (e.g., DeepSeek)
		if len(textRequest.Messages) == 0 && textRequest.Prefix == nil && textRequest.Suffix == nil {
			if !common.IsImageGenerationModel(textRequest.Model) {
				return nil, errors.New("field messages is required")
			}
			if _, err := ExtractPromptFromOpenAIChatImageRequest(textRequest); err != nil {
				return nil, err
			}
		}
	case relayconstant.RelayModeEmbeddings:
	case relayconstant.RelayModeModerations:
		if textRequest.Input == nil || textRequest.Input == "" {
			return nil, errors.New("field input is required")
		}
	case relayconstant.RelayModeEdits:
		if textRequest.Instruction == "" {
			return nil, errors.New("field instruction is required")
		}
	}
	return textRequest, nil
}

func BuildOpenAIImageRequestFromChatCompletions(c *gin.Context, textRequest *dto.GeneralOpenAIRequest) (*dto.ImageRequest, error) {
	if textRequest == nil {
		return nil, errors.New("request is required")
	}

	prompt, err := ExtractPromptFromOpenAIChatImageRequest(textRequest)
	if err != nil {
		return nil, err
	}

	var rawFields map[string]json.RawMessage
	if err = common.UnmarshalBodyReusable(c, &rawFields); err != nil {
		return nil, err
	}

	imageRequest := &dto.ImageRequest{
		Model:  textRequest.Model,
		Prompt: prompt,
		Size:   textRequest.Size,
		User:   textRequest.User,
	}

	if textRequest.N != nil && *textRequest.N > 0 {
		imageRequest.N = common.GetPointer(uint(*textRequest.N))
	}

	if value, ok := rawFields["quality"]; ok {
		_ = common.Unmarshal(value, &imageRequest.Quality)
	}
	if value, ok := rawFields["response_format"]; ok {
		var responseFormat string
		if err = common.Unmarshal(value, &responseFormat); err == nil {
			imageRequest.ResponseFormat = responseFormat
		}
	}
	if value, ok := rawFields["style"]; ok {
		imageRequest.Style = value
	}
	if value, ok := rawFields["background"]; ok {
		imageRequest.Background = value
	}
	if value, ok := rawFields["moderation"]; ok {
		imageRequest.Moderation = value
	}
	if value, ok := rawFields["output_format"]; ok {
		imageRequest.OutputFormat = value
	}
	if value, ok := rawFields["output_compression"]; ok {
		imageRequest.OutputCompression = value
	}
	if value, ok := rawFields["partial_images"]; ok {
		imageRequest.PartialImages = value
	}
	if value, ok := rawFields["watermark"]; ok {
		var watermark bool
		if err = common.Unmarshal(value, &watermark); err == nil {
			imageRequest.Watermark = common.GetPointer(watermark)
		}
	}
	if value, ok := rawFields["image"]; ok {
		imageRequest.Image = value
	}

	if imageRequest.N == nil || *imageRequest.N == 0 {
		imageRequest.N = common.GetPointer(uint(1))
	}
	if isGPTImageModel(imageRequest.Model) && imageRequest.Quality == "" {
		imageRequest.Quality = "auto"
	}

	return imageRequest, nil
}

func ExtractPromptFromOpenAIChatImageRequest(textRequest *dto.GeneralOpenAIRequest) (string, error) {
	if textRequest == nil {
		return "", errors.New("request is required")
	}

	sections := make([]string, 0, len(textRequest.Messages)+2)
	promptText := strings.TrimSpace(stringifyOpenAIImagePromptValue(textRequest.Prompt))
	if promptText != "" {
		sections = append(sections, promptText)
	}

	inputText := strings.TrimSpace(strings.Join(textRequest.ParseInput(), "\n"))
	if inputText != "" {
		sections = append(sections, inputText)
	}

	for _, message := range textRequest.Messages {
		messageText := strings.TrimSpace(message.StringContent())
		if messageText == "" {
			textParts := make([]string, 0, 2)
			for _, content := range message.ParseContent() {
				if content.Type == dto.ContentTypeText {
					part := strings.TrimSpace(content.Text)
					if part != "" {
						textParts = append(textParts, part)
					}
				}
			}
			messageText = strings.TrimSpace(strings.Join(textParts, "\n"))
		}
		if messageText == "" {
			continue
		}
		switch message.Role {
		case "", "user":
			sections = append(sections, messageText)
		default:
			sections = append(sections, fmt.Sprintf("%s: %s", message.Role, messageText))
		}
	}

	prompt := strings.TrimSpace(strings.Join(sections, "\n\n"))
	if prompt == "" {
		return "", errors.New("prompt is required for image generation")
	}
	return prompt, nil
}

func stringifyOpenAIImagePromptValue(value any) string {
	switch v := value.(type) {
	case nil:
		return ""
	case string:
		return v
	case []any:
		parts := make([]string, 0, len(v))
		for _, item := range v {
			part := strings.TrimSpace(stringifyOpenAIImagePromptValue(item))
			if part != "" {
				parts = append(parts, part)
			}
		}
		return strings.Join(parts, "\n")
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}
}

func GetAndValidateGeminiRequest(c *gin.Context) (*dto.GeminiChatRequest, error) {
	request := &dto.GeminiChatRequest{}
	err := common.UnmarshalBodyReusable(c, request)
	if err != nil {
		return nil, err
	}
	if len(request.Contents) == 0 && len(request.Requests) == 0 {
		return nil, errors.New("contents is required")
	}

	//if c.Query("alt") == "sse" {
	//	relayInfo.IsStream = true
	//}

	return request, nil
}

func GetAndValidateGeminiEmbeddingRequest(c *gin.Context) (*dto.GeminiEmbeddingRequest, error) {
	request := &dto.GeminiEmbeddingRequest{}
	err := common.UnmarshalBodyReusable(c, request)
	if err != nil {
		return nil, err
	}
	return request, nil
}

func GetAndValidateGeminiBatchEmbeddingRequest(c *gin.Context) (*dto.GeminiBatchEmbeddingRequest, error) {
	request := &dto.GeminiBatchEmbeddingRequest{}
	err := common.UnmarshalBodyReusable(c, request)
	if err != nil {
		return nil, err
	}
	return request, nil
}
