package model

import (
	"fmt"
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
	Status       string  `json:"status"` // green / orange / red
}

// GroupMonitorStats holds the aggregated and bucketed stats for one API group.
type GroupMonitorStats struct {
	Group        string       `json:"group"`
	SuccessCount int64        `json:"success_count"`
	ErrorCount   int64        `json:"error_count"`
	TotalCount   int64        `json:"total_count"`
	SuccessRate  float64      `json:"success_rate"`
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

	var bucketExpr string
	if common.UsingMySQL {
		bucketExpr = fmt.Sprintf("CAST((created_at - %d) / %d AS SIGNED)", since, bucketSecs)
	} else {
		bucketExpr = fmt.Sprintf("(created_at - %d) / %d", since, bucketSecs)
	}

	query := fmt.Sprintf(
		`SELECT %s AS group_name, %s AS bucket_idx,`+
			` COUNT(CASE WHEN type = %d THEN 1 END) AS success_count,`+
			` COUNT(CASE WHEN type = %d THEN 1 END) AS error_count`+
			` FROM logs`+
			` WHERE created_at >= %d AND %s IN ?`+
			` GROUP BY %s, %s`,
		logGroupCol, bucketExpr,
		LogTypeConsume, LogTypeError,
		since, logGroupCol,
		logGroupCol, bucketExpr,
	)

	type bucketRow struct {
		GroupName    string `gorm:"column:group_name"`
		BucketIdx    int    `gorm:"column:bucket_idx"`
		SuccessCount int64  `gorm:"column:success_count"`
		ErrorCount   int64  `gorm:"column:error_count"`
	}
	var rows []bucketRow
	if err := LOG_DB.Raw(query, groups).Scan(&rows).Error; err != nil {
		return err
	}

	type groupAgg struct {
		buckets      []BucketStat
		totalSuccess int64
		totalError   int64
	}
	aggs := make(map[string]*groupAgg, len(groups))
	for _, g := range groups {
		a := &groupAgg{buckets: make([]BucketStat, numBuckets)}
		for i := range a.buckets {
			a.buckets[i] = BucketStat{Index: i, SuccessRate: 100, Status: "green"}
		}
		aggs[g] = a
	}

	for _, r := range rows {
		a, ok := aggs[r.GroupName]
		if !ok || r.BucketIdx < 0 || r.BucketIdx >= numBuckets {
			continue
		}
		total := r.SuccessCount + r.ErrorCount
		rate := float64(100)
		if total > 0 {
			rate = float64(r.SuccessCount) / float64(total) * 100
		}
		a.buckets[r.BucketIdx] = BucketStat{
			Index:        r.BucketIdx,
			SuccessCount: r.SuccessCount,
			ErrorCount:   r.ErrorCount,
			TotalCount:   total,
			SuccessRate:  rate,
			Status:       gmStatus(rate, total),
		}
		a.totalSuccess += r.SuccessCount
		a.totalError += r.ErrorCount
	}

	groupMonitorCacheMu.Lock()
	for _, g := range groups {
		a := aggs[g]
		total := a.totalSuccess + a.totalError
		rate := float64(100)
		if total > 0 {
			rate = float64(a.totalSuccess) / float64(total) * 100
		}
		buckets := make([]BucketStat, numBuckets)
		copy(buckets, a.buckets)
		groupMonitorCache[cacheKey(window, g)] = &GroupMonitorStats{
			Group:        g,
			SuccessCount: a.totalSuccess,
			ErrorCount:   a.totalError,
			TotalCount:   total,
			SuccessRate:  rate,
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

	var bucketExpr string
	if common.UsingMySQL {
		bucketExpr = fmt.Sprintf("CAST((created_at - %d) / %d AS SIGNED)", since, bucketSecs)
	} else {
		bucketExpr = fmt.Sprintf("(created_at - %d) / %d", since, bucketSecs)
	}

	query := fmt.Sprintf(
		`SELECT %s AS group_name, model_name, %s AS bucket_idx,`+
			` COUNT(CASE WHEN type = %d THEN 1 END) AS success_count,`+
			` COUNT(CASE WHEN type = %d THEN 1 END) AS error_count`+
			` FROM logs`+
			` WHERE created_at >= %d AND %s IN ?`+
			` GROUP BY %s, model_name, %s`,
		logGroupCol, bucketExpr,
		LogTypeConsume, LogTypeError,
		since, logGroupCol,
		logGroupCol, bucketExpr,
	)

	type modelRow struct {
		GroupName    string `gorm:"column:group_name"`
		ModelName    string `gorm:"column:model_name"`
		BucketIdx    int    `gorm:"column:bucket_idx"`
		SuccessCount int64  `gorm:"column:success_count"`
		ErrorCount   int64  `gorm:"column:error_count"`
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
	}
	// groupModels: group_name -> model_name -> *modelAgg
	groupModels := make(map[string]map[string]*modelAgg)

	for _, r := range rows {
		if r.BucketIdx < 0 || r.BucketIdx >= numBuckets {
			continue
		}
		models, ok := groupModels[r.GroupName]
		if !ok {
			models = make(map[string]*modelAgg)
			groupModels[r.GroupName] = models
		}
		ma, ok := models[r.ModelName]
		if !ok {
			ma = &modelAgg{buckets: make([]BucketStat, numBuckets)}
			for i := range ma.buckets {
				ma.buckets[i] = BucketStat{Index: i, SuccessRate: 100, Status: "green"}
			}
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
			Status:       gmStatus(rate, total),
		}
		ma.totalSuccess += r.SuccessCount
		ma.totalError += r.ErrorCount
	}

	modelDetailCacheMu.Lock()
	for _, g := range groups {
		key := cacheKey(window, g)
		models, ok := groupModels[g]
		if !ok {
			modelDetailCache[key] = nil
			continue
		}
		stats := make([]*ModelBucketStats, 0, len(models))
		for modelName, ma := range models {
			total := ma.totalSuccess + ma.totalError
			rate := float64(100)
			if total > 0 {
				rate = float64(ma.totalSuccess) / float64(total) * 100
			}
			buckets := make([]BucketStat, numBuckets)
			copy(buckets, ma.buckets)
			stats = append(stats, &ModelBucketStats{
				ModelName:    modelName,
				SuccessCount: ma.totalSuccess,
				ErrorCount:   ma.totalError,
				TotalCount:   total,
				SuccessRate:  rate,
				Status:       gmStatus(rate, total),
				Buckets:      buckets,
			})
		}
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
