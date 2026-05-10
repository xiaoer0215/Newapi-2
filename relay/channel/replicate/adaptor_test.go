package replicate

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMapOpenAISizeToFluxUsesCustomDimensionsFor4K(t *testing.T) {
	t.Parallel()

	aspect, width, height, ok := mapOpenAISizeToFlux("4096x2304")

	require.True(t, ok)
	require.Equal(t, "custom", aspect)
	require.Equal(t, 4096, width)
	require.Equal(t, 2304, height)
}

func TestMapOpenAISizeToFluxKeepsLegacy1KAspectRatio(t *testing.T) {
	t.Parallel()

	aspect, width, height, ok := mapOpenAISizeToFlux("1792x1024")

	require.True(t, ok)
	require.Equal(t, "16:9", aspect)
	require.Zero(t, width)
	require.Zero(t, height)
}
