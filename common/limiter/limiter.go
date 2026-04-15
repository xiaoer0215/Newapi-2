package limiter

import (
	"context"
	_ "embed"
	"fmt"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/go-redis/redis/v8"
)

//go:embed lua/rate_limit.lua
var rateLimitScript string

type RedisLimiter struct {
	client         *redis.Client
	limitScriptSHA string
}

var (
	instance *RedisLimiter
	once     sync.Once
)

func New(ctx context.Context, r *redis.Client) *RedisLimiter {
	once.Do(func() {
		// 预加载脚本
		limitSHA, err := r.ScriptLoad(ctx, rateLimitScript).Result()
		if err != nil {
			common.SysLog(fmt.Sprintf("Failed to load rate limit script: %v", err))
		}
		instance = &RedisLimiter{
			client:         r,
			limitScriptSHA: limitSHA,
		}
	})

	return instance
}

func (rl *RedisLimiter) Allow(ctx context.Context, key string, opts ...Option) (bool, error) {
	// 默认配置
	config := &Config{
		Capacity:  10,
		Rate:      1,
		Requested: 1,
	}

	// 应用选项模式
	for _, opt := range opts {
		opt(config)
	}

	// 执行限流，先用 EvalSha（快），若脚本缓存丢失（Redis 重启）则降级到 Eval
	result, err := rl.client.EvalSha(
		ctx,
		rl.limitScriptSHA,
		[]string{key},
		config.Requested,
		config.Rate,
		config.Capacity,
	).Int()

	if err != nil {
		// NOSCRIPT: Redis 重启后脚本缓存被清除，重新用 Eval 执行原始脚本
		if strings.Contains(err.Error(), "NOSCRIPT") {
			result, err = rl.client.Eval(
				ctx,
				rateLimitScript,
				[]string{key},
				config.Requested,
				config.Rate,
				config.Capacity,
			).Int()
			if err != nil {
				return false, fmt.Errorf("rate limit failed: %w", err)
			}
			// 异步重新加载脚本，避免后续请求继续走慢路径
			go func() {
				sha, loadErr := rl.client.ScriptLoad(context.Background(), rateLimitScript).Result()
				if loadErr == nil {
					rl.limitScriptSHA = sha
				}
			}()
			return result == 1, nil
		}
		return false, fmt.Errorf("rate limit failed: %w", err)
	}
	return result == 1, nil
}

// Config 配置选项模式
type Config struct {
	Capacity  int64
	Rate      int64
	Requested int64
}

type Option func(*Config)

func WithCapacity(c int64) Option {
	return func(cfg *Config) { cfg.Capacity = c }
}

func WithRate(r int64) Option {
	return func(cfg *Config) { cfg.Rate = r }
}

func WithRequested(n int64) Option {
	return func(cfg *Config) { cfg.Requested = n }
}
