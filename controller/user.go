package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"

	"github.com/QuantumNous/new-api/constant"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

const invalidUsernameMessage = "账号仅支持英文、数字、下划线，或邮箱地址"

func normalizeUsername(username string) string {
	return strings.TrimSpace(username)
}

func validateRequiredUsername(c *gin.Context, username string) bool {
	if username == "" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return false
	}
	if !common.IsValidUsername(username) {
		common.ApiErrorMsg(c, invalidUsernameMessage)
		return false
	}
	return true
}

func validateOptionalUsername(c *gin.Context, username string) bool {
	if username == "" {
		return true
	}
	if !common.IsValidUsername(username) {
		common.ApiErrorMsg(c, invalidUsernameMessage)
		return false
	}
	return true
}

func ensureUsernameAvailable(c *gin.Context, username string, excludeUserId int) bool {
	if username == "" {
		return true
	}
	query := model.DB.Unscoped().Model(&model.User{})
	if common.IsValidEmail(username) {
		query = query.Where("username = ? OR email = ?", username, username)
	} else {
		query = query.Where("username = ?", username)
	}
	if excludeUserId > 0 {
		query = query.Where("id <> ?", excludeUserId)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		common.ApiErrorI18n(c, i18n.MsgDatabaseError)
		common.SysLog(fmt.Sprintf("check username availability failed: %v", err))
		return false
	}
	if count > 0 {
		common.ApiErrorI18n(c, i18n.MsgUserExists)
		return false
	}
	return true
}

func Login(c *gin.Context) {
	if !common.PasswordLoginEnabled {
		common.ApiErrorI18n(c, i18n.MsgUserPasswordLoginDisabled)
		return
	}
	var loginRequest LoginRequest
	err := json.NewDecoder(c.Request.Body).Decode(&loginRequest)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	username := loginRequest.Username
	password := loginRequest.Password
	if username == "" || password == "" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	user := model.User{
		Username: username,
		Password: password,
	}
	err = user.ValidateAndFill()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": err.Error(),
			"success": false,
		})
		return
	}

	// Check whether 2FA is enabled.
	if model.IsTwoFAEnabled(user.Id) {
		// Store a pending session until 2FA verification succeeds.
		session := sessions.Default(c)
		session.Set("pending_username", user.Username)
		session.Set("pending_user_id", user.Id)
		err := session.Save()
		if err != nil {
			common.ApiErrorI18n(c, i18n.MsgUserSessionSaveFailed)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": i18n.T(c, i18n.MsgUserRequire2FA),
			"success": true,
			"data": map[string]interface{}{
				"require_2fa": true,
			},
		})
		return
	}

	setupLogin(&user, c)
}

// setup session & cookies and then return user info
func setupLogin(user *model.User, c *gin.Context) {
	session := sessions.Default(c)
	session.Set("id", user.Id)
	session.Set("username", user.Username)
	session.Set("role", user.Role)
	session.Set("status", user.Status)
	session.Set("group", user.Group)
	err := session.Save()
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserSessionSaveFailed)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "",
		"success": true,
		"data": map[string]any{
			"id":                    user.Id,
			"username":              user.Username,
			"display_name":          user.DisplayName,
			"role":                  user.Role,
			"status":                user.Status,
			"email":                 user.Email,
			"qq_id":                 user.QQId,
			"require_email_bind":    shouldRequireEmailBind(user),
			"require_account_setup": shouldRequireAccountSetup(user),
			"group":                 user.Group,
		},
	})
}

func shouldRequireEmailBind(user *model.User) bool {
	return false
}

func shouldRequireAccountSetup(user *model.User) bool {
	if user == nil {
		return false
	}
	return strings.TrimSpace(user.QQId) != "" &&
		strings.TrimSpace(user.Password) == ""
}

func Logout(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	err := session.Save()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": err.Error(),
			"success": false,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "",
		"success": true,
	})
}

