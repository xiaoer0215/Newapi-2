package model

import (
	"errors"
	"fmt"
	"strings"
	"sync/atomic"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"gorm.io/gorm"
)

const (
	InvitationRewardStatusNone         = "none"
	InvitationRewardStatusPending      = "pending"
	InvitationRewardStatusApproved     = "approved"
	InvitationRewardStatusRejected     = "rejected"
	InvitationRewardStatusNotTopup     = "not_topped_up"
	InvitationRewardStatusFirstInvite  = "first_invite_used"
	InvitationRewardReviewTypeRegister = "register"
	InvitationRewardReviewTypeTopup    = "first_topup"
)

type InvitationReward struct {
	Id                           int     `json:"id"`
	InviterId                    int     `json:"inviter_id" gorm:"index;uniqueIndex:idx_inviter_invitee"`
	InviteeId                    int     `json:"invitee_id" gorm:"index;uniqueIndex:idx_inviter_invitee"`
	InviterUsername              string  `json:"inviter_username" gorm:"-"`
	InviteeUsername              string  `json:"invitee_username" gorm:"-"`
	InviteeDisplay               string  `json:"invitee_display" gorm:"type:varchar(255);default:''"`
	InviteeMaskedDisplay         string  `json:"invitee_masked_display" gorm:"type:varchar(255);default:''"`
	RegisterIP                   string  `json:"register_ip" gorm:"type:varchar(64);default:'';index"`
	RegisterDeviceFingerprint    string  `json:"register_device_fingerprint" gorm:"type:varchar(128);default:'';index"`
	RegisterRewardStatus         string  `json:"register_reward_status" gorm:"type:varchar(32);default:'none';index"`
	RegisterRewardQuota          int     `json:"register_reward_quota" gorm:"type:int;default:0"`
	RegisterRewardReviewedAt     int64   `json:"register_reward_reviewed_at" gorm:"default:0"`
	RegisterRewardReviewedBy     int     `json:"register_reward_reviewed_by" gorm:"default:0"`
	RegisterRewardRejectReason   string  `json:"register_reward_reject_reason" gorm:"type:varchar(255);default:''"`
	FirstTopupRewardStatus       string  `json:"first_topup_reward_status" gorm:"type:varchar(32);default:'not_topped_up';index"`
	FirstTopupRewardQuota        int     `json:"first_topup_reward_quota" gorm:"type:int;default:0"`
	FirstTopupTradeNo            string  `json:"first_topup_trade_no" gorm:"type:varchar(255);default:''"`
	FirstTopupPaymentMethod      string  `json:"first_topup_payment_method" gorm:"type:varchar(64);default:''"`
	FirstTopupPaymentOrderNo     string  `json:"first_topup_payment_order_no" gorm:"type:varchar(255);default:''"`
	FirstTopupPaymentAccount     string  `json:"first_topup_payment_account" gorm:"type:varchar(255);default:''"`
	FirstTopupPaymentAccountHash string  `json:"first_topup_payment_account_hash" gorm:"type:varchar(64);default:'';index"`
	FirstTopupAmount             float64 `json:"first_topup_amount" gorm:"type:decimal(12,6);default:0"`
	FirstTopupIP                 string  `json:"first_topup_ip" gorm:"type:varchar(64);default:''"`
	FirstTopupDeviceFingerprint  string  `json:"first_topup_device_fingerprint" gorm:"type:varchar(128);default:''"`
	FirstTopupQualifiedAt        int64   `json:"first_topup_qualified_at" gorm:"default:0"`
	FirstTopupReviewedAt         int64   `json:"first_topup_reviewed_at" gorm:"default:0"`
	FirstTopupReviewedBy         int     `json:"first_topup_reviewed_by" gorm:"default:0"`
	FirstTopupRejectReason       string  `json:"first_topup_reject_reason" gorm:"type:varchar(255);default:''"`
	CreatedTime                  int64   `json:"created_time" gorm:"index"`
	UpdatedTime                  int64   `json:"updated_time"`
}

type invitationRewardGroupCount struct {
	Value string `json:"value"`
	Count int    `json:"count"`
}

var invitationFirstTopupSyncRunning atomic.Bool
var invitationFirstTopupSyncLastRun atomic.Int64

