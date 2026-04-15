package openai

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestOpenaiHandlerKeepsInputOutputUsageWithoutFallbackEstimate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	info := &relaycommon.RelayInfo{
		RelayFormat: types.RelayFormatOpenAI,
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: "gpt-4.1",
		},
	}
	info.SetEstimatePromptTokens(999)

	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body: io.NopCloser(strings.NewReader(`{
			"id":"chatcmpl-test",
			"object":"chat.completion",
			"created":1710000000,
			"model":"gpt-4.1",
			"choices":[
				{
					"index":0,
					"message":{"role":"assistant","content":"ok"},
					"finish_reason":"stop"
				}
			],
			"usage":{
				"input_tokens":1200,
				"output_tokens":80,
				"total_tokens":1280,
				"input_tokens_details":{"cached_tokens":900}
			}
		}`)),
	}

	usage, apiErr := OpenaiHandler(c, info, resp)

	require.Nil(t, apiErr)
	require.NotNil(t, usage)
	require.Equal(t, 1200, usage.PromptTokens)
	require.Equal(t, 80, usage.CompletionTokens)
	require.Equal(t, 1280, usage.TotalTokens)
	require.Equal(t, 900, usage.PromptTokensDetails.CachedTokens)
}
