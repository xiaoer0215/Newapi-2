package service

import (
	"encoding/binary"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDetectHEIF(t *testing.T) {
	heicData := buildHEIFSample("heic", 640, 480)
	heifData := buildHEIFSample("mif1", 320, 240)

	require.Equal(t, "image/heic", detectHEIF(heicData))
	require.Equal(t, "image/heif", detectHEIF(heifData))
}

func TestParseHEIFDimensions(t *testing.T) {
	data := buildHEIFSample("heic", 640, 480)

	width, height, ok := parseHEIFDimensions(data)
	require.True(t, ok)
	require.Equal(t, 640, width)
	require.Equal(t, 480, height)

	config, format, err := decodeImageConfig(data)
	require.NoError(t, err)
	require.Equal(t, "heic", format)
	require.Equal(t, 640, config.Width)
	require.Equal(t, 480, config.Height)
}

func buildHEIFSample(brand string, width int, height int) []byte {
	ftyp := makeBox("ftyp", append([]byte(brand), append(make([]byte, 4), []byte(brand)...)...))

	ispeContent := make([]byte, 12)
	binary.BigEndian.PutUint32(ispeContent[4:8], uint32(width))
	binary.BigEndian.PutUint32(ispeContent[8:12], uint32(height))
	ispe := makeBox("ispe", ispeContent)
	ipco := makeBox("ipco", ispe)
	iprp := makeBox("iprp", ipco)
	meta := makeBox("meta", append(make([]byte, 4), iprp...))

	return append(ftyp, meta...)
}

func makeBox(boxType string, content []byte) []byte {
	box := make([]byte, 8+len(content))
	binary.BigEndian.PutUint32(box[0:4], uint32(len(box)))
	copy(box[4:8], []byte(boxType))
	copy(box[8:], content)
	return box
}
