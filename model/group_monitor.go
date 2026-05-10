package model

import (
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
)

// windowParams returns (numBuckets, bucketSecs, lookbackDuration) for a given window string.
func windowParams(window string) (int, int64, time.Duration) {
	switch window {
	case "1h":
		return 60, 60, 1 * time.Hour // 60 × 1 min
	case "6h":
		return 60, 360, 6 * time.Hour // 60 × 6 min
	case "12h":
		return 24, 1800, 12 * time.Hour
	default: // "24h"
		return 24, 3600, 24 * time.Hour // 24 × 1 hour
	}
}

// BucketStat holds stats for one time window bucket.
type BucketStat struct {
	Index        int     `json:"index"`
	SuccessCount int64   `json:"success_count"`
	ErrorCount   int64   `json:"error_count"`
	TotalCount   int64   `json:"total_count"`
	SuccessRate  float64 `json:"success_rate"`
	AvgUseTime   float64 `json:"avg_use_time"`
	Status       string  `json:"status"` // green / orange / red
}

// GroupMonitorStats holds the aggregated and bucketed stats for one API group.
type GroupMonitorStats struct {
	Group        string       `json:"group"`
	SuccessCount int64        `json:"success_count"`
	ErrorCount   int64        `json:"error_count"`
	TotalCount   int64        `json:"total_count"`
	SuccessRate  float64      `json:"success_rate"`
	AvgUseTime   float64      `json:"avg_use_time"`
	Status       string       `json:"status"`
	Buckets      []BucketStat `json:"buckets"`
	UpdatedAt    int64        `json:"updated_at"`
}

// ModelBucketStats holds bucketed stats for a single model within a group.
type ModelBucketStats struct {
	ModelName    string       `json:"model_name"`
	SuccessCount int64        `json:"success_count"`
	ErrorCount   int64        `json:"error_count"`
	TotalCount   int64        `json:"total_count"`
	SuccessRate  float64      `json:"success_rate"`
	AvgUseTime   float64      `json:"avg_use_time"`
	Status       string       `json:"status"`
	Buckets      []BucketStat `json:"buckets"`
}

var (
	groupMonitorCacheMu sync.RWMutex
	// key: "window:group" e.g. "24h:default"
	groupMonitorCache = map[string]*GroupMonitorStats{}
	// key: window e.g. "24h"
	groupMonitorRefreshTs = map[string]int64{}

	modelDetailCacheMu sync.RWMutex
	// key: "window:group" e.g. "24h:default"
	modelDetailCache = map[string][]*ModelBucketStats{}
	// key: window
	modelDetailRefreshTs = map[string]int64{}
)

func gmStatus(rate float64, total int64) string {
	if total == 0 {
		return "green"
	}
	if rate < 60 {
		return "red"
	}
	if rate < 80 {
		return "orange"
	}
	return "green"
}

func newGreenBuckets(numBuckets int) []BucketStat {
	buckets := make([]BucketStat, numBuckets)
	for i := range buckets {
		buckets[i] = BucketStat{Index: i, SuccessRate: 100, Status: "green"}
	}
	return buckets
}

func getGroupEnabledModelSet(groups []string) map[string]map[string]struct{} {
	result := make(map[string]map[string]struct{}, len(groups))
	for _, group := range groups {
		modelSet := make(map[string]struct{})
		for _, modelName := range GetGroupEnabledModels(group) {
			if modelName == "" {
				continue
			}
			modelSet[modelName] = struct{}{}
		}
		result[group] = modelSet
	}
	return result
}

func cacheKey(window, group string) string {
	return window + ":" + group
}

