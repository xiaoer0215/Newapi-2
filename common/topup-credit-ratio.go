package common

import (
	"strings"
	"sync"

	"github.com/shopspring/decimal"
)

var topupGroupCreditRatio = map[string]float64{
	"default": 1,
	"vip":     1,
	"svip":    1,
}

var topupGroupCreditRatioMutex sync.RWMutex

func TopupGroupCreditRatio2JSONString() string {
	topupGroupCreditRatioMutex.RLock()
	defer topupGroupCreditRatioMutex.RUnlock()

	jsonBytes, err := Marshal(topupGroupCreditRatio)
	if err != nil {
		SysError("error marshalling topup group credit ratio: " + err.Error())
	}
	return string(jsonBytes)
}

func UpdateTopupGroupCreditRatioByJSONString(jsonStr string) error {
	topupGroupCreditRatioMutex.Lock()
	defer topupGroupCreditRatioMutex.Unlock()

	topupGroupCreditRatio = make(map[string]float64)
	return UnmarshalJsonStr(jsonStr, &topupGroupCreditRatio)
}

func GetTopupGroupCreditRatioCopy() map[string]float64 {
	topupGroupCreditRatioMutex.RLock()
	defer topupGroupCreditRatioMutex.RUnlock()

	copied := make(map[string]float64, len(topupGroupCreditRatio))
	for name, ratio := range topupGroupCreditRatio {
		copied[name] = ratio
	}
	return copied
}

func GetTopupGroupCreditRatio(name string) float64 {
	topupGroupCreditRatioMutex.RLock()
	defer topupGroupCreditRatioMutex.RUnlock()

	ratio, ok := topupGroupCreditRatio[name]
	if !ok {
		return 1
	}
	if ratio <= 0 {
		return 1
	}
	return ratio
}

func ScaleAmountByTopupGroupCreditRatio(amount int64, fromGroup string, toGroup string) int64 {
	if amount <= 0 {
		return 0
	}

	fromGroup = strings.TrimSpace(fromGroup)
	toGroup = strings.TrimSpace(toGroup)
	if fromGroup == toGroup {
		return amount
	}

	fromRatio := GetTopupGroupCreditRatio(fromGroup)
	if fromRatio <= 0 {
		fromRatio = 1
	}
	toRatio := GetTopupGroupCreditRatio(toGroup)
	if toRatio <= 0 {
		toRatio = 1
	}

	scaledAmount := decimal.NewFromInt(amount).
		Mul(decimal.NewFromFloat(toRatio)).
		Div(decimal.NewFromFloat(fromRatio)).
		Round(0).
		IntPart()
	if scaledAmount <= 0 {
		return 0
	}
	return scaledAmount
}

func ScaleQuotaByTopupGroupCreditRatio(quota int, fromGroup string, toGroup string) int {
	return int(ScaleAmountByTopupGroupCreditRatio(int64(quota), fromGroup, toGroup))
}