func maskInvitationDisplay(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "--"
	}
	runes := []rune(raw)
	if len(runes) <= 2 {
		return string(runes[0]) + "*"
	}
	if len(runes) <= 4 {
		return string(runes[:1]) + "**" + string(runes[len(runes)-1:])
	}
	return string(runes[:2]) + "**" + string(runes[len(runes)-2:])
}

func normalizeFingerprint(raw string) string {
	return strings.TrimSpace(raw)
}

func normalizePaymentAccount(account string) (string, string) {
	account = strings.TrimSpace(strings.ToLower(account))
	if account == "" {
		return "", ""
	}
	if strings.Contains(account, "@") {
		return common.MaskEmail(account), common.Sha1([]byte(account))
	}
	if len(account) <= 8 {
		return account, common.Sha1([]byte(account))
	}
	return account[:4] + "****" + account[len(account)-4:], common.Sha1([]byte(account))
}

func createInvitationRewardTx(tx *gorm.DB, inviterId int, user *User, registerIP string, deviceFingerprint string) error {
	if tx == nil || user == nil || inviterId == 0 || user.Id == 0 {
		return nil
	}

	now := common.GetTimestamp()
	registerRewardQuota := 0
	registerRewardStatus := InvitationRewardStatusNone
	if operation_setting.InvitationRegisterReward > 0 {
		var existingCount int64
		if err := tx.Model(&InvitationReward{}).Where("inviter_id = ?", inviterId).Count(&existingCount).Error; err != nil {
			return err
		}
		if existingCount == 0 {
			registerRewardQuota = operation_setting.DisplayAmountToQuota(operation_setting.InvitationRegisterReward)
			if registerRewardQuota > 0 {
				registerRewardStatus = InvitationRewardStatusPending
			}
		} else {
			registerRewardStatus = InvitationRewardStatusFirstInvite
		}
	}

	record := &InvitationReward{
		InviterId:                 inviterId,
		InviteeId:                 user.Id,
		InviteeDisplay:            strings.TrimSpace(user.Username),
		InviteeMaskedDisplay:      maskInvitationDisplay(user.Username),
		RegisterIP:                strings.TrimSpace(registerIP),
		RegisterDeviceFingerprint: normalizeFingerprint(deviceFingerprint),
		RegisterRewardStatus:      registerRewardStatus,
		RegisterRewardQuota:       registerRewardQuota,
		FirstTopupRewardStatus:    InvitationRewardStatusNotTopup,
		CreatedTime:               now,
		UpdatedTime:               now,
	}

	if record.InviteeDisplay == "" {
		record.InviteeDisplay = strings.TrimSpace(user.Email)
		record.InviteeMaskedDisplay = maskInvitationDisplay(record.InviteeDisplay)
	}

	if err := tx.Create(record).Error; err != nil {
		return err
	}

	return tx.Model(&User{}).Where("id = ?", inviterId).Update("aff_count", gorm.Expr("aff_count + ?", 1)).Error
}

func GetInvitationRewardCountByInviter(inviterId int) (int64, error) {
	if inviterId == 0 {
		return 0, nil
	}
	var count int64
	err := DB.Model(&InvitationReward{}).Where("inviter_id = ?", inviterId).Count(&count).Error
	return count, err
}

func fillInvitationRewardUsernames(tx *gorm.DB, records []*InvitationReward) error {
	if len(records) == 0 {
		return nil
	}

	userIDs := make([]int, 0, len(records)*2)
	userIDMap := make(map[int]struct{}, len(records)*2)
	for _, record := range records {
		if record == nil {
			continue
		}
		if _, ok := userIDMap[record.InviterId]; !ok && record.InviterId != 0 {
			userIDMap[record.InviterId] = struct{}{}
			userIDs = append(userIDs, record.InviterId)
		}
		if _, ok := userIDMap[record.InviteeId]; !ok && record.InviteeId != 0 {
			userIDMap[record.InviteeId] = struct{}{}
			userIDs = append(userIDs, record.InviteeId)
		}
	}
	if len(userIDs) == 0 {
		return nil
	}

	var users []User
	if err := tx.Select("id", "username").Where("id IN ?", userIDs).Find(&users).Error; err != nil {
		return err
	}

	usernameMap := make(map[int]string, len(users))
	for _, user := range users {
		usernameMap[user.Id] = user.Username
	}

	for _, record := range records {
		if record == nil {
			continue
		}
		record.InviterUsername = usernameMap[record.InviterId]
		record.InviteeUsername = usernameMap[record.InviteeId]
	}
	return nil
}

