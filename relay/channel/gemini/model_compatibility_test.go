package gemini

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/stretchr/testify/require"
)

func TestApplyGeminiRequestModelCompatibilityKeepsModelForProxy(t *testing.T) {
	t.Parallel()

	request := &dto.GeminiChatRequest{}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelBaseUrl:    "http://43.251.226.69:41388",
			UpstreamModelName: "gemini-3.1-flash-image-preview",
		},
	}

	ApplyGeminiRequestModelCompatibility(request, info)

	require.Equal(t, "gemini-3.1-flash-image-preview", request.Model)
}

func TestApplyGeminiRequestModelCompatibilityStripsModelForOfficialGemini(t *testing.T) {
	t.Parallel()

	request := &dto.GeminiChatRequest{Model: "gemini-3.1-flash-image-preview"}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelBaseUrl:    "https://generativelanguage.googleapis.com",
			UpstreamModelName: "gemini-3.1-flash-image-preview",
		},
	}

	ApplyGeminiRequestModelCompatibility(request, info)

	require.Empty(t, request.Model)
}

func TestEnsureGeminiRequestBodyModelAddsModelForProxy(t *testing.T) {
	t.Parallel()

	rawBody := []byte(`{"contents":[{"role":"user","parts":[{"text":"hello"}]}]}`)
	patchedBody, err := EnsureGeminiRequestBodyModel(rawBody, "gemini-3.1-flash-image-preview", "http://43.251.226.69:41388")
	require.NoError(t, err)

	var payload map[string]any
	err = common.Unmarshal(patchedBody, &payload)
	require.NoError(t, err)
	require.Equal(t, "gemini-3.1-flash-image-preview", payload["model"])
}

func TestEnsureGeminiRequestBodyModelSkipsOfficialGemini(t *testing.T) {
	t.Parallel()

	rawBody := []byte(`{"contents":[{"role":"user","parts":[{"text":"hello"}]}]}`)
	patchedBody, err := EnsureGeminiRequestBodyModel(rawBody, "gemini-3.1-flash-image-preview", "https://generativelanguage.googleapis.com")
	require.NoError(t, err)
	require.JSONEq(t, string(rawBody), string(patchedBody))
}
