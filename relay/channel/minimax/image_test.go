package minimax

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/stretchr/testify/require"
)

func TestOAIImage2MiniMaxImageRequest(t *testing.T) {
	n := uint(2)
	watermark := true
	request := dto.ImageRequest{
		Prompt:         "draw a cat",
		ResponseFormat: "b64_json",
		Size:           "1024x1792",
		N:              &n,
		Watermark:      &watermark,
		Extra: map[string]json.RawMessage{
			"prompt_optimizer": []byte("true"),
		},
	}

	minimaxRequest := oaiImage2MiniMaxImageRequest(request)
	require.Equal(t, "image-01", minimaxRequest.Model)
	require.Equal(t, "draw a cat", minimaxRequest.Prompt)
	require.Equal(t, "base64", minimaxRequest.ResponseFormat)
	require.Equal(t, "9:16", minimaxRequest.AspectRatio)
	require.Equal(t, 2, minimaxRequest.N)
	require.NotNil(t, minimaxRequest.AigcWatermark)
	require.True(t, *minimaxRequest.AigcWatermark)
	require.NotNil(t, minimaxRequest.PromptOptimizer)
	require.True(t, *minimaxRequest.PromptOptimizer)
}

func TestResponseMiniMax2OpenAIImage(t *testing.T) {
	resp := &MiniMaxImageResponse{
		Metadata: map[string]any{
			"seed": 123,
		},
	}
	resp.Data.ImageURLs = []string{"https://example.com/a.png"}
	resp.Data.ImageBase64 = []string{"YmFzZTY0"}

	out, err := responseMiniMax2OpenAIImage(resp, &relaycommon.RelayInfo{StartTime: time.Unix(100, 0)})
	require.NoError(t, err)
	require.EqualValues(t, 100, out.Created)
	require.Len(t, out.Data, 2)
	require.Equal(t, "https://example.com/a.png", out.Data[0].Url)
	require.Equal(t, "YmFzZTY0", out.Data[1].B64Json)
	require.NotEmpty(t, out.Metadata)
}
