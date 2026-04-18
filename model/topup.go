package model

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type TopUp struct {
	Id                int     `json:"id"`
	UserId            int     `json:"user_id" gorm:"index"`
	Username          string  `json:"username" gorm:"-"`
	Amount            int64   `json:"amount"`
	Money             float64 `json:"money"`
	TradeNo           string  `json:"trade_no" gorm:"unique;type:varchar(255);index"`
	PaymentOrderNo    string  `json:"payment_order_no" gorm:"type:varchar(255);default:'';index"`
	PaymentMethod     string  `json:"payment_method" gorm:"type:varchar(50)"`
	ClientIP          string  `json:"client_ip" gorm:"type:varchar(64);default:''"`
	DeviceFingerprint string  `json:"device_fingerprint" gorm:"type:varchar(128);default:'';index"`
	CreateTime        int64   `json:"create_time"`
	CompleteTime      int64   `json:"complete_time"`
	Status            string  `json:"status"`
	GiftAmount        int64   `json:"gift_amount" gorm:"default:0"`
	CreditAmount      int64   `json:"credit_amount" gorm:"default:0"`
}

type TopUpSummaryStats struct {
	YesterdayIncome   float64 `json:"yesterday_income"`
	TodayIncome       float64 `json:"today_income"`
	UnsuccessfulCount int64   `json:"unsuccessful_count"`
}

var ErrPaymentMethodMismatch = errors.New("payment method mismatch")

func (topUp *TopUp) Insert() error {
	return DB.Create(topUp).Error
}

func (topUp *TopUp) Update() error {
	return DB.Save(topUp).Error
}

func GetTopUpById(id int) *TopUp {
	var topUp TopUp
	if err := DB.Where("id = ?", id).First(&topUp).Error; err != nil {
		return nil
	}
	return &topUp
}

func GetTopUpByTradeNo(tradeNo string) *TopUp {
	var topUp TopUp
	if err := DB.Where("trade_no = ?", tradeNo).First(&topUp).Error; err != nil {
		return nil
	}
	return &topUp
}

func (topUp *TopUp) GetCreditDisplayAmount() int64 {
	if topUp == nil {
		return 0
	}
	if topUp.CreditAmount > 0 {
		return topUp.CreditAmount
	}
	if topUp.GiftAmount > 0 {
		return topUp.Amount + topUp.GiftAmount
	}
	return topUp.Amount
}

func (topUp *TopUp) GetQuotaToAdd() int {
	if topUp == nil {
		return 0
	}

	if topUp.PaymentMethod == "creem" {
		credited := topUp.CreditAmount
		if credited <= 0 {
			credited = topUp.Amount
		}
		if credited <= 0 {
			return 0
		}
		return int(credited)
	}

	if topUp.CreditAmount > 0 {
		dCreditAmount := decimal.NewFromInt(topUp.CreditAmount)
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		return int(dCreditAmount.Mul(dQuotaPerUnit).IntPart())
	}

	if topUp.PaymentMethod == "stripe" {
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		return int(decimal.NewFromFloat(topUp.Money).Mul(dQuotaPerUnit).IntPart())
	}

	dAmount := decimal.NewFromInt(topUp.Amount)
	dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
	return int(dAmount.Mul(dQuotaPerUnit).IntPart())
}

func fillTopUpUsernames(tx *gorm.DB, topups []*TopUp) error {
	if len(topups) == 0 {
		return nil
	}

	userIdMap := make(map[int]struct{}, len(topups))
	userIds := make([]int, 0, len(topups))
	for _, topUp := range topups {
		if topUp == nil {
			continue
		}
		if _, exists := userIdMap[topUp.UserId]; exists {
			continue
		}
		userIdMap[topUp.UserId] = struct{}{}
		userIds = append(userIds, topUp.UserId)
	}

	if len(userIds) == 0 {
		return nil
	}

	var users []*User
	if err := tx.Model(&User{}).Select("id, username").Where("id IN ?", userIds).Find(&users).Error; err != nil {
		return err
	}

	usernameMap := make(map[int]string, len(users))
	for _, user := range users {
		if user == nil {
			continue
		}
		usernameMap[user.Id] = user.Username
	}

	for _, topUp := range topups {
		if topUp == nil {
			continue
		}
		topUp.Username = usernameMap[topUp.UserId]
	}

	return nil
}

