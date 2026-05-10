package gemini

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestConvertImageRequestForGeminiNativeModel(t *testing.T) {
	t.Parallel()

	adaptor := &Adaptor{}
	request := dto.ImageRequest{
		Model:   "gemini-3-pro-image-preview",
		Prompt:  "draw a cat on the moon",
		N:       common.GetPointer(uint(2)),
		Size:    "1792x1024",
		Quality: "hd",
	}
	info := &relaycommon.RelayInfo{
		RelayMode: relayconstant.RelayModeImagesGenerations,
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: "gemini-3-pro-image-preview",
		},
	}

	converted, err := adaptor.ConvertImageRequest(nil, info, request)
	require.NoError(t, err)

	geminiRequest, ok := converted.(*dto.GeminiChatRequest)
	require.True(t, ok)
	require.Len(t, geminiRequest.Contents, 1)
	require.Len(t, geminiRequest.Contents[0].Parts, 1)
	require.Equal(t, "draw a cat on the moon", geminiRequest.Contents[0].Parts[0].Text)
	require.NotNil(t, geminiRequest.GenerationConfig.CandidateCount)
	require.Equal(t, 2, *geminiRequest.GenerationConfig.CandidateCount)
	require.Equal(t, []string{"TEXT", "IMAGE"}, geminiRequest.GenerationConfig.ResponseModalities)

	var imageConfig map[string]interface{}
	err = common.Unmarshal(geminiRequest.GenerationConfig.ImageConfig, &imageConfig)
	require.NoError(t, err)
	require.Equal(t, "16:9", imageConfig["aspectRatio"])
	require.Equal(t, "2K", imageConfig["imageSize"])
}

func TestConvertImageRequestForGeminiNativeModelKeeps4KAspectRatio(t *testing.T) {
	t.Parallel()

	adaptor := &Adaptor{}
	request := dto.ImageRequest{
		Model:   "gemini-3-pro-image-preview",
		Prompt:  "draw a 4k cat on the moon",
		N:       common.GetPointer(uint(1)),
		Size:    "4096x2304",
		Quality: "4k",
	}
	info := &relaycommon.RelayInfo{
		RelayMode: relayconstant.RelayModeImagesGenerations,
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: "gemini-3-pro-image-preview",
		},
	}

	converted, err := adaptor.ConvertImageRequest(nil, info, request)
	require.NoError(t, err)

	geminiRequest, ok := converted.(*dto.GeminiChatRequest)
	require.True(t, ok)

	var imageConfig map[string]interface{}
	err = common.Unmarshal(geminiRequest.GenerationConfig.ImageConfig, &imageConfig)
	require.NoError(t, err)
	require.Equal(t, "16:9", imageConfig["aspectRatio"])
	require.Equal(t, "4K", imageConfig["imageSize"])
}

func TestGeminiNativeImageHandlerConvertsToOpenAIImageResponse(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)

	info := &relaycommon.RelayInfo{
		RelayMode: relayconstant.RelayModeImagesGenerations,
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: "gemini-3-pro-image-preview",
		},
	}

	payload := dto.GeminiChatResponse{
		Candidates: []dto.GeminiChatCandidate{
			{
				Content: dto.GeminiChatContent{
					Role: "model",
					Parts: []dto.GeminiPart{
						{Text: "polished prompt"},
						{
							InlineData: &dto.GeminiInlineData{
								MimeType: "image/png",
								Data:     "ZmFrZQ==",
							},
						},
					},
				},
			},
		},
		UsageMetadata: dto.GeminiUsageMetadata{
			PromptTokenCount:     10,
			CandidatesTokenCount: 1400,
			TotalTokenCount:      1410,
		},
	}

	body, err := common.Marshal(payload)
	require.NoError(t, err)

	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(bytes.NewReader(body)),
	}

	usage, newAPIError := GeminiNativeImageHandler(c, info, resp)
	require.Nil(t, newAPIError)
	require.NotNil(t, usage)
	require.Equal(t, 10, usage.PromptTokens)
	require.Equal(t, 1400, usage.CompletionTokens)
	require.Equal(t, 1410, usage.TotalTokens)

	var imageResponse dto.ImageResponse
	err = common.Unmarshal(recorder.Body.Bytes(), &imageResponse)
	require.NoError(t, err)
	require.Len(t, imageResponse.Data, 1)
	require.Equal(t, "ZmFrZQ==", imageResponse.Data[0].B64Json)
	require.Equal(t, "polished prompt", imageResponse.Data[0].RevisedPrompt)
}
