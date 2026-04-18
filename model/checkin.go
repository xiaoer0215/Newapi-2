package model

import (
	"errors"
	"math/rand"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/ipcheck"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"gorm.io/gorm"
)

// Checkin 签到记录
type Checkin struct {
	Id           int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId       int    `json:"user_id" gorm:"not null;uniqueIndex:idx_user_checkin_date"`
	CheckinDate  string `json:"checkin_date" gorm:"type:varchar(10);not null;uniqueIndex:idx_user_checkin_date"` // 格式: YYYY-MM-DD
	QuotaAwarded int    `json:"quota_awarded" gorm:"not null"`
	CreatedAt    int64  `json:"created_at" gorm:"bigint"`
	ClientIP     string `json:"client_ip" gorm:"type:varchar(64);default:''"`
}

// CheckinIPRecord IP签到记录（用于同IP多账号限制）
type CheckinIPRecord struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	ClientIP    string `json:"client_ip" gorm:"type:varchar(64);not null;index:idx_ip_date"`
	CheckinDate string `json:"checkin_date" gorm:"type:varchar(10);not null;index:idx_ip_date"`
	UserId      int    `json:"user_id" gorm:"not null"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
}

func (CheckinIPRecord) TableName() string {
	return "checkin_ip_records"
}

// CheckinRecord 用于API返回的签到记录（不包含敏感字段）
type CheckinRecord struct {
	CheckinDate  string `json:"checkin_date"`
	QuotaAwarded int    `json:"quota_awarded"`
}

func (Checkin) TableName() string {
	return "checkins"
}

// GetUserCheckinRecords 获取用户在指定日期范围内的签到记录
func GetUserCheckinRecords(userId int, startDate, endDate string) ([]Checkin, error) {
	var records []Checkin
	err := DB.Where("user_id = ? AND checkin_date >= ? AND checkin_date <= ?",
		userId, startDate, endDate).
		Order("checkin_date DESC").
		Find(&records).Error
	return records, err
}

// HasCheckedInToday 检查用户今天是否已签到
func HasCheckedInToday(userId int) (bool, error) {
	today := time.Now().Format("2006-01-02")
	var count int64
	err := DB.Model(&Checkin{}).
		Where("user_id = ? AND checkin_date = ?", userId, today).
		Count(&count).Error
	return count > 0, err
}

// HasIPCheckedInToday 检查该IP今天是否已有其他用户签到
func HasIPCheckedInToday(ip string, userId int) (bool, error) {
	if ip == "" {
		return false, nil
	}
	today := time.Now().Format("2006-01-02")
	var count int64
	err := DB.Model(&CheckinIPRecord{}).
		Where("client_ip = ? AND checkin_date = ? AND user_id != ?", ip, today, userId).
		Count(&count).Error
	return count > 0, err
}

// UserCheckin 执行用户签到（带 clientIP 参数）
func UserCheckin(userId int, clientIP ...string) (*Checkin, error) {
	setting := operation_setting.GetCheckinSetting()
	ipRestrictionSetting := operation_setting.GetEffectiveIPRestrictionSetting()
	if !setting.Enabled {
		return nil, errors.New("签到功能未启用")
	}

	// 提取 IP
	ip := ""
	if len(clientIP) > 0 {
		ip = clientIP[0]
	}

	// 检查今天是否已签到
	hasChecked, err := HasCheckedInToday(userId)
	if err != nil {
		return nil, err
	}
	if hasChecked {
		return nil, errors.New("今日已签到")
	}

	// IP 限制检查
	if setting.IPLimitEnabled && ip != "" && ipRestrictionSetting.SingleIPLimitEnabled {
		ipUsed, err := HasIPCheckedInToday(ip, userId)
		if err != nil {
			return nil, err
		}
		if ipUsed {
			return nil, errors.New("该IP今日已有其他账号签到，每个IP每天仅限签到一次")
		}
	}

	// IP 类型检测（VPN / 数据中心 / 住宅代理屏蔽）
	if setting.IPLimitEnabled && ip != "" && ipRestrictionSetting.IPCheckProvider != "" &&
		(ipRestrictionSetting.BlockVPN || ipRestrictionSetting.BlockDatacenter || ipRestrictionSetting.BlockResidential) {
		result, err := ipcheck.CheckIP(ip, ipRestrictionSetting.IPCheckProvider, ipRestrictionSetting.IPApiKey, ipRestrictionSetting.IPInfoToken)
		if err != nil {
			// 检测失败时记录日志但不阻断签到（避免服务不可用时完全无法签到）
			common.SysLog("IP检测失败（" + ip + "）: " + err.Error())
		} else if result != nil {
			if ipRestrictionSetting.BlockVPN && result.IsProxy {
				return nil, errors.New("检测到您使用了 VPN / 代理网络，暂不支持签到")
			}
			if ipRestrictionSetting.BlockDatacenter && result.IsDatacenter {
				return nil, errors.New("检测到您使用了数据中心 / 服务器 IP，暂不支持签到")
			}
			if ipRestrictionSetting.BlockResidential && result.IsResidential {
				return nil, errors.New("检测到您使用了住宅代理网络，暂不支持签到")
			}
		}
	}

	// 计算随机额度奖励
	quotaAwarded := setting.MinQuota
	if setting.MaxQuota > setting.MinQuota {
		quotaAwarded = setting.MinQuota + rand.Intn(setting.MaxQuota-setting.MinQuota+1)
	}

	today := time.Now().Format("2006-01-02")
	checkin := &Checkin{
		UserId:       userId,
		CheckinDate:  today,
		QuotaAwarded: quotaAwarded,
		CreatedAt:    time.Now().Unix(),
		ClientIP:     ip,
	}

	// 根据数据库类型选择不同的策略
	if common.UsingSQLite {
		return userCheckinWithoutTransaction(checkin, userId, quotaAwarded, ip, today)
	}
	return userCheckinWithTransaction(checkin, userId, quotaAwarded, ip, today)
}

// userCheckinWithTransaction 使用事务执行签到（适用于 MySQL 和 PostgreSQL）
func userCheckinWithTransaction(checkin *Checkin, userId int, quotaAwarded int, ip string, today string) (*Checkin, error) {
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(checkin).Error; err != nil {
			return errors.New("签到失败，请稍后重试")
		}
		if err := tx.Model(&User{}).Where("id = ?", userId).
			Update("quota", gorm.Expr("quota + ?", quotaAwarded)).Error; err != nil {
			return errors.New("签到失败：更新额度出错")
		}
		// 记录IP
		if ip != "" {
			ipRecord := &CheckinIPRecord{ClientIP: ip, CheckinDate: today, UserId: userId, CreatedAt: time.Now().Unix()}
			_ = tx.Create(ipRecord).Error
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	go func() { _ = cacheIncrUserQuota(userId, int64(quotaAwarded)) }()
	return checkin, nil
}

// userCheckinWithoutTransaction 不使用事务执行签到（适用于 SQLite）
func userCheckinWithoutTransaction(checkin *Checkin, userId int, quotaAwarded int, ip string, today string) (*Checkin, error) {
	if err := DB.Create(checkin).Error; err != nil {
		return nil, errors.New("签到失败，请稍后重试")
	}
	if err := IncreaseUserQuota(userId, quotaAwarded, true); err != nil {
		DB.Delete(checkin)
		return nil, errors.New("签到失败：更新额度出错")
	}
	// 记录IP
	if ip != "" {
		ipRecord := &CheckinIPRecord{ClientIP: ip, CheckinDate: today, UserId: userId, CreatedAt: time.Now().Unix()}
		_ = DB.Create(ipRecord).Error
	}
	return checkin, nil
}

// GetUserCheckinStats 获取用户签到统计信息
func GetUserCheckinStats(userId int, month string) (map[string]interface{}, error) {
	startDate := month + "-01"
	endDate := month + "-31"

	records, err := GetUserCheckinRecords(userId, startDate, endDate)
	if err != nil {
		return nil, err
	}

	checkinRecords := make([]CheckinRecord, len(records))
	for i, r := range records {
		checkinRecords[i] = CheckinRecord{
			CheckinDate:  r.CheckinDate,
			QuotaAwarded: r.QuotaAwarded,
		}
	}

	hasCheckedToday, _ := HasCheckedInToday(userId)

	var totalCheckins int64
	var totalQuota int64
	DB.Model(&Checkin{}).Where("user_id = ?", userId).Count(&totalCheckins)
	DB.Model(&Checkin{}).Where("user_id = ?", userId).Select("COALESCE(SUM(quota_awarded), 0)").Scan(&totalQuota)

	return map[string]interface{}{
		"total_quota":      totalQuota,
		"total_checkins":   totalCheckins,
		"checkin_count":    len(records),
		"checked_in_today": hasCheckedToday,
		"records":          checkinRecords,
	}, nil
}