// RefreshGroupMonitorStats queries LOG_DB for the specified window and rebuilds the in-memory cache.
func RefreshGroupMonitorStats(groups []string, window string) error {
	if len(groups) == 0 {
		groupMonitorCacheMu.Lock()
		// Clear only entries for this window
		for _, g := range groups {
			delete(groupMonitorCache, cacheKey(window, g))
		}
		groupMonitorCacheMu.Unlock()
		return nil
	}

	numBuckets, bucketSecs, lookback := windowParams(window)
	since := time.Now().Add(-lookback).Unix()
	now := time.Now().Unix()
	enabledModelSet := getGroupEnabledModelSet(groups)

	var bucketExpr string
	if common.UsingMySQL {
		bucketExpr = fmt.Sprintf("CAST((created_at - %d) / %d AS SIGNED)", since, bucketSecs)
	} else {
		bucketExpr = fmt.Sprintf("(created_at - %d) / %d", since, bucketSecs)
	}

	query := fmt.Sprintf(
		`SELECT %s AS group_name, model_name, %s AS bucket_idx,`+
			` COUNT(CASE WHEN type = %d THEN 1 END) AS success_count,`+
			` COUNT(CASE WHEN type = %d THEN 1 END) AS error_count,`+
			` SUM(CASE WHEN type = %d THEN use_time ELSE 0 END) AS use_time_sum`+
			` FROM logs`+
			` WHERE created_at >= %d AND %s IN ?`+
			` GROUP BY %s, model_name, %s`,
		logGroupCol, bucketExpr,
		LogTypeConsume, LogTypeError, LogTypeConsume,
		since, logGroupCol,
		logGroupCol, bucketExpr,
	)

	type bucketRow struct {
		GroupName    string `gorm:"column:group_name"`
		ModelName    string `gorm:"column:model_name"`
		BucketIdx    int    `gorm:"column:bucket_idx"`
		SuccessCount int64  `gorm:"column:success_count"`
		ErrorCount   int64  `gorm:"column:error_count"`
		UseTimeSum   int64  `gorm:"column:use_time_sum"`
	}
	var rows []bucketRow
	if err := LOG_DB.Raw(query, groups).Scan(&rows).Error; err != nil {
		return err
	}

	type groupAgg struct {
		buckets      []BucketStat
		totalSuccess int64
		totalError   int64
		useTimeSum   int64
	}
	aggs := make(map[string]*groupAgg, len(groups))
	for _, g := range groups {
		a := &groupAgg{buckets: newGreenBuckets(numBuckets)}
		aggs[g] = a
	}

	for _, r := range rows {
		a, ok := aggs[r.GroupName]
		if !ok || r.BucketIdx < 0 || r.BucketIdx >= numBuckets {
			continue
		}
		if _, ok := enabledModelSet[r.GroupName][r.ModelName]; !ok {
			continue
		}
		total := r.SuccessCount + r.ErrorCount
		rate := float64(100)
		if total > 0 {
			rate = float64(r.SuccessCount) / float64(total) * 100
		}
		bucket := a.buckets[r.BucketIdx]
		bucket.SuccessCount += r.SuccessCount
		bucket.ErrorCount += r.ErrorCount
		bucket.TotalCount += total
		if bucket.TotalCount > 0 {
			bucket.SuccessRate = float64(bucket.SuccessCount) / float64(bucket.TotalCount) * 100
		} else {
			bucket.SuccessRate = rate
		}
		if bucket.SuccessCount > 0 {
			bucket.AvgUseTime = (bucket.AvgUseTime*float64(bucket.SuccessCount-r.SuccessCount) + float64(r.UseTimeSum)) / float64(bucket.SuccessCount)
		}
		bucket.Status = gmStatus(bucket.SuccessRate, bucket.TotalCount)
		a.buckets[r.BucketIdx] = bucket
		a.totalSuccess += r.SuccessCount
		a.totalError += r.ErrorCount
		a.useTimeSum += r.UseTimeSum
	}

	groupMonitorCacheMu.Lock()
	for _, g := range groups {
		a := aggs[g]
		total := a.totalSuccess + a.totalError
		rate := float64(100)
		if total > 0 {
			rate = float64(a.totalSuccess) / float64(total) * 100
		}
		avgUseTime := float64(0)
		if a.totalSuccess > 0 {
			avgUseTime = float64(a.useTimeSum) / float64(a.totalSuccess)
		}
		buckets := make([]BucketStat, numBuckets)
		copy(buckets, a.buckets)
		groupMonitorCache[cacheKey(window, g)] = &GroupMonitorStats{
			Group:        g,
			SuccessCount: a.totalSuccess,
			ErrorCount:   a.totalError,
			TotalCount:   total,
			SuccessRate:  rate,
			AvgUseTime:   avgUseTime,
			Status:       gmStatus(rate, total),
			Buckets:      buckets,
			UpdatedAt:    now,
		}
	}
	groupMonitorRefreshTs[window] = time.Now().Unix()
	groupMonitorCacheMu.Unlock()
	return nil
}