func GetSelfInvitationRewards(userId int) ([]*InvitationReward, error) {
	var records []*InvitationReward
	err := DB.Where("inviter_id = ?", userId).Order("id desc").Find(&records).Error
	return records, err
}

func ListInvitationRewardChildrenByInviterIDs(inviterIDs []int) (map[int][]*InvitationReward, error) {
	childMap := make(map[int][]*InvitationReward)
	if len(inviterIDs) == 0 {
		return childMap, nil
	}

	uniqueIDs := make([]int, 0, len(inviterIDs))
	seen := make(map[int]struct{}, len(inviterIDs))
	for _, inviterID := range inviterIDs {
		if inviterID <= 0 {
			continue
		}
		if _, ok := seen[inviterID]; ok {
			continue
		}
		seen[inviterID] = struct{}{}
		uniqueIDs = append(uniqueIDs, inviterID)
	}
	if len(uniqueIDs) == 0 {
		return childMap, nil
	}

	var records []*InvitationReward
	if err := DB.Where("inviter_id IN ?", uniqueIDs).Order("id desc").Find(&records).Error; err != nil {
		return nil, err
	}
	if err := fillInvitationRewardUsernames(DB, records); err != nil {
		return nil, err
	}

	for _, record := range records {
		if record == nil {
			continue
		}
		childMap[record.InviterId] = append(childMap[record.InviterId], record)
	}
	return childMap, nil
}

func listInvitationRiskCounts(column string, values []string) (map[string]int, error) {
	result := make(map[string]int)
	if len(values) == 0 {
		return result, nil
	}
	uniqueValues := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		uniqueValues = append(uniqueValues, value)
	}
	if len(uniqueValues) == 0 {
		return result, nil
	}

	var rows []invitationRewardGroupCount
	if err := DB.Model(&InvitationReward{}).
		Select(column+" as value, COUNT(*) as count").
		Where(column+" IN ?", uniqueValues).
		Group(column).
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, row := range rows {
		result[row.Value] = row.Count
	}
	return result, nil
}

func ListInvitationRewardsForAdmin(pageInfo *common.PageInfo, keyword string, status string) ([]*InvitationReward, int64, map[string]map[string]int, error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, nil, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	query := tx.Model(&InvitationReward{})
	keyword = strings.TrimSpace(keyword)
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("invitee_display LIKE ? OR invitee_masked_display LIKE ?", like, like)
		if numericKeyword := strings.TrimSpace(keyword); numericKeyword != "" {
			if inviterID, err := parseInvitationSearchID(numericKeyword); err == nil {
				query = query.Or("inviter_id = ? OR invitee_id = ?", inviterID, inviterID)
			}
		}
	}

	switch strings.TrimSpace(status) {
	case "pending_any":
		query = query.Where("register_reward_status = ? OR first_topup_reward_status = ?", InvitationRewardStatusPending, InvitationRewardStatusPending)
	case "pending_register":
		query = query.Where("register_reward_status = ?", InvitationRewardStatusPending)
	case "pending_first_topup":
		query = query.Where("first_topup_reward_status = ?", InvitationRewardStatusPending)
	case "approved_any":
		query = query.Where("register_reward_status = ? OR first_topup_reward_status = ?", InvitationRewardStatusApproved, InvitationRewardStatusApproved)
	case "rejected_any":
		query = query.Where("register_reward_status = ? OR first_topup_reward_status = ?", InvitationRewardStatusRejected, InvitationRewardStatusRejected)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		tx.Rollback()
		return nil, 0, nil, err
	}

	var records []*InvitationReward
	if err := query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&records).Error; err != nil {
		tx.Rollback()
		return nil, 0, nil, err
	}

	if err := fillInvitationRewardUsernames(tx, records); err != nil {
		tx.Rollback()
		return nil, 0, nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, 0, nil, err
	}

	registerIPs := make([]string, 0, len(records))
	registerFingerprints := make([]string, 0, len(records))
	topupFingerprints := make([]string, 0, len(records))
	paymentAccounts := make([]string, 0, len(records))
	for _, record := range records {
		if record == nil {
			continue
		}
		registerIPs = append(registerIPs, record.RegisterIP)
		registerFingerprints = append(registerFingerprints, record.RegisterDeviceFingerprint)
		if record.FirstTopupDeviceFingerprint != "" {
			topupFingerprints = append(topupFingerprints, record.FirstTopupDeviceFingerprint)
		}
		paymentAccounts = append(paymentAccounts, record.FirstTopupPaymentAccountHash)
	}

	ipCounts, err := listInvitationRiskCounts("register_ip", registerIPs)
	if err != nil {
		return nil, 0, nil, err
	}
	registerFingerprintCounts, err := listInvitationRiskCounts("register_device_fingerprint", registerFingerprints)
	if err != nil {
		return nil, 0, nil, err
	}
	topupFingerprintCounts, err := listInvitationRiskCounts("first_topup_device_fingerprint", topupFingerprints)
	if err != nil {
		return nil, 0, nil, err
	}
	paymentCounts, err := listInvitationRiskCounts("first_topup_payment_account_hash", paymentAccounts)
	if err != nil {
		return nil, 0, nil, err
	}

	riskCounts := map[string]map[string]int{
		"register_ip":          ipCounts,
		"register_fingerprint": registerFingerprintCounts,
		"topup_fingerprint":    topupFingerprintCounts,
		"payment_account":      paymentCounts,
	}
	return records, total, riskCounts, nil
}

