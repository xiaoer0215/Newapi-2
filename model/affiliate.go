package model

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

const (
	AffiliateWithdrawalStatusPending  = "pending"
	AffiliateWithdrawalStatusApproved = "approved"
	AffiliateWithdrawalStatusRejected = "rejected"
	AffiliateWithdrawalStatusPaid     = "paid"
)

type AffiliateWithdrawal struct {
	Id          int    `json:"id"`
	UserId      int    `json:"user_id" gorm:"index"`
	Amount      int    `json:"amount" gorm:"type:int;not null"`
	Status      string `json:"status" gorm:"type:varchar(32);index"`
	AccountType string `json:"account_type" gorm:"type:varchar(64)"`
	AccountNo   string `json:"account_no" gorm:"type:varchar(255)"`
	AccountName string `json:"account_name" gorm:"type:varchar(255)"`
	Note        string `json:"note" gorm:"type:text"`
	ReviewNote  string `json:"review_note" gorm:"type:text"`
	ReviewerId  int    `json:"reviewer_id" gorm:"type:int;default:0"`
	ProcessedAt int64  `json:"processed_at" gorm:"type:bigint;default:0"`
	CreatedAt   int64  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   int64  `json:"updated_at" gorm:"autoUpdateTime"`
}

type AffiliateCommissionRecord struct {
	Id                           int     `json:"id"`
	UserId                       int     `json:"user_id" gorm:"index"`
	InviterId                    int     `json:"inviter_id" gorm:"index"`
	TopUpId                      int     `json:"top_up_id" gorm:"index"`
	TradeNo                      string  `json:"trade_no" gorm:"type:varchar(255);uniqueIndex"`
	TopUpQuota                   int     `json:"top_up_quota" gorm:"type:int;not null"`
	TopUpMoney                   float64 `json:"top_up_money" gorm:"type:decimal(18,6);not null;default:0"`
	CommissionQuota              int     `json:"commission_quota" gorm:"type:int;not null"`
	CommissionPercentageSnapshot float64 `json:"commission_percentage_snapshot" gorm:"type:decimal(10,4);not null"`
	CreatedAt                    int64   `json:"created_at" gorm:"autoCreateTime"`
}

type AffiliateInviteRelation struct {
	InviterId          int     `json:"inviter_id"`
	InviterUsername    string  `json:"inviter_username"`
	InviterDisplayName string  `json:"inviter_display_name"`
	InviteeId          int     `json:"invitee_id"`
	InviteeUsername    string  `json:"invitee_username"`
	InviteeDisplayName string  `json:"invitee_display_name"`
	InviteeEmail       string  `json:"invitee_email"`
	CreatedAt          int64   `json:"created_at"`
	TopUpMoney         float64 `json:"top_up_money"`
	CommissionQuota    int     `json:"commission_quota"`
	CommissionCount    int     `json:"commission_count"`
}

type AffiliateLeaderboardItem struct {
	InviterId          int     `json:"inviter_id"`
	InviterUsername    string  `json:"inviter_username"`
	InviterDisplayName string  `json:"inviter_display_name"`
	InviteCount        int     `json:"invite_count"`
	TopUpMoney         float64 `json:"top_up_money"`
	CommissionQuota    int     `json:"commission_quota"`
	CommissionCount    int     `json:"commission_count"`
}

type AdminAffiliateCommissionRecord struct {
	Id                           int     `json:"id"`
	UserId                       int     `json:"user_id"`
	UserUsername                 string  `json:"user_username"`
	UserDisplayName              string  `json:"user_display_name"`
	InviterId                    int     `json:"inviter_id"`
	InviterUsername              string  `json:"inviter_username"`
	InviterDisplayName           string  `json:"inviter_display_name"`
	TopUpId                      int     `json:"top_up_id"`
	TradeNo                      string  `json:"trade_no"`
	TopUpQuota                   int     `json:"top_up_quota"`
	TopUpMoney                   float64 `json:"top_up_money"`
	CommissionQuota              int     `json:"commission_quota"`
	CommissionPercentageSnapshot float64 `json:"commission_percentage_snapshot"`
	CreatedAt                    int64   `json:"created_at"`
}

