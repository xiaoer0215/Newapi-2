package service

import (
	"testing"

	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/stretchr/testify/require"
)

func TestClaudeToOpenAIRequest_ConvertsDocumentToFile(t *testing.T) {
	request := dto.ClaudeRequest{
		Model: "claude-3-5-sonnet",
		Messages: []dto.ClaudeMessage{
			{
				Role: "user",
				Content: []dto.ClaudeMediaMessage{
					{
						Type: "document",
						Source: &dto.ClaudeMessageSource{
							Type:      "base64",
							MediaType: "application/pdf",
							Data:      "JVBERi0xLjQK",
						},
					},
				},
			},
		},
	}

	out, err := ClaudeToOpenAIRequest(request, &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{},
	})
	require.NoError(t, err)
	require.Len(t, out.Messages, 1)

	content := out.Messages[0].ParseContent()
	require.Len(t, content, 1)
	require.Equal(t, dto.ContentTypeFile, content[0].Type)
	file := content[0].GetFile()
	require.NotNil(t, file)
	require.Equal(t, "document.pdf", file.FileName)
	require.Equal(t, "data:application/pdf;base64,JVBERi0xLjQK", file.FileData)
}