func parseInvitationSearchID(keyword string) (int, error) {
	var value int
	if keyword == "" {
		return 0, errors.New("empty keyword")
	}
	for _, ch := range keyword {
		if ch < '0' || ch > '9' {
			return 0, errors.New("not numeric")
		}
		value = value*10 + int(ch-'0')
	}
	return value, nil
}

func getInvitationFirstTopupDisplayAmount(topUp *TopUp) float64 {
	if topUp == nil {
		return 0
	}

	// Token display mode stores top-up orders in base units, so use the
	// actual credited quota instead of the payment amount.
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		quotaToAdd := topUp.GetQuotaToAdd()
		if quotaToAdd > 0 {
			return float64(quotaToAdd)
		}
	}

	if topUp.Amount > 0 {
		return float64(topUp.Amount)
	}
	if topUp.CreditAmount > 0 {
		return float64(topUp.CreditAmount)
	}
	if topUp.Money > 0 {
		return topUp.Money
	}
	return 0
}

func applyInvitationFirstTopupReward(tx *gorm.DB, record *InvitationReward, topUp *TopUp, paymentAccount string) error {
	if tx == nil || record == nil || topUp == nil || record.InviteeId == 0 {
		return nil
	}

	if record.FirstTopupRewardStatus == InvitationRewardStatusPending ||
		record.FirstTopupRewardStatus == InvitationRewardStatusApproved ||
		record.FirstTopupRewardStatus == InvitationRewardStatusRejected {
		return nil
	}

	// The invitation relation should only ever bind to the first successful
	// top-up. Once captured, later top-ups must not overwrite it.
	if strings.TrimSpace(record.FirstTopupTradeNo) != "" ||
		record.FirstTopupAmount > 0 ||
		record.FirstTopupQualifiedAt > 0 {
		return nil
	}

	firstTopupAmount := getInvitationFirstTopupDisplayAmount(topUp)
	if firstTopupAmount <= 0 {
		return nil
	}

	now := common.GetTimestamp()
	displayAccount, accountHash := normalizePaymentAccount(paymentAccount)

	record.FirstTopupRewardStatus = InvitationRewardStatusNotTopup
	record.FirstTopupRewardQuota = 0
	record.FirstTopupTradeNo = topUp.TradeNo
	record.FirstTopupPaymentMethod = topUp.PaymentMethod
	record.FirstTopupPaymentOrderNo = topUp.PaymentOrderNo
	record.FirstTopupPaymentAccount = displayAccount
	record.FirstTopupPaymentAccountHash = accountHash
	record.FirstTopupAmount = firstTopupAmount
	record.FirstTopupIP = strings.TrimSpace(topUp.ClientIP)
	record.FirstTopupDeviceFingerprint = normalizeFingerprint(topUp.DeviceFingerprint)
	record.FirstTopupQualifiedAt = 0
	record.UpdatedTime = now

	threshold := operation_setting.InvitationFirstTopupThreshold
	rewardQuota := operation_setting.DisplayAmountToQuota(operation_setting.InvitationFirstTopupReward)
	if rewardQuota > 0 && (threshold <= 0 || firstTopupAmount >= threshold) {
		record.FirstTopupRewardStatus = InvitationRewardStatusPending
		record.FirstTopupRewardQuota = rewardQuota
		record.FirstTopupQualifiedAt = now
	}

	if err := tx.Save(record).Error; err != nil {
		return err
	}

	// Avoid writing logs through LOG_DB while the invitation reward transaction
	// is still open, which can stall SQLite and block the first-topup binding.
	return nil
}