type AdminAffiliateTotalRankItem struct {
	Rank                  int     `json:"rank"`
	UserId                int     `json:"user_id"`
	Username              string  `json:"username"`
	DisplayName           string  `json:"display_name"`
	InviteCount           int     `json:"invite_count"`
	AffQuota              int     `json:"aff_quota"`
	AffHistoryQuota       int     `json:"aff_history_quota"`
	TopUpMoney            float64 `json:"top_up_money"`
	CommissionQuota       int     `json:"commission_quota"`
	CommissionCount       int     `json:"commission_count"`
	WithdrawPendingQuota  int     `json:"withdraw_pending_quota"`
	WithdrawApprovedQuota int     `json:"withdraw_approved_quota"`
	WithdrawPaidQuota     int     `json:"withdraw_paid_quota"`
	WithdrawTotalQuota    int     `json:"withdraw_total_quota"`
	TransferredQuota      int     `json:"transferred_quota"`
}

type AffiliateSummary struct {
	AffCode                       string                           `json:"aff_code"`
	AffCount                      int                              `json:"aff_count"`
	AffQuota                      int                              `json:"aff_quota"`
	AffHistoryQuota               int                              `json:"aff_history_quota"`
	AffiliateWithdrawingQuota     int                              `json:"affiliate_withdrawing_quota"`
	AffiliateCommissionPercentage float64                          `json:"affiliate_commission_percentage"`
	AffiliateCommissionTiers      []common.AffiliateCommissionTier `json:"affiliate_commission_tiers"`
	CurrentAffiliateTier          common.AffiliateCommissionTier   `json:"current_affiliate_tier"`
	NextAffiliateTier             *common.AffiliateCommissionTier  `json:"next_affiliate_tier,omitempty"`
	CurrentAffiliateLevel         int                              `json:"current_affiliate_level"`
	RemainingInvitesForNextLevel  int                              `json:"remaining_invites_for_next_level"`
	AffiliateTransferEnabled      bool                             `json:"affiliate_transfer_enabled"`
	AffiliateWithdrawEnabled      bool                             `json:"affiliate_withdraw_enabled"`
	AffiliateMinWithdrawQuota     int                              `json:"affiliate_min_withdraw_quota"`
	AffiliateLeaderboardEnabled   bool                             `json:"affiliate_leaderboard_enabled"`
}

func ensureAffiliateCode(user *User) error {
	if user.AffCode != "" {
		return nil
	}
	user.AffCode = common.GetRandomString(4)
	return DB.Model(user).Update("aff_code", user.AffCode).Error
}

func getDistinctAffiliateInviteeCount(tx *gorm.DB, inviterId int) (int64, error) {
	if tx == nil {
		tx = DB
	}
	if inviterId == 0 {
		return 0, nil
	}

	unionSQL := `
		SELECT invitee_id FROM (
			SELECT id AS invitee_id FROM users WHERE inviter_id = ?
			UNION
			SELECT invitee_id FROM invitation_rewards WHERE inviter_id = ? AND invitee_id > 0
		) AS affiliate_invitees
	`
	var count int64
	err := tx.Raw("SELECT COUNT(*) FROM ("+unionSQL+") AS counted_affiliate_invitees", inviterId, inviterId).Scan(&count).Error
	return count, err
}

func GetEffectiveAffiliateInviteCount(inviterId int) (int64, error) {
	return getDistinctAffiliateInviteeCount(DB, inviterId)
}

func GetAffiliateSummary(userId int) (*AffiliateSummary, error) {
	user, err := GetUserById(userId, true)
	if err != nil {
		return nil, err
	}
	if err := ensureAffiliateCode(user); err != nil {
		return nil, err
	}
	effectiveAffCount64, err := GetEffectiveAffiliateInviteCount(userId)
	if err != nil {
		return nil, err
	}
	effectiveAffCount := int(effectiveAffCount64)
	if effectiveAffCount < user.AffCount {
		effectiveAffCount = user.AffCount
	}
	currentTier := common.GetAffiliateCommissionTierByInviteCount(effectiveAffCount)
	nextTier, hasNextTier := common.GetNextAffiliateCommissionTier(effectiveAffCount)
	remainingInvites := 0
	if hasNextTier && nextTier.MinInvites > effectiveAffCount {
		remainingInvites = nextTier.MinInvites - effectiveAffCount
	}
	withdrawingQuota, err := GetUserAffiliateWithdrawingQuota(userId)
	if err != nil {
		return nil, err
	}

	summary := &AffiliateSummary{
		AffCode:                       user.AffCode,
		AffCount:                      effectiveAffCount,
		AffQuota:                      user.AffQuota,
		AffHistoryQuota:               user.AffHistoryQuota,
		AffiliateWithdrawingQuota:     withdrawingQuota,
		AffiliateCommissionPercentage: currentTier.Percentage,
		AffiliateCommissionTiers:      common.GetAffiliateCommissionTiersCopy(),
		CurrentAffiliateTier:          currentTier,
		CurrentAffiliateLevel:         currentTier.Level,
		RemainingInvitesForNextLevel:  remainingInvites,
		AffiliateTransferEnabled:      common.AffiliateTransferEnabled,
		AffiliateWithdrawEnabled:      common.AffiliateWithdrawEnabled,
		AffiliateMinWithdrawQuota:     common.AffiliateMinWithdrawQuota,
		AffiliateLeaderboardEnabled:   common.AffiliateLeaderboardEnabled,
	}
	if hasNextTier {
		summary.NextAffiliateTier = &nextTier
	}
	return summary, nil
}

