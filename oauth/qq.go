package oauth

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
)

func init() {
	Register("qq", &QQProvider{})
}

type QQProvider struct{}

const (
	qqOAuthModeOAuth2  = "oauth2"
	qqOAuthModeConnect = "connect"
)

type qqTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

type qqUserInfo struct {
	Code       int    `json:"code"`
	Msg        string `json:"msg"`
	Openid     string `json:"openid"`
	Unionid    string `json:"unionid"`
	Nickname   string `json:"nickname"`
	Headimgurl string `json:"figureurl_qq_1"`
}

type qqConnectLoginResponse struct {
	Code    int    `json:"code"`
	ErrCode int    `json:"errcode"`
	Msg     string `json:"msg"`
	URL     string `json:"url"`
}

type qqConnectCallbackResponse struct {
	Code        int    `json:"code"`
	ErrCode     int    `json:"errcode"`
	Msg         string `json:"msg"`
	Type        string `json:"type"`
	SocialUID   string `json:"social_uid"`
	AccessToken string `json:"access_token"`
	Nickname    string `json:"nickname"`
	Openid      string `json:"openid"`
	Unionid     string `json:"unionid"`
}

type qqConnectProbeResponse struct {
	Code    int    `json:"code"`
	ErrCode int    `json:"errcode"`
	Msg     string `json:"msg"`
}

func (p *QQProvider) GetName() string {
	return "QQ"
}

func (p *QQProvider) IsEnabled() bool {
	return common.QQOAuthEnabled
}

func (p *QQProvider) BuildAuthorizeURL(ctx context.Context, c *gin.Context, state string) (string, error) {
	if state == "" {
		return "", NewOAuthError(i18n.MsgOAuthStateInvalid, nil)
	}
	if strings.TrimSpace(common.QQClientId) == "" {
		return "", NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, "QQ Client ID is empty")
	}

	baseURL := getQQOAuthBaseURL()
	mode := detectQQOAuthMode(ctx, baseURL)
	redirectURI := getQQOAuthRedirectURI(c)

	logger.LogDebug(ctx, "[OAuth-QQ] BuildAuthorizeURL: mode=%s base=%s redirect=%s", mode, baseURL, redirectURI)

	if mode == qqOAuthModeConnect {
		return buildQQConnectAuthorizeURL(ctx, baseURL, state, redirectURI)
	}

	oauthURL, err := url.Parse(baseURL + "/oauth2/authorize")
	if err != nil {
		return "", NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, err.Error())
	}
	q := oauthURL.Query()
	q.Set("response_type", "code")
	q.Set("client_id", common.QQClientId)
	q.Set("redirect_uri", redirectURI)
	q.Set("scope", "get_user_info")
	q.Set("state", state)
	oauthURL.RawQuery = q.Encode()
	return oauthURL.String(), nil
}

func (p *QQProvider) ExchangeToken(ctx context.Context, code string, c *gin.Context) (*OAuthToken, error) {
	if code == "" {
		return nil, NewOAuthError(i18n.MsgOAuthInvalidCode, nil)
	}

	logger.LogDebug(ctx, "[OAuth-QQ] ExchangeToken: code=%s...", code[:min(len(code), 10)])

	baseURL := getQQOAuthBaseURL()
	mode := detectQQOAuthMode(ctx, baseURL)
	logger.LogDebug(ctx, "[OAuth-QQ] ExchangeToken: mode=%s base=%s", mode, baseURL)

	if mode == qqOAuthModeConnect {
		return p.exchangeConnectToken(ctx, baseURL, code)
	}
	return p.exchangeOAuth2Token(ctx, baseURL, code, c)
}

func (p *QQProvider) exchangeOAuth2Token(ctx context.Context, baseURL string, code string, c *gin.Context) (*OAuthToken, error) {
	tokenEndpoint := baseURL + "/v3/oauth2/token"
	redirectURI := getQQOAuthRedirectURI(c)

	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", common.QQClientId)
	data.Set("client_secret", common.QQClientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, err.Error())
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := getQQHTTPClient(10*time.Second, nil)
	response, err := client.Do(req)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-QQ] exchangeOAuth2Token request failed: endpoint=%s redirect=%s err=%s", tokenEndpoint, redirectURI, err.Error()))
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, err.Error())
	}
	defer response.Body.Close()

	var tokenResp qqTokenResponse
	if err = common.DecodeJson(response.Body, &tokenResp); err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-QQ] exchangeOAuth2Token decode failed: endpoint=%s err=%s", tokenEndpoint, err.Error()))
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthTokenFailed, map[string]any{"Provider": "QQ"}, err.Error())
	}
	if tokenResp.AccessToken == "" {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-QQ] exchangeOAuth2Token empty access token: endpoint=%s", tokenEndpoint))
		return nil, NewOAuthError(i18n.MsgOAuthTokenFailed, map[string]any{"Provider": "QQ"})
	}

	return &OAuthToken{AccessToken: tokenResp.AccessToken, TokenType: tokenResp.TokenType}, nil
}