func markInvitationFirstTopupReward(tx *gorm.DB, userId int, topUp *TopUp, paymentAccount string) error {
	if tx == nil || userId == 0 || topUp == nil {
		return nil
	}

	var record InvitationReward
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("invitee_id = ?", userId).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	if record.FirstTopupRewardStatus == InvitationRewardStatusPending ||
		record.FirstTopupRewardStatus == InvitationRewardStatusApproved ||
		record.FirstTopupRewardStatus == InvitationRewardStatusRejected {
		return nil
	}

	threshold := operation_setting.InvitationFirstTopupThreshold
	if threshold > 0 && topUp.Money < threshold {
		return nil
	}

	rewardQuota := operation_setting.DisplayAmountToQuota(operation_setting.InvitationFirstTopupReward)
	if rewardQuota <= 0 {
		return nil
	}

	displayAccount, accountHash := normalizePaymentAccount(paymentAccount)
	record.FirstTopupRewardStatus = InvitationRewardStatusPending
	record.FirstTopupRewardQuota = rewardQuota
	record.FirstTopupTradeNo = topUp.TradeNo
	record.FirstTopupPaymentMethod = topUp.PaymentMethod
	record.FirstTopupPaymentOrderNo = topUp.PaymentOrderNo
	record.FirstTopupPaymentAccount = displayAccount
	record.FirstTopupPaymentAccountHash = accountHash
	record.FirstTopupAmount = topUp.Money
	record.FirstTopupIP = strings.TrimSpace(topUp.ClientIP)
	record.FirstTopupDeviceFingerprint = normalizeFingerprint(topUp.DeviceFingerprint)
	record.FirstTopupQualifiedAt = common.GetTimestamp()
	record.UpdatedTime = common.GetTimestamp()

	if err := tx.Save(&record).Error; err != nil {
		return err
	}
	return nil
}

func markInvitationFirstTopupRewardOnce(tx *gorm.DB, userId int, topUp *TopUp, paymentAccount string) error {
	if tx == nil || userId == 0 || topUp == nil {
		return nil
	}

	var record InvitationReward
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("invitee_id = ?", userId).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	return applyInvitationFirstTopupReward(tx, &record, topUp, paymentAccount)
}

func SyncInvitationFirstTopupRewards() error {
	return DB.Transaction(func(tx *gorm.DB) error {
		var records []*InvitationReward
		if err := tx.
			Where("first_topup_trade_no = ''").
			Where("first_topup_amount = ?", 0).
			Where("first_topup_qualified_at = ?", 0).
			Where("first_topup_reward_status = ? OR first_topup_reward_status = ?", InvitationRewardStatusNotTopup, InvitationRewardStatusNone).
			Find(&records).Error; err != nil {
			return err
		}

		for _, record := range records {
			if record == nil || record.InviteeId == 0 {
				continue
			}

			var firstTopup TopUp
			result := tx.
				Where("user_id = ? AND status = ?", record.InviteeId, common.TopUpStatusSuccess).
				Order("complete_time asc").
				Order("id asc").
				Limit(1).
				Find(&firstTopup)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				continue
			}

			if err := applyInvitationFirstTopupReward(tx, record, &firstTopup, ""); err != nil {
				return err
			}
		}

		return nil
	})
}

func TriggerInvitationFirstTopupRewardSync() {
	now := common.GetTimestamp()
	lastRun := invitationFirstTopupSyncLastRun.Load()
	if lastRun > 0 && now-lastRun < 30 {
		return
	}
	if !invitationFirstTopupSyncRunning.CompareAndSwap(false, true) {
		return
	}
	invitationFirstTopupSyncLastRun.Store(now)

	go func() {
		defer invitationFirstTopupSyncRunning.Store(false)
		if err := SyncInvitationFirstTopupRewards(); err != nil {
			common.SysError("sync invitation first topup rewards failed: " + err.Error())
		}
	}()
}

