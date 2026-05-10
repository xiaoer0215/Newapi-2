package common

import (
	"sort"
	"strings"
	"sync"
)

type AffiliateCommissionTier struct {
	Level      int     `json:"level"`
	MinInvites int     `json:"min_invites"`
	Percentage float64 `json:"percentage"`
}

var affiliateCommissionTiersRWMutex sync.RWMutex
var AffiliateCommissionTiers []AffiliateCommissionTier

func init() {
	SetAffiliateCommissionTiers(nil, AffiliateCommissionPercentage)
}

func clampAffiliateCommissionPercentage(value float64) float64 {
	if value < 0 {
		return 0
	}
	if value > 100 {
		return 100
	}
	return value
}

func cloneAffiliateCommissionTiers(src []AffiliateCommissionTier) []AffiliateCommissionTier {
	if len(src) == 0 {
		return nil
	}
	dst := make([]AffiliateCommissionTier, len(src))
	copy(dst, src)
	return dst
}

func DefaultAffiliateCommissionTiers(basePercentage float64) []AffiliateCommissionTier {
	basePercentage = clampAffiliateCommissionPercentage(basePercentage)
	return []AffiliateCommissionTier{
		{Level: 1, MinInvites: 0, Percentage: basePercentage},
		{Level: 2, MinInvites: 10, Percentage: basePercentage},
		{Level: 3, MinInvites: 30, Percentage: basePercentage},
		{Level: 4, MinInvites: 100, Percentage: basePercentage},
	}
}

func normalizeAffiliateCommissionTiers(tiers []AffiliateCommissionTier, fallbackPercentage float64) []AffiliateCommissionTier {
	defaults := DefaultAffiliateCommissionTiers(fallbackPercentage)
	if len(tiers) == 0 {
		return defaults
	}

	cleaned := make([]AffiliateCommissionTier, 0, len(tiers))
	for _, tier := range tiers {
		cleaned = append(cleaned, AffiliateCommissionTier{
			Level:      tier.Level,
			MinInvites: tier.MinInvites,
			Percentage: clampAffiliateCommissionPercentage(tier.Percentage),
		})
	}

	sort.SliceStable(cleaned, func(i, j int) bool {
		if cleaned[i].MinInvites == cleaned[j].MinInvites {
			return cleaned[i].Level < cleaned[j].Level
		}
		return cleaned[i].MinInvites < cleaned[j].MinInvites
	})

	normalized := make([]AffiliateCommissionTier, 4)
	prevMinInvites := 0
	for i := 0; i < 4; i++ {
		tier := defaults[i]
		if i < len(cleaned) {
			tier.MinInvites = cleaned[i].MinInvites
			tier.Percentage = cleaned[i].Percentage
		}
		if tier.MinInvites < 0 {
			tier.MinInvites = 0
		}
		if i == 0 {
			tier.MinInvites = 0
		} else if tier.MinInvites < prevMinInvites {
			tier.MinInvites = prevMinInvites
		}
		tier.Level = i + 1
		tier.Percentage = clampAffiliateCommissionPercentage(tier.Percentage)
		normalized[i] = tier
		prevMinInvites = tier.MinInvites
	}

	return normalized
}

func SetAffiliateCommissionTiers(tiers []AffiliateCommissionTier, fallbackPercentage float64) {
	normalized := normalizeAffiliateCommissionTiers(tiers, fallbackPercentage)
	affiliateCommissionTiersRWMutex.Lock()
	AffiliateCommissionTiers = normalized
	affiliateCommissionTiersRWMutex.Unlock()
	if len(normalized) > 0 {
		AffiliateCommissionPercentage = normalized[0].Percentage
	}
}

func GetAffiliateCommissionTiersCopy() []AffiliateCommissionTier {
	affiliateCommissionTiersRWMutex.RLock()
	defer affiliateCommissionTiersRWMutex.RUnlock()
	return cloneAffiliateCommissionTiers(AffiliateCommissionTiers)
}

func AffiliateCommissionTiersToJSONString() string {
	tiers := GetAffiliateCommissionTiersCopy()
	if len(tiers) == 0 {
		tiers = DefaultAffiliateCommissionTiers(AffiliateCommissionPercentage)
	}
	jsonBytes, err := Marshal(tiers)
	if err != nil {
		return "[]"
	}
	return string(jsonBytes)
}

func UpdateAffiliateCommissionTiersByJSONString(value string) error {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		SetAffiliateCommissionTiers(nil, AffiliateCommissionPercentage)
		return nil
	}

	var tiers []AffiliateCommissionTier
	if err := UnmarshalJsonStr(trimmed, &tiers); err != nil {
		return err
	}
	SetAffiliateCommissionTiers(tiers, AffiliateCommissionPercentage)
	return nil
}

func ParseAffiliateCommissionTiersJSONString(value string) ([]AffiliateCommissionTier, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return DefaultAffiliateCommissionTiers(AffiliateCommissionPercentage), nil
	}

	var tiers []AffiliateCommissionTier
	if err := UnmarshalJsonStr(trimmed, &tiers); err != nil {
		return nil, err
	}

	return normalizeAffiliateCommissionTiers(tiers, AffiliateCommissionPercentage), nil
}

func GetAffiliateCommissionPercentageByInviteCount(inviteCount int) float64 {
	tiers := GetAffiliateCommissionTiersCopy()
	if len(tiers) == 0 {
		tiers = DefaultAffiliateCommissionTiers(AffiliateCommissionPercentage)
	}

	percentage := 0.0
	for _, tier := range tiers {
		if inviteCount < tier.MinInvites {
			break
		}
		percentage = tier.Percentage
	}
	return percentage
}

func GetAffiliateCommissionTierByInviteCount(inviteCount int) AffiliateCommissionTier {
	tiers := GetAffiliateCommissionTiersCopy()
	if len(tiers) == 0 {
		tiers = DefaultAffiliateCommissionTiers(AffiliateCommissionPercentage)
	}

	current := tiers[0]
	for _, tier := range tiers {
		if inviteCount < tier.MinInvites {
			break
		}
		current = tier
	}
	return current
}

func GetNextAffiliateCommissionTier(inviteCount int) (AffiliateCommissionTier, bool) {
	tiers := GetAffiliateCommissionTiersCopy()
	if len(tiers) == 0 {
		tiers = DefaultAffiliateCommissionTiers(AffiliateCommissionPercentage)
	}

	for _, tier := range tiers {
		if tier.MinInvites > inviteCount {
			return tier, true
		}
	}
	return AffiliateCommissionTier{}, false
}

func GetMaxAffiliateCommissionPercentage() float64 {
	tiers := GetAffiliateCommissionTiersCopy()
	if len(tiers) == 0 {
		tiers = DefaultAffiliateCommissionTiers(AffiliateCommissionPercentage)
	}

	maxPercentage := 0.0
	for _, tier := range tiers {
		if tier.Percentage > maxPercentage {
			maxPercentage = tier.Percentage
		}
	}
	return maxPercentage
}