func (p *QQProvider) exchangeConnectToken(ctx context.Context, baseURL string, code string) (*OAuthToken, error) {
	if strings.TrimSpace(common.QQClientSecret) == "" {
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, "QQ Client Secret is empty")
	}

	callbackEndpoint := baseURL + "/connect.php"
	params := url.Values{}
	params.Set("act", "callback")
	params.Set("appid", common.QQClientId)
	params.Set("appkey", common.QQClientSecret)
	params.Set("code", code)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, callbackEndpoint+"?"+params.Encode(), nil)
	if err != nil {
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, err.Error())
	}

	client := getQQHTTPClient(10*time.Second, nil)
	response, err := client.Do(req)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-QQ] exchangeConnectToken request failed: endpoint=%s err=%s", callbackEndpoint, err.Error()))
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, err.Error())
	}
	defer response.Body.Close()

	var callbackResp qqConnectCallbackResponse
	rawBody, err := decodeQQResponseBody(response, &callbackResp)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-QQ] exchangeConnectToken decode failed: endpoint=%s err=%s body=%s", callbackEndpoint, err.Error(), rawBody))
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthTokenFailed, map[string]any{"Provider": "QQ"}, err.Error()+": "+rawBody)
	}
	if callbackResp.Code != 0 {
		msg := callbackResp.Msg
		if callbackResp.ErrCode != 0 {
			msg = fmt.Sprintf("errcode=%d, msg=%s", callbackResp.ErrCode, msg)
		}
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthTokenFailed, map[string]any{"Provider": "QQ"}, msg)
	}

	userID := callbackResp.SocialUID
	if userID == "" {
		userID = callbackResp.Unionid
	}
	if userID == "" {
		userID = callbackResp.Openid
	}
	if userID == "" {
		return nil, NewOAuthError(i18n.MsgOAuthUserInfoEmpty, map[string]any{"Provider": "QQ"})
	}

	return &OAuthToken{
		AccessToken:    callbackResp.AccessToken,
		TokenType:      qqOAuthModeConnect,
		ProviderUserID: userID,
		DisplayName:    callbackResp.Nickname,
		Username:       userID,
	}, nil
}

func (p *QQProvider) GetUserInfo(ctx context.Context, token *OAuthToken) (*OAuthUser, error) {
	if token != nil && token.TokenType == qqOAuthModeConnect {
		providerUserID := strings.TrimSpace(token.ProviderUserID)
		if providerUserID == "" {
			return nil, NewOAuthError(i18n.MsgOAuthUserInfoEmpty, map[string]any{"Provider": "QQ"})
		}
		username := strings.TrimSpace(token.Username)
		if username == "" {
			username = providerUserID
		}
		displayName := strings.TrimSpace(token.DisplayName)
		if displayName == "" {
			displayName = username
		}
		return &OAuthUser{
			ProviderUserID: providerUserID,
			Username:       username,
			DisplayName:    displayName,
		}, nil
	}

	baseURL := getQQOAuthBaseURL()
	userInfoEndpoint := baseURL + "/v3/user/me"

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, userInfoEndpoint, nil)
	if err != nil {
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, err.Error())
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	client := getQQHTTPClient(10*time.Second, nil)
	response, err := client.Do(req)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-QQ] GetUserInfo request failed: endpoint=%s err=%s", userInfoEndpoint, err.Error()))
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, err.Error())
	}
	defer response.Body.Close()

	var userInfo qqUserInfo
	if err = common.DecodeJson(response.Body, &userInfo); err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-QQ] GetUserInfo decode failed: endpoint=%s err=%s", userInfoEndpoint, err.Error()))
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthUserInfoEmpty, map[string]any{"Provider": "QQ"}, err.Error())
	}

	userID := userInfo.Unionid
	if userID == "" {
		userID = userInfo.Openid
	}
	if userID == "" {
		return nil, NewOAuthError(i18n.MsgOAuthUserInfoEmpty, map[string]any{"Provider": "QQ"})
	}

	return &OAuthUser{
		ProviderUserID: userID,
		Username:       userID,
		DisplayName:    strings.TrimSpace(userInfo.Nickname),
	}, nil
}

func (p *QQProvider) IsUserIDTaken(providerUserID string) bool {
	return model.IsQQIdAlreadyTaken(providerUserID)
}

func (p *QQProvider) FillUserByProviderID(user *model.User, providerUserID string) error {
	user.QQId = providerUserID
	return user.FillUserByQQId()
}

func (p *QQProvider) SetProviderUserID(user *model.User, providerUserID string) {
	user.QQId = providerUserID
}

func (p *QQProvider) GetProviderPrefix() string {
	return "qq_"
}

