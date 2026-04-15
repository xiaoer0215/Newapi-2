package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/common/limiter"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

const (
	ModelRequestRateLimitCountMark        = "MRRL"
	ModelRequestRateLimitSuccessCountMark = "MRRLS"
)

type userRateLimitWindow struct {
	Key      string
	Label    string
	MaxCount int
	Duration time.Duration
}

func checkRedisRateLimit(ctx context.Context, rdb *redis.Client, key string, maxCount int, duration int64) (bool, error) {
	if maxCount == 0 {
		return true, nil
	}

	length, err := rdb.LLen(ctx, key).Result()
	if err != nil {
		return false, err
	}

	if length < int64(maxCount) {
		return true, nil
	}

	oldTimeStr, _ := rdb.LIndex(ctx, key, -1).Result()
	oldTime, err := time.Parse(timeFormat, oldTimeStr)
	if err != nil {
		return false, err
	}

	nowTimeStr := time.Now().Format(timeFormat)
	nowTime, err := time.Parse(timeFormat, nowTimeStr)
	if err != nil {
		return false, err
	}

	if int64(nowTime.Sub(oldTime).Seconds()) < duration {
		rdb.Expire(ctx, key, time.Duration(setting.ModelRequestRateLimitDurationMinutes)*time.Minute)
		return false, nil
	}

	return true, nil
}

func recordRedisRequest(ctx context.Context, rdb *redis.Client, key string, maxCount int) {
	if maxCount == 0 {
		return
	}

	now := time.Now().Format(timeFormat)
	rdb.LPush(ctx, key, now)
	rdb.LTrim(ctx, key, 0, int64(maxCount-1))
	rdb.Expire(ctx, key, time.Duration(setting.ModelRequestRateLimitDurationMinutes)*time.Minute)
}

func consumeRedisWindowRequest(ctx context.Context, rdb *redis.Client, key string, maxCount int, duration time.Duration) (bool, error) {
	if maxCount <= 0 {
		return true, nil
	}

	listLength, err := rdb.LLen(ctx, key).Result()
	if err != nil {
		return false, err
	}

	now := time.Now()
	if listLength < int64(maxCount) {
		rdb.LPush(ctx, key, now.Format(timeFormat))
		rdb.Expire(ctx, key, duration)
		return true, nil
	}

	oldTimeStr, err := rdb.LIndex(ctx, key, -1).Result()
	if err != nil {
		return false, err
	}
	oldTime, err := time.Parse(timeFormat, oldTimeStr)
	if err != nil {
		return false, err
	}

	if now.Sub(oldTime) < duration {
		rdb.Expire(ctx, key, duration)
		return false, nil
	}

	rdb.LPush(ctx, key, now.Format(timeFormat))
	rdb.LTrim(ctx, key, 0, int64(maxCount-1))
	rdb.Expire(ctx, key, duration)
	return true, nil
}

func getUserSpecificRateLimitWindows(userID int) ([]userRateLimitWindow, error) {
	config, err := model.GetUserRequestRateLimitConfig(userID)
	if err != nil {
		return nil, err
	}

	windows := make([]userRateLimitWindow, 0, 3)
	if config.Minute > 0 {
		windows = append(windows, userRateLimitWindow{
			Key:      fmt.Sprintf("rateLimit:user:%d:minute", userID),
			Label:    "1分钟",
			MaxCount: config.Minute,
			Duration: time.Minute,
		})
	}
	if config.Hour > 0 {
		windows = append(windows, userRateLimitWindow{
			Key:      fmt.Sprintf("rateLimit:user:%d:hour", userID),
			Label:    "1小时",
			MaxCount: config.Hour,
			Duration: time.Hour,
		})
	}
	if config.Day > 0 {
		windows = append(windows, userRateLimitWindow{
			Key:      fmt.Sprintf("rateLimit:user:%d:day", userID),
			Label:    "1天",
			MaxCount: config.Day,
			Duration: 24 * time.Hour,
		})
	}
	return windows, nil
}

func enforceUserSpecificRateLimits(c *gin.Context) (hasUserSpecificMinute bool, aborted bool) {
	userID := c.GetInt("id")
	if userID == 0 {
		return false, false
	}

	windows, err := getUserSpecificRateLimitWindows(userID)
	if err != nil || len(windows) == 0 {
		return false, false
	}

	for _, window := range windows {
		if window.Duration == time.Minute {
			hasUserSpecificMinute = true
		}
	}

	if common.RedisEnabled {
		ctx := context.Background()
		rdb := common.RDB
		for _, window := range windows {
			allowed, err := consumeRedisWindowRequest(ctx, rdb, window.Key, window.MaxCount, window.Duration)
			if err != nil {
				abortWithOpenAiMessage(c, http.StatusInternalServerError, "rate_limit_check_failed")
				return hasUserSpecificMinute, true
			}
			if !allowed {
				abortWithOpenAiMessage(c, http.StatusTooManyRequests, fmt.Sprintf("您已达到个人请求限制：%s内最多请求%d次", window.Label, window.MaxCount))
				return hasUserSpecificMinute, true
			}
		}
		return hasUserSpecificMinute, false
	}

	maxDuration := time.Minute
	for _, window := range windows {
		if window.Duration > maxDuration {
			maxDuration = window.Duration
		}
	}
	inMemoryRateLimiter.Init(maxDuration)

	for _, window := range windows {
		if !inMemoryRateLimiter.Request(window.Key, window.MaxCount, int64(window.Duration.Seconds())) {
			abortWithOpenAiMessage(c, http.StatusTooManyRequests, fmt.Sprintf("您已达到个人请求限制：%s内最多请求%d次", window.Label, window.MaxCount))
			return hasUserSpecificMinute, true
		}
	}
	return hasUserSpecificMinute, false
}