func Register(c *gin.Context) {
	if !common.RegisterEnabled {
		common.ApiErrorI18n(c, i18n.MsgUserRegisterDisabled)
		return
	}
	if !common.PasswordRegisterEnabled {
		common.ApiErrorI18n(c, i18n.MsgUserPasswordRegisterDisabled)
		return
	}
	var user model.User
	err := json.NewDecoder(c.Request.Body).Decode(&user)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	user.Username = normalizeUsername(user.Username)
	user.Email = strings.TrimSpace(user.Email)
	if !validateRequiredUsername(c, user.Username) {
		return
	}
	if err := common.Validate.Struct(&user); err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserInputInvalid, map[string]any{"Error": err.Error()})
		return
	}
	if common.EmailVerificationEnabled {
		if user.Email == "" || user.VerificationCode == "" {
			common.ApiErrorI18n(c, i18n.MsgUserEmailVerificationRequired)
			return
		}
		if !common.VerifyCodeWithKey(user.Email, user.VerificationCode, common.EmailVerificationPurpose) {
			common.ApiErrorI18n(c, i18n.MsgUserVerificationCodeError)
			return
		}
	}
	exist, err := model.CheckUserExistOrDeleted(user.Username, user.Email)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgDatabaseError)
		common.SysLog(fmt.Sprintf("CheckUserExistOrDeleted error: %v", err))
		return
	}
	if exist {
		common.ApiErrorI18n(c, i18n.MsgUserExists)
		return
	}
	affCode := user.AffCode // this code is the inviter's code, not the user's own code
	inviterId, _ := model.GetUserIdByAffCode(affCode)
	cleanUser := model.User{
		Username:    user.Username,
		Password:    user.Password,
		DisplayName: user.Username,
		InviterId:   inviterId,
		Role:        common.RoleCommonUser,
	}
	if common.EmailVerificationEnabled {
		cleanUser.Email = user.Email
	}
	if err := cleanUser.Insert(inviterId, c.ClientIP(), getRequestDeviceFingerprint(c)); err != nil {
		common.ApiError(c, err)
		return
	}

	// Load the newly inserted user ID.
	var insertedUser model.User
	if err := model.DB.Where("username = ?", cleanUser.Username).First(&insertedUser).Error; err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserRegisterFailed)
		return
	}
	// Generate the default token.
	if constant.GenerateDefaultToken {
		key, err := common.GenerateKey()
		if err != nil {
			common.ApiErrorI18n(c, i18n.MsgUserDefaultTokenFailed)
			common.SysLog("failed to generate token key: " + err.Error())
			return
		}
		// Generate the default token.
		token := model.Token{
			UserId:             insertedUser.Id, // Use the newly inserted user ID.
			Name:               cleanUser.Username + "的初始令牌",
			Key:                key,
			CreatedTime:        common.GetTimestamp(),
			AccessedTime:       common.GetTimestamp(),
			ExpiredTime:        -1,     // Never expires.
			RemainQuota:        500000, // Default sample quota.
			UnlimitedQuota:     true,
			ModelLimitsEnabled: false,
		}
		if setting.DefaultUseAutoGroup {
			token.Group = "auto"
		}
		if err := token.Insert(); err != nil {
			common.ApiErrorI18n(c, i18n.MsgCreateDefaultTokenErr)
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

func GetAllUsers(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	onlyLimited := c.Query("only_limited") == "1"
	users, total, err := model.GetAllUsers(pageInfo, onlyLimited)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(users)

	common.ApiSuccess(c, pageInfo)
	return
}

func SearchUsers(c *gin.Context) {
	keyword := c.Query("keyword")
	group := c.Query("group")
	onlyLimited := c.Query("only_limited") == "1"
	pageInfo := common.GetPageQuery(c)
	users, total, err := model.SearchUsers(keyword, group, pageInfo.GetStartIdx(), pageInfo.GetPageSize(), onlyLimited)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(users)
	common.ApiSuccess(c, pageInfo)
	return
}

func GetUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	user, err := model.GetUserById(id, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	myRole := c.GetInt("role")
	if myRole <= user.Role && myRole != common.RoleRootUser {
		common.ApiErrorI18n(c, i18n.MsgUserNoPermissionSameLevel)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    user,
	})
	return
}

func GenerateAccessToken(c *gin.Context) {
	id := c.GetInt("id")
	user, err := model.GetUserById(id, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	// get rand int 28-32
	randI := common.GetRandomInt(4)
	key, err := common.GenerateRandomKey(29 + randI)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgGenerateFailed)
		common.SysLog("failed to generate key: " + err.Error())
		return
	}
	user.SetAccessToken(key)

	if model.DB.Where("access_token = ?", user.AccessToken).First(user).RowsAffected != 0 {
		common.ApiErrorI18n(c, i18n.MsgUuidDuplicate)
		return
	}

	if err := user.Update(false); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    user.AccessToken,
	})
	return
}