func buildAdminTopUpSearchQuery(tx *gorm.DB, keyword string) (*gorm.DB, error) {
	query := tx.Model(&TopUp{})
	if keyword == "" {
		return query, nil
	}

	like := "%" + keyword + "%"
	userIds := make([]int, 0)
	if err := tx.Model(&User{}).Where("username LIKE ?", like).Pluck("id", &userIds).Error; err != nil {
		return nil, err
	}

	if len(userIds) > 0 {
		query = query.Where("(trade_no LIKE ? OR payment_order_no LIKE ?) OR user_id IN ?", like, like, userIds)
	} else {
		query = query.Where("trade_no LIKE ? OR payment_order_no LIKE ?", like, like)
	}

	return query, nil
}

func applyPaymentOrderNo(record *TopUp, paymentOrderNo string) {
	if record == nil {
		return
	}
	paymentOrderNo = strings.TrimSpace(paymentOrderNo)
	if paymentOrderNo == "" {
		return
	}
	record.PaymentOrderNo = paymentOrderNo
}

func Recharge(referenceId string, customerId string, paymentOrderNo string) error {
	if referenceId == "" {
		return errors.New("payment reference is required")
	}

	var quotaToAdd int
	topUp := &TopUp{}

	refCol := "`trade_no`"
	if common.UsingPostgreSQL {
		refCol = `"trade_no"`
	}

	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where(refCol+" = ?", referenceId).First(topUp).Error; err != nil {
			return errors.New("\u5145\u503c\u8ba2\u5355\u4e0d\u5b58\u5728")
		}

		if topUp.PaymentMethod != "stripe" {
			return ErrPaymentMethodMismatch
		}

		if topUp.Status != common.TopUpStatusPending {
			return errors.New("topup order status is invalid")
		}

		topUp.CompleteTime = common.GetTimestamp()
		topUp.Status = common.TopUpStatusSuccess
		applyPaymentOrderNo(topUp, paymentOrderNo)
		if err := tx.Save(topUp).Error; err != nil {
			return err
		}

		quotaToAdd = topUp.GetQuotaToAdd()
		if quotaToAdd <= 0 {
			return errors.New("invalid topup quota")
		}

		if err := tx.Model(&User{}).Where("id = ?", topUp.UserId).Updates(map[string]interface{}{
			"stripe_customer": customerId,
			"quota":           gorm.Expr("quota + ?", quotaToAdd),
		}).Error; err != nil {
			return err
		}
		return markInvitationFirstTopupRewardOnce(tx, topUp.UserId, topUp, customerId)
	})
	if err != nil {
		common.SysError("topup failed: " + err.Error())
		return errors.New("topup failed, please retry later")
	}

	RecordLog(topUp.UserId, LogTypeTopup, fmt.Sprintf("\u4f7f\u7528\u5728\u7ebf\u5145\u503c\u6210\u529f\uff0c\u5230\u8d26\u989d\u5ea6\uff1a%v\uff0c\u652f\u4ed8\u91d1\u989d\uff1a%.2f", logger.FormatQuota(quotaToAdd), topUp.Money))
	return nil
}

func GetUserTopUps(userId int, pageInfo *common.PageInfo) (topups []*TopUp, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err = tx.Model(&TopUp{}).Where("user_id = ?", userId).Count(&total).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Where("user_id = ?", userId).Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&topups).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return topups, total, nil
}

func GetAllTopUps(pageInfo *common.PageInfo) (topups []*TopUp, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err = tx.Model(&TopUp{}).Count(&total).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&topups).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = fillTopUpUsernames(tx, topups); err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return topups, total, nil
}

func SearchUserTopUps(userId int, keyword string, pageInfo *common.PageInfo) (topups []*TopUp, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	query := tx.Model(&TopUp{}).Where("user_id = ?", userId)
	if keyword != "" {
		like := "%%" + keyword + "%%"
		query = query.Where("(trade_no LIKE ? OR payment_order_no LIKE ?)", like, like)
	}

	if err = query.Count(&total).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&topups).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}
	return topups, total, nil
}

func SearchAllTopUps(keyword string, pageInfo *common.PageInfo) (topups []*TopUp, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	query, err := buildAdminTopUpSearchQuery(tx, keyword)
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = query.Count(&total).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&topups).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = fillTopUpUsernames(tx, topups); err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}
	return topups, total, nil
}