func calculateTopUpQuota(topUp *TopUp) int {
	if topUp == nil {
		return 0
	}
	return topUp.GetQuotaToAdd()
}

func calculateAffiliateCommissionBaseQuota(topUp *TopUp) int {
	if topUp == nil || topUp.Money <= 0 {
		return 0
	}

	money := decimal.NewFromFloat(topUp.Money)
	quotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
	if quotaPerUnit.LessThanOrEqual(decimal.Zero) {
		quotaPerUnit = decimal.NewFromInt(1)
	}

	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeCNY {
		rate := operation_setting.GetUsdToCurrencyRate(operation_setting.USDExchangeRate)
		if rate <= 0 {
			rate = 1
		}
		money = money.Div(decimal.NewFromFloat(rate))
	}

	quota := money.Mul(quotaPerUnit).Floor().IntPart()
	if quota <= 0 {
		return 0
	}
	return int(quota)
}

func ApplyAffiliateCommission(tx *gorm.DB, userId int, quotaToAdd int) (int, int, float64, error) {
	if tx == nil {
		return 0, 0, 0, errors.New("tx is nil")
	}
	if quotaToAdd <= 0 || common.GetMaxAffiliateCommissionPercentage() <= 0 {
		return 0, 0, 0, nil
	}

	var user User
	if err := tx.Select("id", "inviter_id").Where("id = ?", userId).First(&user).Error; err != nil {
		return 0, 0, 0, err
	}
	if user.InviterId == 0 || user.InviterId == user.Id {
		return 0, 0, 0, nil
	}

	var inviter User
	if err := tx.Select("id", "aff_count").Where("id = ?", user.InviterId).First(&inviter).Error; err != nil {
		return 0, 0, 0, err
	}

	effectiveAffCount64, err := getDistinctAffiliateInviteeCount(tx, inviter.Id)
	if err != nil {
		return 0, 0, 0, err
	}
	effectiveAffCount := int(effectiveAffCount64)
	if effectiveAffCount < inviter.AffCount {
		effectiveAffCount = inviter.AffCount
	}

	commissionPercentage := common.GetAffiliateCommissionPercentageByInviteCount(effectiveAffCount)
	if commissionPercentage <= 0 {
		return 0, 0, 0, nil
	}

	commissionQuota := int(math.Floor(float64(quotaToAdd) * commissionPercentage / 100))
	if commissionQuota <= 0 {
		return 0, 0, 0, nil
	}

	if err := tx.Model(&User{}).Where("id = ?", user.InviterId).Updates(map[string]interface{}{
		"aff_quota":   gorm.Expr("aff_quota + ?", commissionQuota),
		"aff_history": gorm.Expr("aff_history + ?", commissionQuota),
	}).Error; err != nil {
		return 0, 0, 0, err
	}

	return user.InviterId, commissionQuota, commissionPercentage, nil
}

