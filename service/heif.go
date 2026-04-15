package service

import "encoding/binary"

// detectHEIF checks ISOBMFF magic bytes to detect HEIC/HEIF files.
// Returns "image/heic", "image/heif", or "" if not recognized.
func detectHEIF(data []byte) string {
	if len(data) < 12 {
		return ""
	}
	if string(data[4:8]) != "ftyp" {
		return ""
	}

	switch string(data[8:12]) {
	case "heic", "heix", "hevc", "hevx", "heim", "heis":
		return "image/heic"
	case "mif1", "msf1":
		return "image/heif"
	default:
		return ""
	}
}

func parseHEIFDimensions(data []byte) (int, int, bool) {
	size := len(data)
	if size < 12 {
		return 0, 0, false
	}

	offset := 0
	for offset+8 <= size {
		boxSize := int(binary.BigEndian.Uint32(data[offset : offset+4]))
		boxType := string(data[offset+4 : offset+8])
		headerLen := 8

		if boxSize == 1 {
			if offset+16 > size {
				break
			}
			boxSize = int(binary.BigEndian.Uint64(data[offset+8 : offset+16]))
			headerLen = 16
		} else if boxSize == 0 {
			boxSize = size - offset
		}

		if boxSize < headerLen || offset+boxSize > size {
			break
		}

		if boxType == "meta" {
			metaData := data[offset+headerLen : offset+boxSize]
			if len(metaData) < 4 {
				return 0, 0, false
			}
			return findISPE(metaData[4:])
		}

		offset += boxSize
	}

	return 0, 0, false
}

func findISPE(data []byte) (int, int, bool) {
	offset := 0
	size := len(data)
	for offset+8 <= size {
		boxSize := int(binary.BigEndian.Uint32(data[offset : offset+4]))
		boxType := string(data[offset+4 : offset+8])
		if boxSize < 8 || offset+boxSize > size {
			break
		}

		content := data[offset+8 : offset+boxSize]
		switch boxType {
		case "iprp", "ipco":
			if width, height, ok := findISPE(content); ok {
				return width, height, true
			}
		case "ispe":
			if len(content) >= 12 {
				width := int(binary.BigEndian.Uint32(content[4:8]))
				height := int(binary.BigEndian.Uint32(content[8:12]))
				if width > 0 && height > 0 {
					return width, height, true
				}
			}
		}

		offset += boxSize
	}

	return 0, 0, false
}