type TransferAffQuotaRequest struct {
	Quota int `json:"quota" binding:"required"`
}

func TransferAffQuota(c *gin.Context) {
	id := c.GetInt("id")
	user, err := model.GetUserById(id, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	tran := TransferAffQuotaRequest{}
	if err := c.ShouldBindJSON(&tran); err != nil {
		common.ApiError(c, err)
		return
	}
	err = user.TransferAffQuotaToQuota(tran.Quota)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserTransferFailed, map[string]any{"Error": err.Error()})
		return
	}
	common.ApiSuccessI18n(c, i18n.MsgUserTransferSuccess, nil)
}

func GetAffCode(c *gin.Context) {
	id := c.GetInt("id")
	user, err := model.GetUserById(id, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user.AffCode == "" {
		user.AffCode = common.GetRandomString(4)
		if err := user.Update(false); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    user.AffCode,
	})
	return
}

func GetSelf(c *gin.Context) {
	id := c.GetInt("id")
	userRole := c.GetInt("role")
	user, err := model.GetUserById(id, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	// Hide admin remarks: set to empty to trigger omitempty tag, ensuring the remark field is not included in JSON returned to regular users
	user.Remark = ""

	// Compute user permissions.
	permissions := calculateUserPermissions(userRole)

	// Load user settings for sidebar-related data.
	userSetting := user.GetSetting()

	// Build the response payload with profile and permission data.
	affCount := user.AffCount
	if invitationCount, countErr := model.GetInvitationRewardCountByInviter(id); countErr == nil && invitationCount > 0 {
		affCount = int(invitationCount)
	}

	responseData := map[string]interface{}{
		"id":                      user.Id,
		"username":                user.Username,
		"display_name":            user.DisplayName,
		"role":                    user.Role,
		"status":                  user.Status,
		"email":                   user.Email,
		"qq_id":                   user.QQId,
		"require_email_bind":      shouldRequireEmailBind(user),
		"require_account_setup":   shouldRequireAccountSetup(user),
		"github_id":               user.GitHubId,
		"discord_id":              user.DiscordId,
		"oidc_id":                 user.OidcId,
		"wechat_id":               user.WeChatId,
		"telegram_id":             user.TelegramId,
		"group":                   user.Group,
		"quota":                   user.Quota,
		"used_quota":              user.UsedQuota,
		"request_count":           user.RequestCount,
		"request_rate_limit":      user.RequestRateLimit,
		"request_rate_limit_hour": user.RequestRateLimitHour,
		"request_rate_limit_day":  user.RequestRateLimitDay,
		"aff_code":                user.AffCode,
		"aff_count":               affCount,
		"aff_quota":               user.AffQuota,
		"aff_history_quota":       user.AffHistoryQuota,
		"inviter_id":              user.InviterId,
		"linux_do_id":             user.LinuxDOId,
		"setting":                 user.Setting,
		"stripe_customer":         user.StripeCustomer,
		"sidebar_modules":         userSetting.SidebarModules, // Sidebar module configuration.
		"permissions":             permissions,                // Derived permission payload.
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    responseData,
	})
	return
}

// calculateUserPermissions computes sidebar permissions by role.
func calculateUserPermissions(userRole int) map[string]interface{} {
	permissions := map[string]interface{}{}

	// Derive permissions from the user role.
	if userRole == common.RoleRootUser {
		// Root users do not need sidebar settings customization.
		permissions["sidebar_settings"] = false
		permissions["sidebar_modules"] = map[string]interface{}{}
	} else if userRole == common.RoleAdminUser {
		// Admins can configure sidebar modules, but not system settings.
		permissions["sidebar_settings"] = true
		permissions["sidebar_modules"] = map[string]interface{}{
			"admin": map[string]interface{}{
				"setting": false,
			},
		}
	} else {
		// Regular users cannot access the admin area.
		permissions["sidebar_settings"] = true
		permissions["sidebar_modules"] = map[string]interface{}{
			"admin": false, // Regular users cannot access the admin area.
		}
	}

	return permissions
}