func SettleAffiliateCommissionWithTx(tx *gorm.DB, topUp *TopUp, quotaToAdd int) (*AffiliateCommissionRecord, error) {
	if tx == nil {
		return nil, errors.New("tx is nil")
	}
	if topUp == nil || strings.TrimSpace(topUp.TradeNo) == "" || quotaToAdd <= 0 || common.GetMaxAffiliateCommissionPercentage() <= 0 {
		return nil, nil
	}

	existing := &AffiliateCommissionRecord{}
	if err := tx.Where("trade_no = ?", topUp.TradeNo).First(existing).Error; err == nil {
		return existing, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	inviterId, commissionQuota, commissionPercentage, err := ApplyAffiliateCommission(tx, topUp.UserId, quotaToAdd)
	if err != nil {
		return nil, err
	}
	if inviterId == 0 || commissionQuota <= 0 {
		return nil, nil
	}

	record := &AffiliateCommissionRecord{
		UserId:                       topUp.UserId,
		InviterId:                    inviterId,
		TopUpId:                      topUp.Id,
		TradeNo:                      topUp.TradeNo,
		TopUpQuota:                   quotaToAdd,
		TopUpMoney:                   topUp.Money,
		CommissionQuota:              commissionQuota,
		CommissionPercentageSnapshot: commissionPercentage,
	}
	if err := tx.Create(record).Error; err != nil {
		return nil, err
	}
	return record, nil
}

func SettleAffiliateCommissionByTradeNo(tradeNo string) (*AffiliateCommissionRecord, error) {
	if strings.TrimSpace(tradeNo) == "" || common.GetMaxAffiliateCommissionPercentage() <= 0 {
		return nil, nil
	}

	var created *AffiliateCommissionRecord
	err := DB.Transaction(func(tx *gorm.DB) error {
		topUp := &TopUp{}
		refCol := "`trade_no`"
		if common.UsingPostgreSQL {
			refCol = `"trade_no"`
		}
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where(refCol+" = ?", tradeNo).First(topUp).Error; err != nil {
			return err
		}
		if topUp.Status != common.TopUpStatusSuccess {
			return nil
		}

		existing := &AffiliateCommissionRecord{}
		if err := tx.Where("trade_no = ?", tradeNo).First(existing).Error; err == nil {
			created = existing
			return nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		quotaToAdd := calculateAffiliateCommissionBaseQuota(topUp)
		if quotaToAdd <= 0 {
			return nil
		}

		record, err := SettleAffiliateCommissionWithTx(tx, topUp, quotaToAdd)
		if err != nil {
			return err
		}
		created = record
		return nil
	})
	if err != nil {
		return nil, err
	}
	if created != nil && created.Id != 0 {
		RecordLog(created.InviterId, LogTypeSystem, fmt.Sprintf("affiliate commission settled: %s from user %d", logger.LogQuota(created.CommissionQuota), created.UserId))
	}
	return created, nil
}

func BackfillHistoricalAffiliateCommissions(batchSize int) (int, error) {
	if common.GetMaxAffiliateCommissionPercentage() <= 0 {
		return 0, nil
	}
	if !DB.Migrator().HasTable("top_ups") || !DB.Migrator().HasTable("users") || !DB.Migrator().HasTable("affiliate_commission_records") {
		return 0, nil
	}
	if batchSize <= 0 || batchSize > 500 {
		batchSize = 200
	}

	backfilled := 0
	lastId := 0
	for {
		topUps := make([]TopUp, 0, batchSize)
		err := DB.Model(&TopUp{}).
			Select("top_ups.*").
			Joins("JOIN users ON users.id = top_ups.user_id").
			Where("top_ups.id > ?", lastId).
			Where("top_ups.status = ?", common.TopUpStatusSuccess).
			Where("top_ups.trade_no <> ''").
			Where("COALESCE(users.inviter_id, 0) > 0").
			Where("users.inviter_id <> top_ups.user_id").
			Where("NOT EXISTS (SELECT 1 FROM affiliate_commission_records AS acr WHERE acr.trade_no = top_ups.trade_no)").
			Order("top_ups.id ASC").
			Limit(batchSize).
			Find(&topUps).Error
		if err != nil {
			return backfilled, err
		}
		if len(topUps) == 0 {
			break
		}

		for i := range topUps {
			if topUps[i].Id > lastId {
				lastId = topUps[i].Id
			}
			record, err := SettleAffiliateCommissionByTradeNo(topUps[i].TradeNo)
			if err != nil {
				return backfilled, err
			}
			if record != nil && record.Id != 0 {
				backfilled++
			}
		}
		if len(topUps) < batchSize {
			break
		}
	}

	return backfilled, nil
}

func GetUserAffiliateCommissionRecords(userId int, pageInfo *common.PageInfo) ([]*AffiliateCommissionRecord, int64, error) {
	var items []*AffiliateCommissionRecord
	var total int64
	tx := DB.Model(&AffiliateCommissionRecord{}).Where("inviter_id = ?", userId)
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := tx.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func GetAffiliateInvitees(userId int, pageInfo *common.PageInfo) ([]*AffiliateInviteRelation, int64, error) {
	var items []*AffiliateInviteRelation
	var total int64

	unionSQL := `
		SELECT invitee_id, MIN(bound_time) AS bound_time FROM (
			SELECT id AS invitee_id, 0 AS bound_time FROM users WHERE inviter_id = ?
			UNION ALL
			SELECT invitee_id, COALESCE(created_time, 0) AS bound_time FROM invitation_rewards WHERE inviter_id = ? AND invitee_id > 0
		) AS raw_affiliate_invitees
		GROUP BY invitee_id
	`

	tx := DB.Table("("+unionSQL+") AS rel", userId, userId).
		Select(`
			invitee.id AS invitee_id,
			invitee.username AS invitee_username,
			invitee.display_name AS invitee_display_name,
			invitee.email AS invitee_email,
			COALESCE(rel.bound_time, 0) AS created_at,
			inviter.id AS inviter_id,
			inviter.username AS inviter_username,
			inviter.display_name AS inviter_display_name
		`).
		Joins("JOIN users AS invitee ON invitee.id = rel.invitee_id").
		Joins("LEFT JOIN users AS inviter ON inviter.id = ?", userId)

	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := tx.Order("rel.bound_time desc, invitee.id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Scan(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func GetAdminAffiliateInviteRelations(pageInfo *common.PageInfo, keyword string) ([]*AffiliateInviteRelation, int64, error) {
	var items []*AffiliateInviteRelation
	var total int64

	unionSQL := `
		SELECT inviter_id, invitee_id, MIN(bound_time) AS bound_time FROM (
			SELECT inviter_id, id AS invitee_id, 0 AS bound_time FROM users WHERE inviter_id > 0
			UNION ALL
			SELECT inviter_id, invitee_id, COALESCE(created_time, 0) AS bound_time FROM invitation_rewards WHERE inviter_id > 0 AND invitee_id > 0
		) AS raw_affiliate_relations
		GROUP BY inviter_id, invitee_id
	`
	commissionSQL := `
		SELECT inviter_id, user_id AS invitee_id, COALESCE(SUM(top_up_money), 0) AS top_up_money, COALESCE(SUM(commission_quota), 0) AS commission_quota, COUNT(*) AS commission_count
		FROM affiliate_commission_records
		GROUP BY inviter_id, user_id
	`

	tx := DB.Table("(" + unionSQL + ") AS rel").
		Select(`
			invitee.id AS invitee_id,
			invitee.username AS invitee_username,
			invitee.display_name AS invitee_display_name,
			invitee.email AS invitee_email,
			COALESCE(rel.bound_time, 0) AS created_at,
			inviter.id AS inviter_id,
			inviter.username AS inviter_username,
			inviter.display_name AS inviter_display_name,
			COALESCE(commission.top_up_money, 0) AS top_up_money,
			COALESCE(commission.commission_quota, 0) AS commission_quota,
			COALESCE(commission.commission_count, 0) AS commission_count
		`).
		Joins("JOIN users AS invitee ON invitee.id = rel.invitee_id").
		Joins("LEFT JOIN users AS inviter ON inviter.id = rel.inviter_id").
		Joins("LEFT JOIN (" + commissionSQL + ") AS commission ON commission.inviter_id = rel.inviter_id AND commission.invitee_id = rel.invitee_id")

	if strings.TrimSpace(keyword) != "" {
		pattern := "%" + strings.TrimSpace(keyword) + "%"
		tx = tx.Where(
			"invitee.username LIKE ? OR invitee.display_name LIKE ? OR invitee.email LIKE ? OR inviter.username LIKE ? OR inviter.display_name LIKE ?",
			pattern, pattern, pattern, pattern, pattern,
		)
	}

	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := tx.Order("rel.bound_time desc, invitee.id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Scan(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func GetAffiliateLeaderboard(limit int) ([]*AffiliateLeaderboardItem, error) {
	items := make([]*AffiliateLeaderboardItem, 0)
	if !common.AffiliateLeaderboardEnabled {
		return items, nil
	}
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	relationSQL := `
		SELECT inviter_id, COUNT(*) AS invite_count FROM (
			SELECT inviter_id, id AS invitee_id FROM users WHERE inviter_id > 0 AND id <> inviter_id
			UNION
			SELECT inviter_id, invitee_id FROM invitation_rewards WHERE inviter_id > 0 AND invitee_id > 0 AND invitee_id <> inviter_id
		) AS leaderboard_relations
		GROUP BY inviter_id
	`
	commissionSQL := `
		SELECT inviter_id, COALESCE(SUM(top_up_money), 0) AS top_up_money, COALESCE(SUM(commission_quota), 0) AS commission_quota, COUNT(*) AS commission_count
		FROM affiliate_commission_records
		GROUP BY inviter_id
	`

	err := DB.Table("(" + relationSQL + ") AS rel").
		Select(`
			inviter.id AS inviter_id,
			inviter.username AS inviter_username,
			inviter.display_name AS inviter_display_name,
			COALESCE(rel.invite_count, 0) AS invite_count,
			COALESCE(commission.top_up_money, 0) AS top_up_money,
			COALESCE(commission.commission_quota, 0) AS commission_quota,
			COALESCE(commission.commission_count, 0) AS commission_count
		`).
		Joins("JOIN users AS inviter ON inviter.id = rel.inviter_id").
		Joins("LEFT JOIN (" + commissionSQL + ") AS commission ON commission.inviter_id = rel.inviter_id").
		Order("commission_quota DESC, invite_count DESC, inviter_id ASC").
		Limit(limit).
		Scan(&items).Error
	return items, err
}

func GetAdminAffiliateTotalRanking(pageInfo *common.PageInfo, keyword string) ([]*AdminAffiliateTotalRankItem, int64, error) {
	var items []*AdminAffiliateTotalRankItem
	var total int64

	relationSQL := `
		SELECT inviter_id, COUNT(*) AS invite_count FROM (
			SELECT inviter_id, id AS invitee_id FROM users WHERE inviter_id > 0 AND id <> inviter_id
			UNION
			SELECT inviter_id, invitee_id FROM invitation_rewards WHERE inviter_id > 0 AND invitee_id > 0 AND invitee_id <> inviter_id
		) AS admin_total_relations
		GROUP BY inviter_id
	`
	commissionSQL := `
		SELECT inviter_id, COALESCE(SUM(top_up_money), 0) AS top_up_money, COALESCE(SUM(commission_quota), 0) AS commission_quota, COUNT(*) AS commission_count
		FROM affiliate_commission_records
		GROUP BY inviter_id
	`
	withdrawSQL := fmt.Sprintf(`
		SELECT user_id,
			COALESCE(SUM(CASE WHEN status = '%s' THEN amount ELSE 0 END), 0) AS withdraw_pending_quota,
			COALESCE(SUM(CASE WHEN status = '%s' THEN amount ELSE 0 END), 0) AS withdraw_approved_quota,
			COALESCE(SUM(CASE WHEN status = '%s' THEN amount ELSE 0 END), 0) AS withdraw_paid_quota,
			COALESCE(SUM(CASE WHEN status IN ('%s', '%s', '%s') THEN amount ELSE 0 END), 0) AS withdraw_total_quota
		FROM affiliate_withdrawals
		GROUP BY user_id
	`,
		AffiliateWithdrawalStatusPending,
		AffiliateWithdrawalStatusApproved,
		AffiliateWithdrawalStatusPaid,
		AffiliateWithdrawalStatusPending,
		AffiliateWithdrawalStatusApproved,
		AffiliateWithdrawalStatusPaid,
	)

	tx := DB.Table("users AS u").
		Select(`
			u.id AS user_id,
			u.username AS username,
			u.display_name AS display_name,
			COALESCE(rel.invite_count, 0) AS invite_count,
			COALESCE(u.aff_quota, 0) AS aff_quota,
			COALESCE(u.aff_history, 0) AS aff_history_quota,
			COALESCE(commission.top_up_money, 0) AS top_up_money,
			COALESCE(commission.commission_quota, 0) AS commission_quota,
			COALESCE(commission.commission_count, 0) AS commission_count,
			COALESCE(wd.withdraw_pending_quota, 0) AS withdraw_pending_quota,
			COALESCE(wd.withdraw_approved_quota, 0) AS withdraw_approved_quota,
			COALESCE(wd.withdraw_paid_quota, 0) AS withdraw_paid_quota,
			COALESCE(wd.withdraw_total_quota, 0) AS withdraw_total_quota,
			CASE
				WHEN COALESCE(u.aff_history, 0) - COALESCE(u.aff_quota, 0) - COALESCE(wd.withdraw_total_quota, 0) > 0
				THEN COALESCE(u.aff_history, 0) - COALESCE(u.aff_quota, 0) - COALESCE(wd.withdraw_total_quota, 0)
				ELSE 0
			END AS transferred_quota
		`).
		Joins("LEFT JOIN (" + relationSQL + ") AS rel ON rel.inviter_id = u.id").
		Joins("LEFT JOIN (" + commissionSQL + ") AS commission ON commission.inviter_id = u.id").
		Joins("LEFT JOIN (" + withdrawSQL + ") AS wd ON wd.user_id = u.id").
		Where(`
			COALESCE(u.aff_history, 0) > 0
			OR COALESCE(u.aff_quota, 0) > 0
			OR COALESCE(rel.invite_count, 0) > 0
			OR COALESCE(commission.commission_count, 0) > 0
			OR COALESCE(wd.withdraw_total_quota, 0) > 0
		`)

	keyword = strings.TrimSpace(keyword)
	if keyword != "" {
		pattern := "%" + keyword + "%"
		if userId, err := strconv.Atoi(keyword); err == nil && userId > 0 {
			tx = tx.Where("u.id = ? OR u.username LIKE ? OR u.display_name LIKE ? OR u.email LIKE ?", userId, pattern, pattern, pattern)
		} else {
			tx = tx.Where("u.username LIKE ? OR u.display_name LIKE ? OR u.email LIKE ?", pattern, pattern, pattern)
		}
	}

	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := tx.
		Order("aff_history_quota DESC, withdraw_total_quota DESC, invite_count DESC, user_id ASC").
		Limit(pageInfo.GetPageSize()).
		Offset(pageInfo.GetStartIdx()).
		Scan(&items).Error; err != nil {
		return nil, 0, err
	}

	startRank := pageInfo.GetStartIdx() + 1
	for i, item := range items {
		if item != nil {
			item.Rank = startRank + i
		}
	}
	return items, total, nil
}

func GetAdminAffiliateCommissionRecords(pageInfo *common.PageInfo, keyword string) ([]*AdminAffiliateCommissionRecord, int64, error) {
	var items []*AdminAffiliateCommissionRecord
	var total int64

	tx := DB.Table("affiliate_commission_records AS record").
		Select(`
			record.id AS id,
			record.user_id AS user_id,
			invitee.username AS user_username,
			invitee.display_name AS user_display_name,
			record.inviter_id AS inviter_id,
			inviter.username AS inviter_username,
			inviter.display_name AS inviter_display_name,
			record.top_up_id AS top_up_id,
			record.trade_no AS trade_no,
			record.top_up_quota AS top_up_quota,
			record.top_up_money AS top_up_money,
			record.commission_quota AS commission_quota,
			record.commission_percentage_snapshot AS commission_percentage_snapshot,
			record.created_at AS created_at
		`).
		Joins("LEFT JOIN users AS invitee ON invitee.id = record.user_id").
		Joins("LEFT JOIN users AS inviter ON inviter.id = record.inviter_id")

	if strings.TrimSpace(keyword) != "" {
		pattern := "%" + strings.TrimSpace(keyword) + "%"
		tx = tx.Where(
			"record.trade_no LIKE ? OR invitee.username LIKE ? OR invitee.display_name LIKE ? OR inviter.username LIKE ? OR inviter.display_name LIKE ?",
			pattern, pattern, pattern, pattern, pattern,
		)
	}

	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := tx.Order("record.id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Scan(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func CreateAffiliateWithdrawal(userId int, amount int, accountType string, accountNo string, accountName string, note string) (*AffiliateWithdrawal, error) {
	if !common.AffiliateWithdrawEnabled {
		return nil, errors.New("affiliate withdrawal is disabled")
	}
	accountType = strings.TrimSpace(accountType)
	accountNo = strings.TrimSpace(accountNo)
	accountName = strings.TrimSpace(accountName)
	note = strings.TrimSpace(note)
	if amount <= 0 {
		return nil, errors.New("withdrawal amount must be greater than zero")
	}
	if amount < common.AffiliateMinWithdrawQuota {
		return nil, fmt.Errorf("minimum withdrawal is %s", logger.LogQuota(common.AffiliateMinWithdrawQuota))
	}
	if accountType != "支付宝" && strings.ToLower(accountType) != "alipay" {
		return nil, errors.New("withdrawal only supports Alipay")
	}
	if accountNo == "" {
		return nil, errors.New("withdrawal account is required")
	}

	withdrawal := &AffiliateWithdrawal{}
	err := DB.Transaction(func(tx *gorm.DB) error {
		user := &User{}
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(user, userId).Error; err != nil {
			return err
		}
		if user.AffQuota < amount {
			return errors.New("affiliate quota is insufficient")
		}

		user.AffQuota -= amount
		if err := tx.Save(user).Error; err != nil {
			return err
		}

		withdrawal.UserId = userId
		withdrawal.Amount = amount
		withdrawal.Status = AffiliateWithdrawalStatusPending
		withdrawal.AccountType = "支付宝"
		withdrawal.AccountNo = accountNo
		withdrawal.AccountName = accountName
		withdrawal.Note = note
		return tx.Create(withdrawal).Error
	})
	if err != nil {
		return nil, err
	}

	RecordLog(userId, LogTypeSystem, fmt.Sprintf("affiliate withdrawal requested: %s", logger.LogQuota(amount)))
	return withdrawal, nil
}

func GetUserAffiliateWithdrawals(userId int) ([]*AffiliateWithdrawal, error) {
	var withdrawals []*AffiliateWithdrawal
	err := DB.Where("user_id = ?", userId).Order("id desc").Find(&withdrawals).Error
	return withdrawals, err
}

func GetUserAffiliateWithdrawingQuota(userId int) (int, error) {
	var total int64
	err := DB.Model(&AffiliateWithdrawal{}).
		Where("user_id = ? AND status IN ?", userId, []string{AffiliateWithdrawalStatusPending, AffiliateWithdrawalStatusApproved}).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&total).Error
	return int(total), err
}

func GetAffiliateWithdrawals(pageInfo *common.PageInfo, status string, keyword string) ([]*AffiliateWithdrawal, int64, error) {
	var withdrawals []*AffiliateWithdrawal
	var total int64

	tx := DB.Model(&AffiliateWithdrawal{})
	if strings.TrimSpace(status) != "" {
		tx = tx.Where("status = ?", strings.TrimSpace(status))
	}
	if strings.TrimSpace(keyword) != "" {
		pattern := "%" + strings.TrimSpace(keyword) + "%"
		tx = tx.Where("account_type LIKE ? OR account_no LIKE ? OR account_name LIKE ?", pattern, pattern, pattern)
	}

	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := tx.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&withdrawals).Error; err != nil {
		return nil, 0, err
	}
	return withdrawals, total, nil
}

func ReviewAffiliateWithdrawal(withdrawalId int, reviewerId int, status string, reviewNote string) (*AffiliateWithdrawal, error) {
	status = strings.TrimSpace(status)
	switch status {
	case AffiliateWithdrawalStatusApproved, AffiliateWithdrawalStatusRejected, AffiliateWithdrawalStatusPaid:
	default:
		return nil, errors.New("invalid withdrawal status")
	}

	var withdrawal AffiliateWithdrawal
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&withdrawal, withdrawalId).Error; err != nil {
			return err
		}
		if withdrawal.Status == AffiliateWithdrawalStatusRejected || withdrawal.Status == AffiliateWithdrawalStatusPaid {
			return errors.New("withdrawal already finalized")
		}

		if status == AffiliateWithdrawalStatusRejected {
			if err := tx.Model(&User{}).Where("id = ?", withdrawal.UserId).Update("aff_quota", gorm.Expr("aff_quota + ?", withdrawal.Amount)).Error; err != nil {
				return err
			}
		}

		withdrawal.Status = status
		withdrawal.ReviewerId = reviewerId
		withdrawal.ReviewNote = strings.TrimSpace(reviewNote)
		withdrawal.ProcessedAt = common.GetTimestamp()
		return tx.Save(&withdrawal).Error
	})
	if err != nil {
		return nil, err
	}

	RecordLog(withdrawal.UserId, LogTypeSystem, fmt.Sprintf("affiliate withdrawal status updated: %s", withdrawal.Status))
	return &withdrawal, nil
}
