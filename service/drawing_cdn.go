package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const (
	maxDrawingCDNUploadBytes  = 15 * 1024 * 1024
	defaultDrawingCDNFilename = "drawing.png"
	drawingCDNFastestMode     = "fastest"
)

const defaultDrawingCDNProviders = "skyimg,litterbox_72h,scdn_cn,scdn_edgeone,scdn_anycast,tuchuang_xqd,wzapi_360"

var unsafeDrawingFilenameChars = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

type DrawingCDNUploadResult struct {
	URL      string `json:"url"`
	Provider string `json:"provider"`
	Elapsed  int64  `json:"elapsed_ms"`
}

type drawingCDNProvider struct {
	ID       string
	Name     string
	MaxBytes int
	Upload   func(ctx context.Context, client *http.Client, data []byte, filename string, mimeType string) (string, error)
}

type formField struct {
	name     string
	filename string
	data     []byte
}

var drawingCDNProviderRegistry = map[string]drawingCDNProvider{
	"skyimg": {
		ID:       "skyimg",
		Name:     "SKY Image",
		MaxBytes: maxDrawingCDNUploadBytes,
		Upload: func(ctx context.Context, client *http.Client, data []byte, filename string, mimeType string) (string, error) {
			return uploadMultipartJSONURL(ctx, client, "https://skyimg.net/api/upload", []formField{{name: "file", filename: filename, data: data}}, nil, []string{"url", "data.url"})
		},
	},
	"litterbox_72h": {
		ID:       "litterbox_72h",
		Name:     "Litterbox 72h",
		MaxBytes: maxDrawingCDNUploadBytes,
		Upload: func(ctx context.Context, client *http.Client, data []byte, filename string, mimeType string) (string, error) {
			return uploadMultipartTextURL(ctx, client, "https://litterbox.catbox.moe/resources/internals/api.php", []formField{{name: "fileToUpload", filename: filename, data: data}}, map[string]string{"reqtype": "fileupload", "time": "72h"})
		},
	},
	"scdn_cn": {
		ID:       "scdn_cn",
		Name:     "SCDN CN优选",
		MaxBytes: maxDrawingCDNUploadBytes,
		Upload: func(ctx context.Context, client *http.Client, data []byte, filename string, mimeType string) (string, error) {
			return uploadSCDN(ctx, client, data, filename, "cloudflarecnimg.scdn.io")
		},
	},
	"scdn_edgeone": {
		ID:       "scdn_edgeone",
		Name:     "SCDN EdgeOne",
		MaxBytes: maxDrawingCDNUploadBytes,
		Upload: func(ctx context.Context, client *http.Client, data []byte, filename string, mimeType string) (string, error) {
			return uploadSCDN(ctx, client, data, filename, "edgeoneimg.cdn.sn")
		},
	},
	"scdn_anycast": {
		ID:       "scdn_anycast",
		Name:     "SCDN Anycast",
		MaxBytes: maxDrawingCDNUploadBytes,
		Upload: func(ctx context.Context, client *http.Client, data []byte, filename string, mimeType string) (string, error) {
			return uploadSCDN(ctx, client, data, filename, "anycastimg.scdn.io")
		},
	},
	"tuchuang_xqd": {
		ID:       "tuchuang_xqd",
		Name:     "是图床 游客",
		MaxBytes: maxDrawingCDNUploadBytes,
		Upload: func(ctx context.Context, client *http.Client, data []byte, filename string, mimeType string) (string, error) {
			return uploadMultipartJSONURL(ctx, client, "https://tuchuang.xqd.cn/api/upload", []formField{{name: "image", filename: filename, data: data}}, nil, []string{"data.url", "url"})
		},
	},
	"wzapi_360": {
		ID:       "wzapi_360",
		Name:     "360图床",
		MaxBytes: 1 * 1024 * 1024,
		Upload: func(ctx context.Context, client *http.Client, data []byte, filename string, mimeType string) (string, error) {
			return uploadMultipartJSONURL(ctx, client, "https://wzapi.com/api/360tc", []formField{{name: "file", filename: filename, data: data}}, nil, []string{"data.url", "url"})
		},
	},
}

func UploadDrawingImageToFreeCDN(ctx context.Context, imageData string, filename string) (string, error) {
	result, err := UploadDrawingImageToConfiguredCDN(ctx, imageData, filename)
	if err != nil {
		return "", err
	}
	return result.URL, nil
}

func UploadDrawingImageToConfiguredCDN(ctx context.Context, imageData string, filename string) (*DrawingCDNUploadResult, error) {
	data, mimeType, err := ResolveDrawingImageData(ctx, imageData)
	if err != nil {
		return nil, err
	}
	if len(data) == 0 {
		return nil, errors.New("图片内容为空")
	}
	if len(data) > maxDrawingCDNUploadBytes {
		return nil, fmt.Errorf("图片超过免费图床上传限制（最大 %dMB）", maxDrawingCDNUploadBytes/1024/1024)
	}

	filename = normalizeDrawingFilename(filename, mimeType)
	providers := resolveDrawingCDNProviders()
	if len(providers) == 0 {
		return nil, errors.New("没有启用可用的图床")
	}

	mode := strings.TrimSpace(common.OptionMap["DrawingCDNMode"])
	if mode == "" {
		mode = drawingCDNFastestMode
	}
	if mode != drawingCDNFastestMode {
		if provider, ok := drawingCDNProviderRegistry[mode]; ok {
			return uploadWithProvider(ctx, provider, data, filename, mimeType)
		}
	}
	return uploadFastestDrawingCDN(ctx, providers, data, filename, mimeType)
}