// generateDefaultSidebarConfig builds the default sidebar configuration by role.
func generateDefaultSidebarConfig(userRole int) string {
	defaultConfig := map[string]interface{}{}

	// 鑱婂ぉ鍖哄煙 - 鎵€鏈夌敤鎴烽兘鍙互璁块棶
	defaultConfig["chat"] = map[string]interface{}{
		"enabled":    true,
		"playground": true,
		"chat":       true,
	}

	// 鎺у埗鍙板尯鍩?- 鎵€鏈夌敤鎴烽兘鍙互璁块棶
	defaultConfig["console"] = map[string]interface{}{
		"enabled":    true,
		"detail":     true,
		"token":      true,
		"log":        true,
		"midjourney": true,
		"task":       true,
	}

	// Personal center: available to all users.
	defaultConfig["personal"] = map[string]interface{}{
		"enabled":  true,
		"topup":    true,
		"personal": true,
	}

	// Admin area: enabled based on role.
	if userRole == common.RoleAdminUser {
		// Admins can access the admin area, but not system settings.
		defaultConfig["admin"] = map[string]interface{}{
			"enabled":    true,
			"channel":    true,
			"models":     true,
			"redemption": true,
			"user":       true,
			"setting":    false,
		}
	} else if userRole == common.RoleRootUser {
		// Root users can access the full admin area.
		defaultConfig["admin"] = map[string]interface{}{
			"enabled":    true,
			"channel":    true,
			"models":     true,
			"redemption": true,
			"user":       true,
			"setting":    true,
		}
	}
	// 鏅€氱敤鎴蜂笉鍖呭惈admin鍖哄煙

	// Serialize the default sidebar config to JSON.
	configBytes, err := json.Marshal(defaultConfig)
	if err != nil {
		common.SysLog("鐢熸垚榛樿杈规爮閰嶇疆澶辫触: " + err.Error())
		return ""
	}

	return string(configBytes)
}