func redisRateLimitHandler(duration int64, totalMaxCount, successMaxCount int) gin.HandlerFunc {
	return func(c *gin.Context) {
		userId := strconv.Itoa(c.GetInt("id"))
		ctx := context.Background()
		rdb := common.RDB

		successKey := fmt.Sprintf("rateLimit:%s:%s", ModelRequestRateLimitSuccessCountMark, userId)
		allowed, err := checkRedisRateLimit(ctx, rdb, successKey, successMaxCount, duration)
		if err != nil {
			abortWithOpenAiMessage(c, http.StatusInternalServerError, "rate_limit_check_failed")
			return
		}
		if !allowed {
			abortWithOpenAiMessage(c, http.StatusTooManyRequests, fmt.Sprintf("您已达到请求数限制：%d分钟内最多请求%d次", setting.ModelRequestRateLimitDurationMinutes, successMaxCount))
			return
		}

		if totalMaxCount > 0 {
			totalKey := fmt.Sprintf("rateLimit:%s", userId)
			tb := limiter.New(ctx, rdb)
			allowed, err = tb.Allow(
				ctx,
				totalKey,
				limiter.WithCapacity(int64(totalMaxCount)*duration),
				limiter.WithRate(int64(totalMaxCount)),
				limiter.WithRequested(duration),
			)
			if err != nil {
				abortWithOpenAiMessage(c, http.StatusInternalServerError, "rate_limit_check_failed")
				return
			}
			if !allowed {
				abortWithOpenAiMessage(c, http.StatusTooManyRequests, fmt.Sprintf("您已达到总请求数限制：%d分钟内最多请求%d次，包括失败次数，请检查您的请求是否正确", setting.ModelRequestRateLimitDurationMinutes, totalMaxCount))
				return
			}
		}

		c.Next()

		if c.Writer.Status() < 400 {
			recordRedisRequest(ctx, rdb, successKey, successMaxCount)
		}
	}
}

func memoryRateLimitHandler(duration int64, totalMaxCount, successMaxCount int) gin.HandlerFunc {
	inMemoryRateLimiter.Init(time.Duration(setting.ModelRequestRateLimitDurationMinutes) * time.Minute)

	return func(c *gin.Context) {
		userId := strconv.Itoa(c.GetInt("id"))
		totalKey := ModelRequestRateLimitCountMark + userId
		successKey := ModelRequestRateLimitSuccessCountMark + userId

		if totalMaxCount > 0 && !inMemoryRateLimiter.Request(totalKey, totalMaxCount, duration) {
			c.Status(http.StatusTooManyRequests)
			c.Abort()
			return
		}

		checkKey := successKey + "_check"
		if !inMemoryRateLimiter.Request(checkKey, successMaxCount, duration) {
			c.Status(http.StatusTooManyRequests)
			c.Abort()
			return
		}

		c.Next()

		if c.Writer.Status() < 400 {
			inMemoryRateLimiter.Request(successKey, successMaxCount, duration)
		}
	}
}

// ModelRequestRateLimit applies user-specific windows first.
// The per-minute user limit overrides the original global/group per-minute limiter.
func ModelRequestRateLimit() func(c *gin.Context) {
	return func(c *gin.Context) {
		hasUserSpecificMinute, aborted := enforceUserSpecificRateLimits(c)
		if aborted {
			return
		}

		if !setting.ModelRequestRateLimitEnabled || hasUserSpecificMinute {
			c.Next()
			return
		}

		duration := int64(setting.ModelRequestRateLimitDurationMinutes * 60)
		totalMaxCount := setting.ModelRequestRateLimitCount
		successMaxCount := setting.ModelRequestRateLimitSuccessCount

		group := common.GetContextKeyString(c, constant.ContextKeyTokenGroup)
		if group == "" {
			group = common.GetContextKeyString(c, constant.ContextKeyUserGroup)
		}

		groupTotalCount, groupSuccessCount, found := setting.GetGroupRateLimit(group)
		if found {
			totalMaxCount = groupTotalCount
			successMaxCount = groupSuccessCount
		}

		if common.RedisEnabled {
			redisRateLimitHandler(duration, totalMaxCount, successMaxCount)(c)
		} else {
			memoryRateLimitHandler(duration, totalMaxCount, successMaxCount)(c)
		}
	}
}