func resolveDrawingCDNProviders() []drawingCDNProvider {
	raw := strings.TrimSpace(common.OptionMap["DrawingCDNProviders"])
	if raw == "" {
		raw = defaultDrawingCDNProviders
	}
	ids := strings.Split(raw, ",")
	providers := make([]drawingCDNProvider, 0, len(ids))
	seen := make(map[string]bool)
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] {
			continue
		}
		if provider, ok := drawingCDNProviderRegistry[id]; ok {
			providers = append(providers, provider)
			seen[id] = true
		}
	}
	return providers
}

func uploadFastestDrawingCDN(ctx context.Context, providers []drawingCDNProvider, data []byte, filename string, mimeType string) (*DrawingCDNUploadResult, error) {
	type providerResult struct {
		result *DrawingCDNUploadResult
		err    error
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	resultCh := make(chan providerResult, len(providers))
	var wg sync.WaitGroup
	for _, provider := range providers {
		provider := provider
		wg.Add(1)
		go func() {
			defer wg.Done()
			result, err := uploadWithProvider(ctx, provider, data, filename, mimeType)
			select {
			case resultCh <- providerResult{result: result, err: err}:
			case <-ctx.Done():
			}
		}()
	}
	go func() {
		wg.Wait()
		close(resultCh)
	}()

	errorsText := make([]string, 0, len(providers))
	for item := range resultCh {
		if item.err == nil && item.result != nil && item.result.URL != "" {
			cancel()
			return item.result, nil
		}
		if item.err != nil {
			errorsText = append(errorsText, item.err.Error())
		}
	}
	sort.Strings(errorsText)
	return nil, fmt.Errorf("所有图床上传失败: %s", strings.Join(errorsText, "; "))
}

func uploadWithProvider(ctx context.Context, provider drawingCDNProvider, data []byte, filename string, mimeType string) (*DrawingCDNUploadResult, error) {
	if provider.MaxBytes > 0 && len(data) > provider.MaxBytes {
		return nil, fmt.Errorf("%s: 图片超过限制（最大 %dMB）", provider.Name, provider.MaxBytes/1024/1024)
	}
	uploadCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	client := GetHttpClient()
	if client == nil {
		client = http.DefaultClient
	}
	started := time.Now()
	url, err := provider.Upload(uploadCtx, client, data, filename, mimeType)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", provider.Name, err)
	}
	url = strings.TrimSpace(url)
	if !strings.HasPrefix(strings.ToLower(url), "http://") && !strings.HasPrefix(strings.ToLower(url), "https://") {
		return nil, fmt.Errorf("%s: 未返回有效 URL: %s", provider.Name, url)
	}
	return &DrawingCDNUploadResult{URL: url, Provider: provider.ID, Elapsed: time.Since(started).Milliseconds()}, nil
}

func uploadSCDN(ctx context.Context, client *http.Client, data []byte, filename string, domain string) (string, error) {
	return uploadMultipartJSONURL(ctx, client, "https://img.scdn.io/api/v1.php", []formField{{name: "image", filename: filename, data: data}}, map[string]string{"outputFormat": "auto", "cdn_domain": domain}, []string{"url", "data.url"})
}

func uploadMultipartTextURL(ctx context.Context, client *http.Client, target string, files []formField, fields map[string]string) (string, error) {
	respBody, status, err := postMultipart(ctx, client, target, files, fields)
	if err != nil {
		return "", err
	}
	result := strings.TrimSpace(string(respBody))
	if status < 200 || status >= 300 {
		return "", fmt.Errorf("HTTP %d %s", status, result)
	}
	if !strings.HasPrefix(strings.ToLower(result), "http") {
		return "", fmt.Errorf("返回异常: %s", result)
	}
	return result, nil
}

func uploadMultipartJSONURL(ctx context.Context, client *http.Client, target string, files []formField, fields map[string]string, paths []string) (string, error) {
	respBody, status, err := postMultipart(ctx, client, target, files, fields)
	if err != nil {
		return "", err
	}
	if status < 200 || status >= 300 {
		return "", fmt.Errorf("HTTP %d %s", status, strings.TrimSpace(string(respBody)))
	}
	var payload any
	if err = common.Unmarshal(respBody, &payload); err != nil {
		return "", fmt.Errorf("解析响应失败: %w; body=%s", err, strings.TrimSpace(string(respBody)))
	}
	for _, path := range paths {
		if value := getNestedString(payload, path); value != "" {
			return value, nil
		}
	}
	return "", fmt.Errorf("响应未包含图片 URL: %s", strings.TrimSpace(string(respBody)))
}

