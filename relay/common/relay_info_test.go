package common

import (
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
)

type testRelayRequest struct {
	dto.BaseRequest
	stream bool
}

func (r *testRelayRequest) IsStream(c *gin.Context) bool {
	return r.stream
}

func TestGenRelayInfoOpenAI_SetsIsStreamContextKey(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("stream request", func(t *testing.T) {
		ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
		ctx.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)
		common.SetContextKey(ctx, constant.ContextKeyUserId, 1)
		common.SetContextKey(ctx, constant.ContextKeyUsingGroup, "default")
		common.SetContextKey(ctx, constant.ContextKeyUserGroup, "default")
		common.SetContextKey(ctx, constant.ContextKeyTokenGroup, "default")

		info := GenRelayInfoOpenAI(ctx, &testRelayRequest{stream: true})
		if !info.IsStream {
			t.Fatalf("expected relay info to be stream")
		}
		if !common.GetContextKeyBool(ctx, constant.ContextKeyIsStream) {
			t.Fatalf("expected stream context key to be true")
		}
	})

	t.Run("non-stream request", func(t *testing.T) {
		ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
		ctx.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)
		common.SetContextKey(ctx, constant.ContextKeyUserId, 1)
		common.SetContextKey(ctx, constant.ContextKeyUsingGroup, "default")
		common.SetContextKey(ctx, constant.ContextKeyUserGroup, "default")
		common.SetContextKey(ctx, constant.ContextKeyTokenGroup, "default")

		info := GenRelayInfoOpenAI(ctx, &testRelayRequest{stream: false})
		if info.IsStream {
			t.Fatalf("expected relay info to be non-stream")
		}
		if common.GetContextKeyBool(ctx, constant.ContextKeyIsStream) {
			t.Fatalf("expected stream context key to be false")
		}
	})
}

func TestTestRelayRequestSatisfiesRequestInterface(t *testing.T) {
	var _ dto.Request = (*testRelayRequest)(nil)
	var _ *types.TokenCountMeta = (&testRelayRequest{}).GetTokenCountMeta()
}
