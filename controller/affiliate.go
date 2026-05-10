package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type AffiliateTransferRequest struct {
	Quota int `json:"quota" binding:"required"`
}

type AffiliateWithdrawRequest struct {
	Amount      int    `json:"amount" binding:"required"`
	AccountType string `json:"account_type" binding:"required"`
	AccountNo   string `json:"account_no" binding:"required"`
	AccountName string `json:"account_name"`
	Note        string `json:"note"`
}

type AffiliateReviewRequest struct {
	Status     string `json:"status" binding:"required"`
	ReviewNote string `json:"review_note"`
}

type AffiliateSettingsUpdateRequest struct {
	AffiliateTransferEnabled                bool                             `json:"affiliate_transfer_enabled"`
	AffiliateWithdrawEnabled                bool                             `json:"affiliate_withdraw_enabled"`
	AffiliateMinWithdrawQuota               int                              `json:"affiliate_min_withdraw_quota"`
	AffiliateBackfillHistoricalTopupEnabled bool                             `json:"affiliate_backfill_historical_topup_enabled"`
	AffiliateLeaderboardEnabled             bool                             `json:"affiliate_leaderboard_enabled"`
	AffiliateCommissionTiers                []common.AffiliateCommissionTier `json:"affiliate_commission_tiers"`
}

func buildAffiliateSettingsPayload() gin.H {
	return gin.H{
		"affiliate_transfer_enabled":                  common.AffiliateTransferEnabled,
		"affiliate_withdraw_enabled":                  common.AffiliateWithdrawEnabled,
		"affiliate_min_withdraw_quota":                common.AffiliateMinWithdrawQuota,
		"affiliate_backfill_historical_topup_enabled": common.AffiliateBackfillHistoricalTopupEnabled,
		"affiliate_leaderboard_enabled":               common.AffiliateLeaderboardEnabled,
		"affiliate_commission_tiers":                  common.GetAffiliateCommissionTiersCopy(),
	}
}

func GetAffiliateSummary(c *gin.Context) {
	userId := c.GetInt("id")
	summary, err := model.GetAffiliateSummary(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, summary)
}

func GetAffiliateRecords(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	items, total, err := model.GetUserAffiliateCommissionRecords(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func GetAffiliateInvitees(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	items, total, err := model.GetAffiliateInvitees(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func GetAffiliateLeaderboard(c *gin.Context) {
	if !common.AffiliateLeaderboardEnabled {
		common.ApiSuccess(c, gin.H{"items": []any{}})
		return
	}
	limit, _ := strconv.Atoi(c.Query("limit"))
	items, err := model.GetAffiliateLeaderboard(limit)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"items": items})
}

func TransferAffiliateQuota(c *gin.Context) {
	if !common.AffiliateTransferEnabled {
		common.ApiErrorMsg(c, "affiliate transfer is disabled")
		return
	}
	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	req := AffiliateTransferRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := user.TransferAffQuotaToQuota(req.Quota); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"quota": req.Quota})
}

func CreateAffiliateWithdrawal(c *gin.Context) {
	userId := c.GetInt("id")
	req := AffiliateWithdrawRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	withdrawal, err := model.CreateAffiliateWithdrawal(
		userId,
		req.Amount,
		req.AccountType,
		req.AccountNo,
		req.AccountName,
		req.Note,
	)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, withdrawal)
}

func AdminGetAffiliateSettings(c *gin.Context) {
	common.ApiSuccess(c, buildAffiliateSettingsPayload())
}

func AdminUpdateAffiliateSettings(c *gin.Context) {
	req := AffiliateSettingsUpdateRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if req.AffiliateMinWithdrawQuota < 0 {
		common.ApiErrorMsg(c, "minimum withdrawal quota must be greater than or equal to zero")
		return
	}

	tiersBytes, err := common.Marshal(req.AffiliateCommissionTiers)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	normalizedTiers, err := common.ParseAffiliateCommissionTiersJSONString(string(tiersBytes))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	tiersBytes, err = common.Marshal(normalizedTiers)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	basePercentage := "0"
	if len(normalizedTiers) > 0 {
		basePercentage = strconv.FormatFloat(normalizedTiers[0].Percentage, 'f', -1, 64)
	}

	updates := []struct {
		key   string
		value string
	}{
		{"AffiliateTransferEnabled", strconv.FormatBool(req.AffiliateTransferEnabled)},
		{"AffiliateWithdrawEnabled", strconv.FormatBool(req.AffiliateWithdrawEnabled)},
		{"AffiliateMinWithdrawQuota", strconv.Itoa(req.AffiliateMinWithdrawQuota)},
		{"AffiliateBackfillHistoricalTopupEnabled", strconv.FormatBool(req.AffiliateBackfillHistoricalTopupEnabled)},
		{"AffiliateLeaderboardEnabled", strconv.FormatBool(req.AffiliateLeaderboardEnabled)},
		{"AffiliateCommissionPercentage", basePercentage},
		{"AffiliateCommissionTiers", string(tiersBytes)},
	}

	for _, item := range updates {
		if err := model.UpdateOption(item.key, item.value); err != nil {
			common.ApiError(c, err)
			return
		}
	}

	common.SetAffiliateCommissionTiers(normalizedTiers, common.AffiliateCommissionPercentage)
	payload := buildAffiliateSettingsPayload()
	if req.AffiliateBackfillHistoricalTopupEnabled {
		backfilledCount, err := model.BackfillHistoricalAffiliateCommissions(200)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		payload["affiliate_backfilled_count"] = backfilledCount
	}
	common.ApiSuccess(c, payload)
}

func GetAffiliateWithdrawals(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	items, err := model.GetUserAffiliateWithdrawals(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(len(items))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func AdminGetAffiliateWithdrawals(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	status := c.Query("status")
	keyword := c.Query("keyword")
	items, total, err := model.GetAffiliateWithdrawals(pageInfo, status, keyword)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func AdminGetAffiliateInviteRelations(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")
	items, total, err := model.GetAdminAffiliateInviteRelations(pageInfo, keyword)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func AdminGetAffiliateCommissionRecords(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")
	items, total, err := model.GetAdminAffiliateCommissionRecords(pageInfo, keyword)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func AdminGetAffiliateTotalRanking(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")
	items, total, err := model.GetAdminAffiliateTotalRanking(pageInfo, keyword)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func AdminReviewAffiliateWithdrawal(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorMsg(c, "invalid id")
		return
	}
	req := AffiliateReviewRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	withdrawal, err := model.ReviewAffiliateWithdrawal(id, c.GetInt("id"), req.Status, req.ReviewNote)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, withdrawal)
}