func GetUserModels(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		id = c.GetInt("id")
	}
	user, err := model.GetUserCache(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	filterGroup := c.Query("group")
	groups := service.GetUserUsableGroups(user.Group)
	var models []string

	if filterGroup != "" {
		if _, ok := groups[filterGroup]; ok {
			models = model.GetGroupEnabledModels(filterGroup)
		}
	} else {
		for group := range groups {
			for _, g := range model.GetGroupEnabledModels(group) {
				if !common.StringsContains(models, g) {
					models = append(models, g)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    models,
	})
	return
}

func UpdateUser(c *gin.Context) {
	var updatedUser model.User
	err := json.NewDecoder(c.Request.Body).Decode(&updatedUser)
	if err != nil || updatedUser.Id == 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	updatedUser.Username = normalizeUsername(updatedUser.Username)
	myRole := c.GetInt("role")

	// 只有当不是管理员，或者是管理员但用户名为空时，才执行严格的用户名校验
	if myRole < common.RoleAdminUser {
		if !validateRequiredUsername(c, updatedUser.Username) {
			return
		}
	} else if updatedUser.Username == "" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	if updatedUser.Password == "" {
		updatedUser.Password = "$I_LOVE_U" // make Validator happy :)
	}

	// 临时保存用户名，如果管理员则放行 Validate.Struct 里面的用户名校验
	tempUsername := ""
	if myRole >= common.RoleAdminUser {
		tempUsername = updatedUser.Username
		updatedUser.Username = "admin_bypassed_validation"
	}

	if err := common.Validate.Struct(&updatedUser); err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserInputInvalid, map[string]any{"Error": err.Error()})
		return
	}

	// 恢复用户名
	if myRole >= common.RoleAdminUser {
		updatedUser.Username = tempUsername
	}

	originUser, err := model.GetUserById(updatedUser.Id, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if myRole <= originUser.Role && myRole != common.RoleRootUser {
		common.ApiErrorI18n(c, i18n.MsgUserNoPermissionHigherLevel)
		return
	}
	if myRole <= updatedUser.Role && myRole != common.RoleRootUser {
		common.ApiErrorI18n(c, i18n.MsgUserCannotCreateHigherLevel)
		return
	}
	if !ensureUsernameAvailable(c, updatedUser.Username, originUser.Id) {
		return
	}
	if updatedUser.Password == "$I_LOVE_U" {
		updatedUser.Password = "" // rollback to what it should be
	}
	updatePassword := updatedUser.Password != ""
	if err := updatedUser.Edit(updatePassword); err != nil {
		common.ApiError(c, err)
		return
	}
	if originUser.Quota != updatedUser.Quota {
		model.RecordLog(originUser.Id, model.LogTypeManage, fmt.Sprintf("管理员将用户额度从 %s 修改为 %s", logger.LogQuota(originUser.Quota), logger.LogQuota(updatedUser.Quota)))
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

func AdminClearUserBinding(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	bindingType := strings.ToLower(strings.TrimSpace(c.Param("binding_type")))
	if bindingType == "" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	user, err := model.GetUserById(id, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	myRole := c.GetInt("role")
	if myRole <= user.Role && myRole != common.RoleRootUser {
		common.ApiErrorI18n(c, i18n.MsgUserNoPermissionSameLevel)
		return
	}

	if err := user.ClearBinding(bindingType); err != nil {
		common.ApiError(c, err)
		return
	}

	model.RecordLog(user.Id, model.LogTypeManage, fmt.Sprintf("admin cleared %s binding for user %s", bindingType, user.Username))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "success",
	})
}

func UpdateSelf(c *gin.Context) {
	var requestData map[string]interface{}
	err := json.NewDecoder(c.Request.Body).Decode(&requestData)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	// Handle sidebar_modules updates from user settings.
	if sidebarModules, sidebarExists := requestData["sidebar_modules"]; sidebarExists {
		userId := c.GetInt("id")
		user, err := model.GetUserById(userId, false)
		if err != nil {
			common.ApiError(c, err)
			return
		}

		// Load current user settings.
		currentSetting := user.GetSetting()

		// Update sidebar_modules.
		if sidebarModulesStr, ok := sidebarModules.(string); ok {
			currentSetting.SidebarModules = sidebarModulesStr
		}

		// Save updated settings.
		user.SetSetting(currentSetting)
		if err := user.Update(false); err != nil {
			common.ApiErrorI18n(c, i18n.MsgUpdateFailed)
			return
		}

		common.ApiSuccessI18n(c, i18n.MsgUpdateSuccess, nil)
		return
	}

	// Handle language preference updates.
	if language, langExists := requestData["language"]; langExists {
		userId := c.GetInt("id")
		user, err := model.GetUserById(userId, false)
		if err != nil {
			common.ApiError(c, err)
			return
		}

		// Load current user settings.
		currentSetting := user.GetSetting()

		// Update language.
		if langStr, ok := language.(string); ok {
			currentSetting.Language = langStr
		}

		// Save updated settings.
		user.SetSetting(currentSetting)
		if err := user.Update(false); err != nil {
			common.ApiErrorI18n(c, i18n.MsgUpdateFailed)
			return
		}

		common.ApiSuccessI18n(c, i18n.MsgUpdateSuccess, nil)
		return
	}

	// Fall back to the original user update flow.
	var user model.User
	requestDataBytes, err := json.Marshal(requestData)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	err = json.Unmarshal(requestDataBytes, &user)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	user.Username = normalizeUsername(user.Username)
	if !validateOptionalUsername(c, user.Username) {
		return
	}

	if user.Password == "" {
		user.Password = "$I_LOVE_U" // make Validator happy :)
	}
	if err := common.Validate.Struct(&user); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidInput)
		return
	}

	cleanUser := model.User{
		Id:          c.GetInt("id"),
		Username:    user.Username,
		Password:    user.Password,
		DisplayName: user.DisplayName,
	}
	if !ensureUsernameAvailable(c, cleanUser.Username, cleanUser.Id) {
		return
	}
	if user.Password == "$I_LOVE_U" {
		user.Password = "" // rollback to what it should be
		cleanUser.Password = ""
	}
	updatePassword, err := checkUpdatePassword(user.OriginalPassword, user.Password, cleanUser.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := cleanUser.Update(updatePassword); err != nil {
		common.ApiError(c, err)
		return
	}

	if cleanUser.Username != "" {
		session := sessions.Default(c)
		session.Set("username", cleanUser.Username)
		if err := session.Save(); err != nil {
			common.SysError(fmt.Sprintf("failed to refresh session username for user %d: %v", cleanUser.Id, err))
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

func checkUpdatePassword(originalPassword string, newPassword string, userId int) (updatePassword bool, err error) {
	var currentUser *model.User
	currentUser, err = model.GetUserById(userId, true)
	if err != nil {
		return
	}

	// Verify the original password before updating it.
	// Allow first-time password binding when the original password is empty.
	if !common.ValidatePasswordAndHash(originalPassword, currentUser.Password) && currentUser.Password != "" {
		err = fmt.Errorf("原密码错误")
		return
	}
	if newPassword == "" {
		return
	}
	updatePassword = true
	return
}

func DeleteUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	originUser, err := model.GetUserById(id, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	myRole := c.GetInt("role")
	if myRole <= originUser.Role {
		common.ApiErrorI18n(c, i18n.MsgUserNoPermissionHigherLevel)
		return
	}
	err = model.HardDeleteUserById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
		})
		return
	}
}

func DeleteSelf(c *gin.Context) {
	id := c.GetInt("id")
	user, _ := model.GetUserById(id, false)

	if user.Role == common.RoleRootUser {
		common.ApiErrorI18n(c, i18n.MsgUserCannotDeleteRootUser)
		return
	}

	err := model.DeleteUserById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

func CreateUser(c *gin.Context) {
	var user model.User
	err := json.NewDecoder(c.Request.Body).Decode(&user)
	user.Username = normalizeUsername(user.Username)
	if err != nil || user.Username == "" || user.Password == "" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if !validateRequiredUsername(c, user.Username) {
		return
	}
	if err := common.Validate.Struct(&user); err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserInputInvalid, map[string]any{"Error": err.Error()})
		return
	}
	if !ensureUsernameAvailable(c, user.Username, 0) {
		return
	}
	if user.DisplayName == "" {
		user.DisplayName = user.Username
	}
	myRole := c.GetInt("role")
	if user.Role >= myRole {
		common.ApiErrorI18n(c, i18n.MsgUserCannotCreateHigherLevel)
		return
	}
	// Even for admin users, we cannot fully trust them!
	cleanUser := model.User{
		Username:    user.Username,
		Password:    user.Password,
		DisplayName: user.DisplayName,
		Role:        user.Role, // Preserve the role configured by admins.
	}
	if err := cleanUser.Insert(0, "", ""); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

type ManageRequest struct {
	Id     int    `json:"id"`
	Action string `json:"action"`
}

// ManageUser Only admin user can do this
func ManageUser(c *gin.Context) {
	var req ManageRequest
	err := json.NewDecoder(c.Request.Body).Decode(&req)

	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	user := model.User{
		Id: req.Id,
	}
	// Fill attributes
	model.DB.Unscoped().Where(&user).First(&user)
	if user.Id == 0 {
		common.ApiErrorI18n(c, i18n.MsgUserNotExists)
		return
	}
	myRole := c.GetInt("role")
	if myRole <= user.Role && myRole != common.RoleRootUser {
		common.ApiErrorI18n(c, i18n.MsgUserNoPermissionHigherLevel)
		return
	}
	switch req.Action {
	case "disable":
		user.Status = common.UserStatusDisabled
		if user.Role == common.RoleRootUser {
			common.ApiErrorI18n(c, i18n.MsgUserCannotDisableRootUser)
			return
		}
	case "enable":
		user.Status = common.UserStatusEnabled
	case "delete":
		if user.Role == common.RoleRootUser {
			common.ApiErrorI18n(c, i18n.MsgUserCannotDeleteRootUser)
			return
		}
		if err := user.Delete(); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
	case "promote":
		if myRole != common.RoleRootUser {
			common.ApiErrorI18n(c, i18n.MsgUserAdminCannotPromote)
			return
		}
		if user.Role >= common.RoleAdminUser {
			common.ApiErrorI18n(c, i18n.MsgUserAlreadyAdmin)
			return
		}
		user.Role = common.RoleAdminUser
	case "demote":
		if user.Role == common.RoleRootUser {
			common.ApiErrorI18n(c, i18n.MsgUserCannotDemoteRootUser)
			return
		}
		if user.Role == common.RoleCommonUser {
			common.ApiErrorI18n(c, i18n.MsgUserAlreadyCommon)
			return
		}
		user.Role = common.RoleCommonUser
	}

	if err := user.Update(false); err != nil {
		common.ApiError(c, err)
		return
	}
	clearUser := model.User{
		Role:   user.Role,
		Status: user.Status,
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    clearUser,
	})
	return
}