// RefreshModelDetailStats queries LOG_DB for per-model stats within each group.
func RefreshModelDetailStats(groups []string, window string) error {
	if len(groups) == 0 {
		return nil
	}

	numBuckets, bucketSecs, lookback := windowParams(window)
	since := time.Now().Add(-lookback).Unix()
	enabledModelSet := getGroupEnabledModelSet(groups)

	var bucketExpr string
	if common.UsingMySQL {
		bucketExpr = fmt.Sprintf("CAST((created_at - %d) / %d AS SIGNED)", since, bucketSecs)
	} else {
		bucketExpr = fmt.Sprintf("(created_at - %d) / %d", since, bucketSecs)
	}

	query := fmt.Sprintf(
		`SELECT %s AS group_name, model_name, %s AS bucket_idx,`+
			` COUNT(CASE WHEN type = %d THEN 1 END) AS success_count,`+
			` COUNT(CASE WHEN type = %d THEN 1 END) AS error_count,`+
			` SUM(CASE WHEN type = %d THEN use_time ELSE 0 END) AS use_time_sum`+
			` FROM logs`+
			` WHERE created_at >= %d AND %s IN ?`+
			` GROUP BY %s, model_name, %s`,
		logGroupCol, bucketExpr,
		LogTypeConsume, LogTypeError, LogTypeConsume,
		since, logGroupCol,
		logGroupCol, bucketExpr,
	)

	type modelRow struct {
		GroupName    string `gorm:"column:group_name"`
		ModelName    string `gorm:"column:model_name"`
		BucketIdx    int    `gorm:"column:bucket_idx"`
		SuccessCount int64  `gorm:"column:success_count"`
		ErrorCount   int64  `gorm:"column:error_count"`
		UseTimeSum   int64  `gorm:"column:use_time_sum"`
	}
	var rows []modelRow
	if err := LOG_DB.Raw(query, groups).Scan(&rows).Error; err != nil {
		return err
	}

	// Aggregate: group -> model -> buckets
	type modelAgg struct {
		buckets      []BucketStat
		totalSuccess int64
		totalError   int64
		useTimeSum   int64
	}
	// groupModels: group_name -> model_name -> *modelAgg
	groupModels := make(map[string]map[string]*modelAgg)

	for _, r := range rows {
		if r.BucketIdx < 0 || r.BucketIdx >= numBuckets {
			continue
		}
		if _, ok := enabledModelSet[r.GroupName][r.ModelName]; !ok {
			continue
		}
		models, ok := groupModels[r.GroupName]
		if !ok {
			models = make(map[string]*modelAgg)
			groupModels[r.GroupName] = models
		}
		ma, ok := models[r.ModelName]
		if !ok {
			ma = &modelAgg{buckets: newGreenBuckets(numBuckets)}
			models[r.ModelName] = ma
		}
		total := r.SuccessCount + r.ErrorCount
		rate := float64(100)
		if total > 0 {
			rate = float64(r.SuccessCount) / float64(total) * 100
		}
		ma.buckets[r.BucketIdx] = BucketStat{
			Index:        r.BucketIdx,
			SuccessCount: r.SuccessCount,
			ErrorCount:   r.ErrorCount,
			TotalCount:   total,
			SuccessRate:  rate,
			AvgUseTime: func() float64 {
				if r.SuccessCount <= 0 {
					return 0
				}
				return float64(r.UseTimeSum) / float64(r.SuccessCount)
			}(),
			Status:       gmStatus(rate, total),
		}
		ma.totalSuccess += r.SuccessCount
		ma.totalError += r.ErrorCount
		ma.useTimeSum += r.UseTimeSum
	}

	modelDetailCacheMu.Lock()
	for _, g := range groups {
		key := cacheKey(window, g)
		models, ok := groupModels[g]
		if !ok {
			models = make(map[string]*modelAgg)
			groupModels[g] = models
		}
		for modelName := range enabledModelSet[g] {
			if _, exists := models[modelName]; !exists {
				models[modelName] = &modelAgg{buckets: newGreenBuckets(numBuckets)}
			}
		}
		stats := make([]*ModelBucketStats, 0, len(models))
		for modelName, ma := range models {
			total := ma.totalSuccess + ma.totalError
			rate := float64(100)
			if total > 0 {
				rate = float64(ma.totalSuccess) / float64(total) * 100
			}
			avgUseTime := float64(0)
			if ma.totalSuccess > 0 {
				avgUseTime = float64(ma.useTimeSum) / float64(ma.totalSuccess)
			}
			buckets := make([]BucketStat, numBuckets)
			copy(buckets, ma.buckets)
			stats = append(stats, &ModelBucketStats{
				ModelName:    modelName,
				SuccessCount: ma.totalSuccess,
				ErrorCount:   ma.totalError,
				TotalCount:   total,
				SuccessRate:  rate,
				AvgUseTime:   avgUseTime,
				Status:       gmStatus(rate, total),
				Buckets:      buckets,
			})
		}
		sort.Slice(stats, func(i, j int) bool {
			if stats[i].TotalCount != stats[j].TotalCount {
				return stats[i].TotalCount > stats[j].TotalCount
			}
			return stats[i].ModelName < stats[j].ModelName
		})
		modelDetailCache[key] = stats
	}
	modelDetailRefreshTs[window] = time.Now().Unix()
	modelDetailCacheMu.Unlock()
	return nil
}

