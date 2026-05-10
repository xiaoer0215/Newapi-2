package controller

import (
	"strings"

	"github.com/QuantumNous/new-api/model"
)

func buildConsoleRedirect(basePath string, query string) string {
	trimmedQuery := strings.TrimSpace(query)
	if trimmedQuery == "" {
		return basePath
	}
	if strings.HasPrefix(trimmedQuery, "?") {
		return basePath + trimmedQuery
	}
	return basePath + "?" + trimmedQuery
}

func consoleTopupRedirect(query string) string {
	return buildConsoleRedirect("/console/topup", query)
}

func consoleMemberUpgradeRedirect(query string) string {
	return buildConsoleRedirect("/console/member-upgrade", query)
}

func consoleSubscriptionRedirectByTradeNo(tradeNo string, query string) string {
	order := model.GetSubscriptionOrderByTradeNo(strings.TrimSpace(tradeNo))
	if order == nil || order.PlanId <= 0 {
		return consoleTopupRedirect(query)
	}
	plan, err := model.GetSubscriptionPlanById(order.PlanId)
	if err != nil || plan == nil {
		return consoleTopupRedirect(query)
	}
	if plan.ShowInMemberUpgrade {
		return consoleMemberUpgradeRedirect(query)
	}
	return consoleTopupRedirect(query)
}