func EmailBind(c *gin.Context) {
	email := c.Query("email")
	code := c.Query("code")
	if !common.VerifyCodeWithKey(email, code, common.EmailVerificationPurpose) {
		common.ApiErrorI18n(c, i18n.MsgUserVerificationCodeError)
		return
	}
	session := sessions.Default(c)
	id := session.Get("id")
	user := model.User{
		Id: id.(int),
	}
	err := user.FillUserById()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	user.Email = email
	// no need to check if this email already taken, because we have used verification code to check it
	err = user.Update(false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

type topUpRequest struct {
	Key string `json:"key"`
}

var topUpLocks sync.Map
var topUpCreateLock sync.Mutex

type topUpTryLock struct {
	ch chan struct{}
}

func newTopUpTryLock() *topUpTryLock {
	return &topUpTryLock{ch: make(chan struct{}, 1)}
}

func (l *topUpTryLock) TryLock() bool {
	select {
	case l.ch <- struct{}{}:
		return true
	default:
		return false
	}
}

func (l *topUpTryLock) Unlock() {
	select {
	case <-l.ch:
	default:
	}
}

func getTopUpLock(userID int) *topUpTryLock {
	if v, ok := topUpLocks.Load(userID); ok {
		return v.(*topUpTryLock)
	}
	topUpCreateLock.Lock()
	defer topUpCreateLock.Unlock()
	if v, ok := topUpLocks.Load(userID); ok {
		return v.(*topUpTryLock)
	}
	l := newTopUpTryLock()
	topUpLocks.Store(userID, l)
	return l
}

func TopUp(c *gin.Context) {
	id := c.GetInt("id")
	lock := getTopUpLock(id)
	if !lock.TryLock() {
		common.ApiErrorI18n(c, i18n.MsgUserTopUpProcessing)
		return
	}
	defer lock.Unlock()
	req := topUpRequest{}
	err := c.ShouldBindJSON(&req)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	quota, err := model.Redeem(req.Key, id)
	if err != nil {
		if errors.Is(err, model.ErrRedeemFailed) {
			common.ApiErrorI18n(c, i18n.MsgRedeemFailed)
			return
		}
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    quota,
	})
}

type UpdateUserSettingRequest struct {
	QuotaWarningType                 string  `json:"notify_type"`
	QuotaWarningThreshold            float64 `json:"quota_warning_threshold"`
	WebhookUrl                       string  `json:"webhook_url,omitempty"`
	WebhookSecret                    string  `json:"webhook_secret,omitempty"`
	NotificationEmail                string  `json:"notification_email,omitempty"`
	BarkUrl                          string  `json:"bark_url,omitempty"`
	GotifyUrl                        string  `json:"gotify_url,omitempty"`
	GotifyToken                      string  `json:"gotify_token,omitempty"`
	GotifyPriority                   int     `json:"gotify_priority,omitempty"`
	UpstreamModelUpdateNotifyEnabled *bool   `json:"upstream_model_update_notify_enabled,omitempty"`
	AcceptUnsetModelRatioModel       bool    `json:"accept_unset_model_ratio_model"`
	RecordIpLog                      bool    `json:"record_ip_log"`
}

func UpdateUserSetting(c *gin.Context) {
	var req UpdateUserSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	// 楠岃瘉棰勮绫诲瀷
	if req.QuotaWarningType != dto.NotifyTypeEmail && req.QuotaWarningType != dto.NotifyTypeWebhook && req.QuotaWarningType != dto.NotifyTypeBark && req.QuotaWarningType != dto.NotifyTypeGotify {
		common.ApiErrorI18n(c, i18n.MsgSettingInvalidType)
		return
	}

	// Quota warning threshold must be greater than zero.
	if req.QuotaWarningThreshold <= 0 {
		common.ApiErrorI18n(c, i18n.MsgQuotaThresholdGtZero)
		return
	}

	// Validate webhook settings when webhook notifications are enabled.
	if req.QuotaWarningType == dto.NotifyTypeWebhook {
		if req.WebhookUrl == "" {
			common.ApiErrorI18n(c, i18n.MsgSettingWebhookEmpty)
			return
		}
		// Validate URL format.
		if _, err := url.ParseRequestURI(req.WebhookUrl); err != nil {
			common.ApiErrorI18n(c, i18n.MsgSettingWebhookInvalid)
			return
		}
	}

	// Validate the notification email when email notifications are enabled.
	if req.QuotaWarningType == dto.NotifyTypeEmail && req.NotificationEmail != "" {
		// Validate email format.
		if !strings.Contains(req.NotificationEmail, "@") {
			common.ApiErrorI18n(c, i18n.MsgSettingEmailInvalid)
			return
		}
	}

	// Validate Bark settings when Bark notifications are enabled.
	if req.QuotaWarningType == dto.NotifyTypeBark {
		if req.BarkUrl == "" {
			common.ApiErrorI18n(c, i18n.MsgSettingBarkUrlEmpty)
			return
		}
		// Validate URL format.
		if _, err := url.ParseRequestURI(req.BarkUrl); err != nil {
			common.ApiErrorI18n(c, i18n.MsgSettingBarkUrlInvalid)
			return
		}
		// Require an HTTP or HTTPS URL.
		if !strings.HasPrefix(req.BarkUrl, "https://") && !strings.HasPrefix(req.BarkUrl, "http://") {
			common.ApiErrorI18n(c, i18n.MsgSettingUrlMustHttp)
			return
		}
	}

	// Validate Gotify settings when Gotify notifications are enabled.
	if req.QuotaWarningType == dto.NotifyTypeGotify {
		if req.GotifyUrl == "" {
			common.ApiErrorI18n(c, i18n.MsgSettingGotifyUrlEmpty)
			return
		}
		if req.GotifyToken == "" {
			common.ApiErrorI18n(c, i18n.MsgSettingGotifyTokenEmpty)
			return
		}
		// Validate URL format.
		if _, err := url.ParseRequestURI(req.GotifyUrl); err != nil {
			common.ApiErrorI18n(c, i18n.MsgSettingGotifyUrlInvalid)
			return
		}
		// Require an HTTP or HTTPS URL.
		if !strings.HasPrefix(req.GotifyUrl, "https://") && !strings.HasPrefix(req.GotifyUrl, "http://") {
			common.ApiErrorI18n(c, i18n.MsgSettingUrlMustHttp)
			return
		}
	}

	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	existingSettings := user.GetSetting()
	upstreamModelUpdateNotifyEnabled := existingSettings.UpstreamModelUpdateNotifyEnabled
	if user.Role >= common.RoleAdminUser && req.UpstreamModelUpdateNotifyEnabled != nil {
		upstreamModelUpdateNotifyEnabled = *req.UpstreamModelUpdateNotifyEnabled
	}

	// Build the settings payload.
	settings := dto.UserSetting{
		NotifyType:                       req.QuotaWarningType,
		QuotaWarningThreshold:            req.QuotaWarningThreshold,
		UpstreamModelUpdateNotifyEnabled: upstreamModelUpdateNotifyEnabled,
		AcceptUnsetRatioModel:            req.AcceptUnsetModelRatioModel,
		RecordIpLog:                      req.RecordIpLog,
	}

	// Persist webhook settings.
	if req.QuotaWarningType == dto.NotifyTypeWebhook {
		settings.WebhookUrl = req.WebhookUrl
		if req.WebhookSecret != "" {
			settings.WebhookSecret = req.WebhookSecret
		}
	}

	// If a notification email is provided, persist it.
	if req.QuotaWarningType == dto.NotifyTypeEmail && req.NotificationEmail != "" {
		settings.NotificationEmail = req.NotificationEmail
	}

	// Persist Bark settings.
	if req.QuotaWarningType == dto.NotifyTypeBark {
		settings.BarkUrl = req.BarkUrl
	}

	// Persist Gotify settings.
	if req.QuotaWarningType == dto.NotifyTypeGotify {
		settings.GotifyUrl = req.GotifyUrl
		settings.GotifyToken = req.GotifyToken
		// Clamp Gotify priority to 0-10 and fall back to the default.
		if req.GotifyPriority < 0 || req.GotifyPriority > 10 {
			settings.GotifyPriority = 5
		} else {
			settings.GotifyPriority = req.GotifyPriority
		}
	}

	// Save user settings.
	user.SetSetting(settings)
	if err := user.Update(false); err != nil {
		common.ApiErrorI18n(c, i18n.MsgUpdateFailed)
		return
	}

	common.ApiSuccessI18n(c, i18n.MsgSettingSaved, nil)
}