// GetGroupMonitorCacheAge returns how many seconds have elapsed since the last refresh for a given window.
func GetGroupMonitorCacheAge(window string) int64 {
	groupMonitorCacheMu.RLock()
	defer groupMonitorCacheMu.RUnlock()
	ts, ok := groupMonitorRefreshTs[window]
	if !ok || ts == 0 {
		return 999999
	}
	return time.Now().Unix() - ts
}

// GetModelDetailCacheAge returns how many seconds have elapsed since the last model detail refresh.
func GetModelDetailCacheAge(window string) int64 {
	modelDetailCacheMu.RLock()
	defer modelDetailCacheMu.RUnlock()
	ts, ok := modelDetailRefreshTs[window]
	if !ok || ts == 0 {
		return 999999
	}
	return time.Now().Unix() - ts
}

// GetGroupMonitorStats returns cached stats for the requested groups and window.
func GetGroupMonitorStats(groups []string, window string) []*GroupMonitorStats {
	groupMonitorCacheMu.RLock()
	defer groupMonitorCacheMu.RUnlock()
	stats := make([]*GroupMonitorStats, 0, len(groups))
	for _, g := range groups {
		if s, ok := groupMonitorCache[cacheKey(window, g)]; ok {
			stats = append(stats, s)
		}
	}
	return stats
}

// GetModelDetailStats returns cached per-model stats keyed by group name.
func GetModelDetailStats(groups []string, window string) map[string][]*ModelBucketStats {
	modelDetailCacheMu.RLock()
	defer modelDetailCacheMu.RUnlock()
	result := make(map[string][]*ModelBucketStats, len(groups))
	for _, g := range groups {
		if s, ok := modelDetailCache[cacheKey(window, g)]; ok {
			result[g] = s
		}
	}
	return result
}