func getQQOAuthBaseURL() string {
	baseURL := strings.TrimSpace(common.QQOAuthBaseURL)
	if baseURL == "" {
		baseURL = common.GetEnvOrDefaultString("QQ_OAUTH_BASE_URL", "https://connect.qq.com")
	}
	return strings.TrimRight(baseURL, "/")
}

func detectQQOAuthMode(ctx context.Context, baseURL string) string {
	parsedURL, err := url.Parse(baseURL)
	if err == nil && strings.EqualFold(parsedURL.Hostname(), "connect.qq.com") {
		return qqOAuthModeOAuth2
	}
	if probeQQConnectMode(ctx, baseURL) {
		return qqOAuthModeConnect
	}
	return qqOAuthModeOAuth2
}

func probeQQConnectMode(ctx context.Context, baseURL string) bool {
	endpoint := baseURL + "/connect.php"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return false
	}

	client := getQQHTTPClient(5*time.Second, func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	})
	resp, err := client.Do(req)
	if err != nil {
		logger.LogWarn(ctx, fmt.Sprintf("[OAuth-QQ] probeQQConnectMode failed: endpoint=%s err=%s", endpoint, err.Error()))
		return false
	}
	defer resp.Body.Close()

	var probeResp qqConnectProbeResponse
	_, err = decodeQQResponseBody(resp, &probeResp)
	if err != nil {
		return false
	}
	if probeResp.ErrCode == 101 {
		return true
	}
	msg := strings.ToLower(probeResp.Msg)
	return strings.Contains(msg, "no act")
}

func buildQQConnectAuthorizeURL(ctx context.Context, baseURL string, state string, redirectURI string) (string, error) {
	if strings.TrimSpace(common.QQClientSecret) == "" {
		return "", NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, "QQ Client Secret is empty")
	}

	loginEndpoint := baseURL + "/connect.php"
	params := url.Values{}
	params.Set("act", "login")
	params.Set("appid", common.QQClientId)
	params.Set("appkey", common.QQClientSecret)
	params.Set("type", "qq")
	params.Set("redirect_uri", redirectURI)
	params.Set("state", state)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, loginEndpoint+"?"+params.Encode(), nil)
	if err != nil {
		return "", NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, err.Error())
	}

	client := getQQHTTPClient(10*time.Second, func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	})
	resp, err := client.Do(req)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-QQ] buildQQConnectAuthorizeURL request failed: endpoint=%s redirect=%s err=%s", loginEndpoint, redirectURI, err.Error()))
		return "", NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, err.Error())
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 && resp.StatusCode < 400 {
		location := strings.TrimSpace(resp.Header.Get("Location"))
		if location != "" {
			return location, nil
		}
	}

	var loginResp qqConnectLoginResponse
	rawBody, err := decodeQQResponseBody(resp, &loginResp)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-QQ] buildQQConnectAuthorizeURL decode failed: endpoint=%s err=%s body=%s", loginEndpoint, err.Error(), rawBody))
		return "", NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, err.Error()+": "+rawBody)
	}
	if loginResp.Code != 0 {
		msg := loginResp.Msg
		if loginResp.ErrCode != 0 {
			msg = fmt.Sprintf("errcode=%d, msg=%s", loginResp.ErrCode, msg)
		}
		return "", NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, msg)
	}
	if strings.TrimSpace(loginResp.URL) == "" {
		return "", NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "QQ"}, "empty login redirect url")
	}
	return loginResp.URL, nil
}

func decodeQQResponseBody(response *http.Response, target any) (string, error) {
	body, err := io.ReadAll(response.Body)
	if err != nil {
		return "", err
	}
	if len(body) == 0 {
		return "", errors.New("empty response body")
	}
	err = common.Unmarshal(body, target)
	return string(body), err
}

func getQQHTTPClient(timeout time.Duration, checkRedirect func(req *http.Request, via []*http.Request) error) *http.Client {
	baseClient := service.GetHttpClient()
	if baseClient == nil {
		return &http.Client{
			Timeout:       timeout,
			CheckRedirect: checkRedirect,
		}
	}

	client := *baseClient
	if timeout > 0 {
		client.Timeout = timeout
	}
	client.CheckRedirect = checkRedirect
	return &client
}

func getQQOAuthRedirectURI(c *gin.Context) string {
	serverAddress := strings.TrimSpace(system_setting.ServerAddress)
	if serverAddress != "" {
		return fmt.Sprintf("%s/oauth/qq", strings.TrimRight(serverAddress, "/"))
	}

	scheme := "http"
	if c.Request.TLS != nil || strings.EqualFold(strings.TrimSpace(c.GetHeader("X-Forwarded-Proto")), "https") {
		scheme = "https"
	}
	host := strings.TrimSpace(c.GetHeader("X-Forwarded-Host"))
	if host == "" {
		host = c.Request.Host
	}
	return fmt.Sprintf("%s://%s/oauth/qq", scheme, host)
}
