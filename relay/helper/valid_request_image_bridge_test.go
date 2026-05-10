package helper

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/dto"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetAndValidateRequest_BridgesChatCompletionsImageModel(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)

	body := `{
		"model":"gpt-image-1",
		"messages":[
			{"role":"system","content":"follow the style guide"},
			{"role":"user","content":"draw a cat on the moon"}
		],
		"n":2,
		"size":"1024x1024",
		"quality":"high",
		"watermark":false
	}`

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")

	request, err := GetAndValidateRequest(ctx, types.RelayFormatOpenAI)
	require.NoError(t, err)

	imageRequest, ok := request.(*dto.ImageRequest)
	require.True(t, ok)
	require.Equal(t, "gpt-image-1", imageRequest.Model)
	require.Equal(t, "system: follow the style guide\n\ndraw a cat on the moon", imageRequest.Prompt)
	require.Equal(t, "1024x1024", imageRequest.Size)
	require.Equal(t, "high", imageRequest.Quality)
	require.NotNil(t, imageRequest.N)
	require.Equal(t, uint(2), *imageRequest.N)
	require.NotNil(t, imageRequest.Watermark)
	require.False(t, *imageRequest.Watermark)
}

func TestGetAndValidateTextRequest_AllowsPromptOnlyForImageChatCompletions(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)

	body := `{
		"model":"gpt-image-1",
		"prompt":"draw a glass castle in the clouds"
	}`

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")

	request, err := GetAndValidateTextRequest(ctx, relayconstant.RelayModeChatCompletions)
	require.NoError(t, err)
	require.Equal(t, "gpt-image-1", request.Model)
}

func TestGetAndValidOpenAIImageRequest_DefaultsGPTImageSeriesQuality(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)

	body := `{
		"model":"gpt-image-2",
		"prompt":"draw a concept car in a rainy studio",
		"size":"1024x1024"
	}`

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", strings.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")

	request, err := GetAndValidOpenAIImageRequest(ctx, relayconstant.RelayModeImagesGenerations)
	require.NoError(t, err)
	require.Equal(t, "gpt-image-2", request.Model)
	require.Equal(t, "auto", request.Quality)
	require.NotNil(t, request.N)
	require.Equal(t, uint(1), *request.N)
}