func creditInvitationRewardTx(tx *gorm.DB, inviterId int, quota int) error {
	if quota <= 0 || inviterId == 0 {
		return nil
	}
	return tx.Model(&User{}).Where("id = ?", inviterId).Updates(map[string]interface{}{
		"aff_quota":   gorm.Expr("aff_quota + ?", quota),
		"aff_history": gorm.Expr("aff_history + ?", quota),
	}).Error
}

func ReviewInvitationReward(recordId int, reviewType string, action string, reviewerId int, rejectReason string) error {
	if recordId == 0 {
		return errors.New("invalid invitation reward id")
	}

	action = strings.TrimSpace(action)
	rejectReason = strings.TrimSpace(rejectReason)
	if action == "reject" && rejectReason == "" {
		return errors.New("请填写驳回理由")
	}

	logUserId := 0
	logContent := ""

	err := DB.Transaction(func(tx *gorm.DB) error {
		record := &InvitationReward{}
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", recordId).First(record).Error; err != nil {
			return err
		}

		now := common.GetTimestamp()
		switch reviewType {
		case InvitationRewardReviewTypeRegister:
			if record.RegisterRewardStatus != InvitationRewardStatusPending {
				return errors.New("首次邀请奖励当前不可审核")
			}
			if action == "approve" {
				if record.RegisterRewardQuota <= 0 {
					return errors.New("首次邀请奖励金额无效")
				}
				if err := creditInvitationRewardTx(tx, record.InviterId, record.RegisterRewardQuota); err != nil {
					return err
				}
				record.RegisterRewardStatus = InvitationRewardStatusApproved
				record.RegisterRewardRejectReason = ""
				logUserId = record.InviterId
				logContent = fmt.Sprintf("邀请好友 %s 的首次邀请奖励审核通过，已发放 %s 到邀请余额", record.InviteeMaskedDisplay, logger.LogQuota(record.RegisterRewardQuota))
			} else if action == "reject" {
				record.RegisterRewardStatus = InvitationRewardStatusRejected
				record.RegisterRewardRejectReason = rejectReason
				logUserId = record.InviterId
				logContent = fmt.Sprintf("邀请好友 %s 的首次邀请奖励已驳回", record.InviteeMaskedDisplay)
			} else {
				return errors.New("invalid review action")
			}
			record.RegisterRewardReviewedAt = now
			record.RegisterRewardReviewedBy = reviewerId
		case InvitationRewardReviewTypeTopup:
			if record.FirstTopupRewardStatus != InvitationRewardStatusPending {
				return errors.New("首充奖励当前不可审核")
			}
			if action == "approve" {
				if record.FirstTopupRewardQuota <= 0 {
					return errors.New("首充奖励金额无效")
				}
				if err := creditInvitationRewardTx(tx, record.InviterId, record.FirstTopupRewardQuota); err != nil {
					return err
				}
				record.FirstTopupRewardStatus = InvitationRewardStatusApproved
				record.FirstTopupRejectReason = ""
				logUserId = record.InviterId
				logContent = fmt.Sprintf("邀请好友 %s 的首充奖励审核通过，已发放 %s 到邀请余额", record.InviteeMaskedDisplay, logger.LogQuota(record.FirstTopupRewardQuota))
			} else if action == "reject" {
				record.FirstTopupRewardStatus = InvitationRewardStatusRejected
				record.FirstTopupRejectReason = rejectReason
				logUserId = record.InviterId
				logContent = fmt.Sprintf("邀请好友 %s 的首充奖励已驳回", record.InviteeMaskedDisplay)
			} else {
				return errors.New("invalid review action")
			}
			record.FirstTopupReviewedAt = now
			record.FirstTopupReviewedBy = reviewerId
		default:
			return errors.New("invalid review type")
		}

		record.UpdatedTime = now
		return tx.Save(record).Error
	})
	if err != nil {
		return err
	}
	if logUserId != 0 && logContent != "" {
		RecordLog(logUserId, LogTypeSystem, logContent)
	}
	return nil
}