func postMultipart(ctx context.Context, client *http.Client, target string, files []formField, fields map[string]string) ([]byte, int, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			return nil, 0, err
		}
	}
	for _, file := range files {
		part, err := writer.CreateFormFile(file.name, file.filename)
		if err != nil {
			return nil, 0, err
		}
		if _, err = part.Write(file.data); err != nil {
			return nil, 0, err
		}
	}
	if err := writer.Close(); err != nil {
		return nil, 0, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, target, &body)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("User-Agent", "new-api drawing cdn uploader")
	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 8192))
	if err != nil {
		return nil, resp.StatusCode, err
	}
	return respBody, resp.StatusCode, nil
}

func getNestedString(payload any, path string) string {
	current := payload
	for _, part := range strings.Split(path, ".") {
		switch value := current.(type) {
		case map[string]any:
			current = value[part]
		case []any:
			if len(value) == 0 {
				return ""
			}
			current = value[0]
			if part != "" {
				if m, ok := current.(map[string]any); ok {
					current = m[part]
				} else {
					return ""
				}
			}
		default:
			return ""
		}
	}
	if s, ok := current.(string); ok {
		return strings.TrimSpace(s)
	}
	return ""
}
func ResolveDrawingImageAsBase64(ctx context.Context, imageData string) (string, string, int, error) {
	data, mimeType, err := ResolveDrawingImageData(ctx, imageData)
	if err != nil {
		return "", "", 0, err
	}
	return base64.StdEncoding.EncodeToString(data), mimeType, len(data), nil
}

func ResolveDrawingImageData(ctx context.Context, imageData string) ([]byte, string, error) {
	imageData = strings.TrimSpace(imageData)
	if imageData == "" {
		return nil, "", errors.New("图片内容为空")
	}
	if strings.HasPrefix(strings.ToLower(imageData), "http://") ||
		strings.HasPrefix(strings.ToLower(imageData), "https://") {
		return downloadDrawingImageData(ctx, imageData)
	}

	mimeType := ""
	base64Data := imageData
	if strings.HasPrefix(strings.ToLower(imageData), "data:") {
		comma := strings.Index(imageData, ",")
		if comma < 0 {
			return nil, "", errors.New("无效的 data URL 图片")
		}
		header := imageData[:comma]
		base64Data = imageData[comma+1:]
		if !strings.Contains(strings.ToLower(header), ";base64") {
			return nil, "", errors.New("data URL 图片必须为 base64 编码")
		}
		mimeType = strings.TrimPrefix(strings.Split(header, ";")[0], "data:")
	}

	base64Data = strings.Map(func(r rune) rune {
		switch r {
		case '\r', '\n', '\t', ' ':
			return -1
		default:
			return r
		}
	}, base64Data)
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return nil, "", fmt.Errorf("图片 base64 解码失败: %w", err)
	}
	if mimeType == "" {
		mimeType = http.DetectContentType(data)
	}
	if !strings.HasPrefix(strings.ToLower(mimeType), "image/") {
		return nil, "", fmt.Errorf("仅支持图片上传，当前类型: %s", mimeType)
	}
	return data, mimeType, nil
}

func downloadDrawingImageData(ctx context.Context, imageURL string) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("User-Agent", "new-api drawing image resolver")
	req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")

	client := GetHttpClient()
	if client == nil {
		client = http.DefaultClient
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("下载上游图片失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, "", fmt.Errorf("上游图片返回异常: HTTP %d", resp.StatusCode)
	}

	data, err := io.ReadAll(io.LimitReader(resp.Body, maxDrawingCDNUploadBytes+1))
	if err != nil {
		return nil, "", err
	}
	if len(data) == 0 {
		return nil, "", errors.New("图片内容为空")
	}
	if len(data) > maxDrawingCDNUploadBytes {
		return nil, "", fmt.Errorf("图片超过免费 CDN 上传限制（最大 %dMB）", maxDrawingCDNUploadBytes/1024/1024)
	}

	mimeType := strings.TrimSpace(strings.Split(resp.Header.Get("Content-Type"), ";")[0])
	if mimeType == "" || !strings.HasPrefix(strings.ToLower(mimeType), "image/") {
		mimeType = http.DetectContentType(data)
	}
	if !strings.HasPrefix(strings.ToLower(mimeType), "image/") {
		return nil, "", fmt.Errorf("仅支持图片上传，当前类型: %s", mimeType)
	}
	return data, mimeType, nil
}

func normalizeDrawingFilename(filename string, mimeType string) string {
	filename = strings.TrimSpace(filepath.Base(filename))
	if filename == "." || filename == string(filepath.Separator) || filename == "" {
		filename = defaultDrawingCDNFilename
	}
	filename = unsafeDrawingFilenameChars.ReplaceAllString(filename, "-")
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" {
		switch strings.ToLower(mimeType) {
		case "image/jpeg", "image/jpg":
			filename += ".jpg"
		case "image/webp":
			filename += ".webp"
		case "image/gif":
			filename += ".gif"
		default:
			filename += ".png"
		}
	}
	return filename
}
