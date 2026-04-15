package controller

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/ipcheck"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

type invitationRewardReviewRequest struct {
	ReviewType   string `json:"review_type"`
	Action       string `json:"action"`
	RejectReason string `json:"reject_reason"`
}

func buildInvitationRewardSelfItem(record *model.InvitationReward) gin.H {
	item := gin.H{
		"id":                            record.Id,
		"invitee_id":                    record.InviteeId,
		"invitee_display":               record.InviteeMaskedDisplay,
		"register_reward_status":        record.RegisterRewardStatus,
		"register_reward_reject_reason": record.RegisterRewardRejectReason,
		"first_topup_reward_status":     record.FirstTopupRewardStatus,
		"first_topup_reject_reason":     record.FirstTopupRejectReason,
		"first_topup_amount":            record.FirstTopupAmount,
		"created_time":                  record.CreatedTime,
		"first_topup_qualified_at":      record.FirstTopupQualifiedAt,
		"register_reward_reviewed_at":   record.RegisterRewardReviewedAt,
		"first_topup_reviewed_at":       record.FirstTopupReviewedAt,
	}
	if record.RegisterRewardStatus == model.InvitationRewardStatusApproved {
		item["register_reward_quota"] = record.RegisterRewardQuota
	}
	if record.FirstTopupRewardStatus == model.InvitationRewardStatusApproved {
		item["first_topup_reward_quota"] = record.FirstTopupRewardQuota
	}
	return item
}

func buildInvitationRewardChildren(records []*model.InvitationReward) []gin.H {
	items := make([]gin.H, 0, len(records))
	for _, record := range records {
		if record == nil {
			continue
		}
		items = append(items, gin.H{
			"id":                        record.Id,
			"inviter_id":                record.InviterId,
			"invitee_id":                record.InviteeId,
			"invitee_username":          record.InviteeUsername,
			"invitee_display":           record.InviteeMaskedDisplay,
			"register_reward_status":    record.RegisterRewardStatus,
			"first_topup_reward_status": record.FirstTopupRewardStatus,
			"created_time":              record.CreatedTime,
		})
	}
	return items
}

func buildInvitationIPMeta(ip string, cache map[string]gin.H) gin.H {
	ip = strings.TrimSpace(ip)
	if ip == "" {
		return gin.H{
			"type":     "empty",
			"label":    "--",
			"provider": "",
		}
	}
	if meta, ok := cache[ip]; ok {
		return meta
	}

	checkinSetting := operation_setting.GetCheckinSetting()
	provider := ""
	ipInfoToken := ""
	ipAPIKey := ""
	if checkinSetting != nil {
		provider = strings.TrimSpace(checkinSetting.IPCheckProvider)
		ipInfoToken = strings.TrimSpace(checkinSetting.IPInfoToken)
		ipAPIKey = strings.TrimSpace(checkinSetting.IPApiKey)
	}
	if provider == "" {
		meta := gin.H{
			"type":     "unchecked",
			"label":    "待检测",
			"provider": "",
		}
		cache[ip] = meta
		return meta
	}

	result, err := ipcheck.CheckIP(ip, provider, ipAPIKey, ipInfoToken)
	if err != nil {
		common.SysLog("invitation reward ip check failed (" + ip + "): " + err.Error())
		meta := gin.H{
			"type":     "unknown",
			"label":    "未知",
			"provider": provider,
		}
		cache[ip] = meta
		return meta
	}

	meta := gin.H{
		"type":     "unknown",
		"label":    "待检测",
		"provider": provider,
	}
	if result != nil {
		if strings.TrimSpace(result.Provider) != "" {
			meta["provider"] = strings.TrimSpace(result.Provider)
		}
		switch {
		case result.IsProxy:
			meta["type"] = "proxy"
			meta["label"] = "代理IP"
		case result.IsDatacenter:
			meta["type"] = "datacenter"
			meta["label"] = "机房IP"
		default:
			meta["type"] = "normal"
			meta["label"] = "普通IP"
		}
	}

	cache[ip] = meta
	return meta
}