func GetTopUpSummaryStats() (*TopUpSummaryStats, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()
	yesterdayStart := todayStart - 86400
	tomorrowStart := todayStart + 86400

	stats := &TopUpSummaryStats{}

	if err := DB.Model(&TopUp{}).
		Where("status = ? AND complete_time >= ? AND complete_time < ?", common.TopUpStatusSuccess, yesterdayStart, todayStart).
		Select("COALESCE(SUM(money), 0)").
		Scan(&stats.YesterdayIncome).Error; err != nil {
		return nil, err
	}

	if err := DB.Model(&TopUp{}).
		Where("status = ? AND complete_time >= ? AND complete_time < ?", common.TopUpStatusSuccess, todayStart, tomorrowStart).
		Select("COALESCE(SUM(money), 0)").
		Scan(&stats.TodayIncome).Error; err != nil {
		return nil, err
	}

	if err := DB.Model(&TopUp{}).
		Where("status <> ?", common.TopUpStatusSuccess).
		Count(&stats.UnsuccessfulCount).Error; err != nil {
		return nil, err
	}

	return stats, nil
}

func completeTopUp(tradeNo string, paymentOrderNo string) (userId int, quotaToAdd int, payMoney float64, err error) {
	if tradeNo == "" {
		return 0, 0, 0, errors.New("trade no is required")
	}

	refCol := "`trade_no`"
	if common.UsingPostgreSQL {
		refCol = `"trade_no"`
	}

	err = DB.Transaction(func(tx *gorm.DB) error {
		topUp := &TopUp{}
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where(refCol+" = ?", tradeNo).First(topUp).Error; err != nil {
			return errors.New("topup order not found")
		}

		if topUp.Status == common.TopUpStatusSuccess {
			return nil
		}
		if topUp.Status != common.TopUpStatusPending {
			return errors.New("topup order status is invalid")
		}

		quotaToAdd = topUp.GetQuotaToAdd()
		if quotaToAdd <= 0 {
			return errors.New("invalid topup quota")
		}

		topUp.CompleteTime = common.GetTimestamp()
		topUp.Status = common.TopUpStatusSuccess
		applyPaymentOrderNo(topUp, paymentOrderNo)
		if err := tx.Save(topUp).Error; err != nil {
			return err
		}

		if err := tx.Model(&User{}).Where("id = ?", topUp.UserId).Update("quota", gorm.Expr("quota + ?", quotaToAdd)).Error; err != nil {
			return err
		}

		if err := markInvitationFirstTopupRewardOnce(tx, topUp.UserId, topUp, ""); err != nil {
			return err
		}

		userId = topUp.UserId
		payMoney = topUp.Money
		return nil
	})
	if err != nil {
		return 0, 0, 0, err
	}

	return userId, quotaToAdd, payMoney, nil
}

func CompleteTopUp(tradeNo string) error {
	userId, quotaToAdd, payMoney, err := completeTopUp(tradeNo, "")
	if err != nil {
		return err
	}
	if quotaToAdd > 0 {
		RecordLog(userId, LogTypeTopup, fmt.Sprintf("\u4f7f\u7528\u5728\u7ebf\u5145\u503c\u6210\u529f\uff0c\u5230\u8d26\u989d\u5ea6\uff1a%v\uff0c\u652f\u4ed8\u91d1\u989d\uff1a%.2f", logger.FormatQuota(quotaToAdd), payMoney))
	}
	return nil
}

func CompleteTopUpWithPaymentOrderNo(tradeNo string, paymentOrderNo string) error {
	userId, quotaToAdd, payMoney, err := completeTopUp(tradeNo, paymentOrderNo)
	if err != nil {
		return err
	}
	if quotaToAdd > 0 {
		RecordLog(userId, LogTypeTopup, fmt.Sprintf("\u4f7f\u7528\u5728\u7ebf\u5145\u503c\u6210\u529f\uff0c\u5230\u8d26\u989d\u5ea6\uff1a%v\uff0c\u652f\u4ed8\u91d1\u989d\uff1a%.2f", logger.FormatQuota(quotaToAdd), payMoney))
	}
	return nil
}

func ManualCompleteTopUp(tradeNo string) error {
	userId, quotaToAdd, payMoney, err := completeTopUp(tradeNo, "")
	if err != nil {
		return err
	}
	if quotaToAdd > 0 {
		RecordLog(userId, LogTypeTopup, fmt.Sprintf("\u7ba1\u7406\u5458\u8865\u5355\u6210\u529f\uff0c\u5230\u8d26\u989d\u5ea6\uff1a%v\uff0c\u652f\u4ed8\u91d1\u989d\uff1a%.2f", logger.FormatQuota(quotaToAdd), payMoney))
	}
	return nil
}

func RechargeCreem(referenceId string, customerEmail string, customerName string, paymentOrderNo string) error {
	if referenceId == "" {
		return errors.New("payment reference is required")
	}

	var quota int64
	topUp := &TopUp{}

	refCol := "`trade_no`"
	if common.UsingPostgreSQL {
		refCol = `"trade_no"`
	}

	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where(refCol+" = ?", referenceId).First(topUp).Error; err != nil {
			return errors.New("\u5145\u503c\u8ba2\u5355\u4e0d\u5b58\u5728")
		}

		if topUp.PaymentMethod != "creem" {
			return ErrPaymentMethodMismatch
		}

		if topUp.Status != common.TopUpStatusPending {
			return errors.New("topup order status is invalid")
		}

		topUp.CompleteTime = common.GetTimestamp()
		topUp.Status = common.TopUpStatusSuccess
		applyPaymentOrderNo(topUp, paymentOrderNo)
		if err := tx.Save(topUp).Error; err != nil {
			return err
		}

		quota = topUp.CreditAmount
		if quota <= 0 {
			quota = topUp.Amount
		}
		if quota <= 0 {
			return errors.New("invalid topup quota")
		}

		updateFields := map[string]interface{}{
			"quota": gorm.Expr("quota + ?", quota),
		}
		if customerEmail != "" {
			var user User
			if err := tx.Where("id = ?", topUp.UserId).First(&user).Error; err != nil {
				return err
			}
			if user.Email == "" {
				updateFields["email"] = customerEmail
			}
		}

		if err := tx.Model(&User{}).Where("id = ?", topUp.UserId).Updates(updateFields).Error; err != nil {
			return err
		}

		return markInvitationFirstTopupRewardOnce(tx, topUp.UserId, topUp, customerEmail)
	})
	if err != nil {
		common.SysError("creem topup failed: " + err.Error())
		return errors.New("topup failed, please retry later")
	}

	RecordLog(topUp.UserId, LogTypeTopup, fmt.Sprintf("\u4f7f\u7528 Creem \u5145\u503c\u6210\u529f\uff0c\u5230\u8d26\u989d\u5ea6\uff1a%v\uff0c\u652f\u4ed8\u91d1\u989d\uff1a%.2f", logger.FormatQuota(int(quota)), topUp.Money))
	_ = customerName
	return nil
}

func RechargeWaffo(tradeNo string, paymentOrderNo string) error {
	if tradeNo == "" {
		return errors.New("payment reference is required")
	}

	var quotaToAdd int
	topUp := &TopUp{}

	refCol := "`trade_no`"
	if common.UsingPostgreSQL {
		refCol = `"trade_no"`
	}

	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where(refCol+" = ?", tradeNo).First(topUp).Error; err != nil {
			return errors.New("\u5145\u503c\u8ba2\u5355\u4e0d\u5b58\u5728")
		}

		if topUp.PaymentMethod != "waffo" {
			return ErrPaymentMethodMismatch
		}

		if topUp.Status == common.TopUpStatusSuccess {
			return nil
		}
		if topUp.Status != common.TopUpStatusPending {
			return errors.New("topup order status is invalid")
		}

		quotaToAdd = topUp.GetQuotaToAdd()
		if quotaToAdd <= 0 {
			return errors.New("invalid topup quota")
		}

		topUp.CompleteTime = common.GetTimestamp()
		topUp.Status = common.TopUpStatusSuccess
		applyPaymentOrderNo(topUp, paymentOrderNo)
		if err := tx.Save(topUp).Error; err != nil {
			return err
		}

		if err := tx.Model(&User{}).Where("id = ?", topUp.UserId).Update("quota", gorm.Expr("quota + ?", quotaToAdd)).Error; err != nil {
			return err
		}

		return markInvitationFirstTopupRewardOnce(tx, topUp.UserId, topUp, "")
	})
	if err != nil {
		common.SysError("waffo topup failed: " + err.Error())
		return errors.New("topup failed, please retry later")
	}

	if quotaToAdd > 0 {
		RecordLog(topUp.UserId, LogTypeTopup, fmt.Sprintf("\u4f7f\u7528 Waffo \u5145\u503c\u6210\u529f\uff0c\u5230\u8d26\u989d\u5ea6\uff1a%v\uff0c\u652f\u4ed8\u91d1\u989d\uff1a%.2f", logger.FormatQuota(quotaToAdd), topUp.Money))
	}
	return nil
}