func GetSelfInvitationRewards(c *gin.Context) {
	userId := c.GetInt("id")
	records, err := model.GetSelfInvitationRewards(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	items := make([]gin.H, 0, len(records))
	for _, record := range records {
		if record == nil {
			continue
		}
		items = append(items, buildInvitationRewardSelfItem(record))
	}

	common.ApiSuccess(c, gin.H{
		"items":                         items,
		"rule_text":                     operation_setting.InvitationRewardRule,
		"currency":                      operation_setting.GetQuotaDisplayType(),
		"symbol":                        operation_setting.GetCurrencySymbol(),
		"demo_register_reward_quota":    operation_setting.DisplayAmountToQuota(operation_setting.InvitationRegisterReward),
		"demo_first_topup_reward_quota": operation_setting.DisplayAmountToQuota(operation_setting.InvitationFirstTopupReward),
	})
}

func AdminListInvitationRewards(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := strings.TrimSpace(c.Query("keyword"))
	status := strings.TrimSpace(c.Query("status"))

	records, total, riskCounts, err := model.ListInvitationRewardsForAdmin(pageInfo, keyword, status)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	inviteeIDs := make([]int, 0, len(records))
	for _, record := range records {
		if record == nil || record.InviteeId <= 0 {
			continue
		}
		inviteeIDs = append(inviteeIDs, record.InviteeId)
	}

	childRewardMap, err := model.ListInvitationRewardChildrenByInviterIDs(inviteeIDs)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	ipMetaCache := make(map[string]gin.H)
	items := make([]gin.H, 0, len(records))
	for _, record := range records {
		if record == nil {
			continue
		}
		registerIPCount := riskCounts["register_ip"][record.RegisterIP]
		registerFingerprintCount := riskCounts["register_fingerprint"][record.RegisterDeviceFingerprint]
		topupFingerprintCount := riskCounts["topup_fingerprint"][record.FirstTopupDeviceFingerprint]
		fingerprintCount := registerFingerprintCount
		if topupFingerprintCount > fingerprintCount {
			fingerprintCount = topupFingerprintCount
		}
		paymentAccountCount := riskCounts["payment_account"][record.FirstTopupPaymentAccountHash]
		childRewards := childRewardMap[record.InviteeId]

		items = append(items, gin.H{
			"id":                               record.Id,
			"inviter_id":                       record.InviterId,
			"invitee_id":                       record.InviteeId,
			"inviter_username":                 record.InviterUsername,
			"invitee_username":                 record.InviteeUsername,
			"invitee_display":                  record.InviteeMaskedDisplay,
			"invitee_children":                 buildInvitationRewardChildren(childRewards),
			"invitee_children_count":           len(childRewards),
			"register_ip":                      record.RegisterIP,
			"register_ip_meta":                 buildInvitationIPMeta(record.RegisterIP, ipMetaCache),
			"register_device_fingerprint":      record.RegisterDeviceFingerprint,
			"register_reward_status":           record.RegisterRewardStatus,
			"register_reward_quota":            record.RegisterRewardQuota,
			"register_reward_reviewed_at":      record.RegisterRewardReviewedAt,
			"register_reward_reject_reason":    record.RegisterRewardRejectReason,
			"first_topup_reward_status":        record.FirstTopupRewardStatus,
			"first_topup_reward_quota":         record.FirstTopupRewardQuota,
			"first_topup_reward_reject_reason": record.FirstTopupRejectReason,
			"first_topup_amount":               record.FirstTopupAmount,
			"first_topup_trade_no":             record.FirstTopupTradeNo,
			"first_topup_payment_method":       record.FirstTopupPaymentMethod,
			"first_topup_payment_order_no":     record.FirstTopupPaymentOrderNo,
			"first_topup_payment_account":      record.FirstTopupPaymentAccount,
			"first_topup_ip":                   record.FirstTopupIP,
			"first_topup_ip_meta":              buildInvitationIPMeta(record.FirstTopupIP, ipMetaCache),
			"first_topup_device_fingerprint":   record.FirstTopupDeviceFingerprint,
			"first_topup_qualified_at":         record.FirstTopupQualifiedAt,
			"first_topup_reviewed_at":          record.FirstTopupReviewedAt,
			"created_time":                     record.CreatedTime,
			"same_register_ip_count":           registerIPCount,
			"same_register_fingerprint_count":  registerFingerprintCount,
			"same_topup_fingerprint_count":     topupFingerprintCount,
			"same_device_fingerprint_count":    fingerprintCount,
			"same_payment_account_count":       paymentAccountCount,
		})
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func AdminReviewInvitationReward(c *gin.Context) {
	recordID, err := strconv.Atoi(c.Param("id"))
	if err != nil || recordID <= 0 {
		common.ApiErrorMsg(c, "无效的记录 ID")
		return
	}

	var req invitationRewardReviewRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "参数错误",
		})
		return
	}

	req.ReviewType = strings.TrimSpace(req.ReviewType)
	req.Action = strings.TrimSpace(req.Action)
	req.RejectReason = strings.TrimSpace(req.RejectReason)
	if req.Action == "reject" && req.RejectReason == "" {
		common.ApiErrorMsg(c, "请填写驳回理由")
		return
	}

	if err := model.ReviewInvitationReward(recordID, req.ReviewType, req.Action, c.GetInt("id"), req.RejectReason); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}
