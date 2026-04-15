/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';
import { useTableCompactMode } from '../common/useTableCompactMode';

const deriveUserSubscriptionStatus = (record) => {
  const sub = record?.subscription;
  if (!sub) return 'unknown';
  if (sub.status === 'cancelled') return 'cancelled';
  if (sub.end_time > 0 && sub.end_time <= Date.now() / 1000) return 'expired';
  if (sub.status === 'active') return 'active';
  return sub.status || 'unknown';
};

export const useSubscriptionsData = () => {
  const { t } = useTranslation();
  const [compactMode, setCompactMode] = useTableCompactMode('subscriptions');

  const [allPlans, setAllPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showEdit, setShowEdit] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [sheetPlacement, setSheetPlacement] = useState('left');

  const [allUserSubscriptions, setAllUserSubscriptions] = useState([]);
  const [userSubscriptionsLoading, setUserSubscriptionsLoading] =
    useState(true);
  const [userSubscriptionsPage, setUserSubscriptionsPage] = useState(1);
  const [userSubscriptionsPageSize, setUserSubscriptionsPageSize] =
    useState(10);
  const [userSubscriptionsKeyword, setUserSubscriptionsKeyword] = useState('');
  const [userSubscriptionsStatus, setUserSubscriptionsStatus] = useState('all');

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await API.get('/api/subscription/admin/plans');
      if (res.data?.success) {
        setAllPlans(res.data.data || []);
      } else {
        showError(res.data?.message || t('加载失败'));
      }
    } catch (e) {
      showError(t('请求失败'));
    } finally {
      setPlansLoading(false);
    }
  };

  const loadUserSubscriptions = async () => {
    setUserSubscriptionsLoading(true);
    try {
      const res = await API.get('/api/subscription/admin/user_subscriptions');
      if (res.data?.success) {
        setAllUserSubscriptions(res.data.data || []);
      } else {
        showError(res.data?.message || t('加载失败'));
      }
    } catch (e) {
      showError(t('请求失败'));
    } finally {
      setUserSubscriptionsLoading(false);
    }
  };

  const refresh = async () => {
    await Promise.all([loadPlans(), loadUserSubscriptions()]);
  };

  const handlePageChange = (page) => {
    setActivePage(page);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setActivePage(1);
  };

  const handleUserSubscriptionsPageChange = (page) => {
    setUserSubscriptionsPage(page);
  };

  const handleUserSubscriptionsPageSizeChange = (size) => {
    setUserSubscriptionsPageSize(size);
    setUserSubscriptionsPage(1);
  };

  const setPlanEnabled = async (planRecordOrId, enabled) => {
    const planId =
      typeof planRecordOrId === 'number'
        ? planRecordOrId
        : planRecordOrId?.plan?.id;
    if (!planId) return;

    setPlansLoading(true);
    try {
      const res = await API.patch(`/api/subscription/admin/plans/${planId}`, {
        enabled: !!enabled,
      });
      if (res.data?.success) {
        showSuccess(enabled ? t('已启用') : t('已禁用'));
        await loadPlans();
      } else {
        showError(res.data?.message || t('操作失败'));
      }
    } catch (e) {
      showError(t('请求失败'));
    } finally {
      setPlansLoading(false);
    }
  };

  const adjustUserSubscriptionDuration = async (subscriptionId, payload) => {
    if (!subscriptionId) return false;

    setUserSubscriptionsLoading(true);
    try {
      const res = await API.post(
        `/api/subscription/admin/user_subscriptions/${subscriptionId}/extend`,
        payload,
      );
      if (res.data?.success) {
        const message = res.data?.data?.message;
        showSuccess(message || t('操作成功'));
        await loadUserSubscriptions();
        return true;
      }
      showError(res.data?.message || t('操作失败'));
      return false;
    } catch (e) {
      showError(t('请求失败'));
      return false;
    } finally {
      setUserSubscriptionsLoading(false);
    }
  };

  const invalidateUserSubscription = async (subscriptionId) => {
    if (!subscriptionId) return false;

    setUserSubscriptionsLoading(true);
    try {
      const res = await API.post(
        `/api/subscription/admin/user_subscriptions/${subscriptionId}/invalidate`,
      );
      if (res.data?.success) {
        const message = res.data?.data?.message;
        showSuccess(message || t('已作废'));
        await loadUserSubscriptions();
        return true;
      }
      showError(res.data?.message || t('操作失败'));
      return false;
    } catch (e) {
      showError(t('请求失败'));
      return false;
    } finally {
      setUserSubscriptionsLoading(false);
    }
  };

  const deleteUserSubscription = async (subscriptionId) => {
    if (!subscriptionId) return false;

    setUserSubscriptionsLoading(true);
    try {
      const res = await API.delete(
        `/api/subscription/admin/user_subscriptions/${subscriptionId}`,
      );
      if (res.data?.success) {
        const message = res.data?.data?.message;
        showSuccess(message || t('已删除'));
        await loadUserSubscriptions();
        return true;
      }
      showError(res.data?.message || t('删除失败'));
      return false;
    } catch (e) {
      showError(t('请求失败'));
      return false;
    } finally {
      setUserSubscriptionsLoading(false);
    }
  };

  const closeEdit = () => {
    setShowEdit(false);
    setEditingPlan(null);
  };

  const openCreate = () => {
    setSheetPlacement('left');
    setEditingPlan(null);
    setShowEdit(true);
  };

  const openEdit = (planRecord) => {
    setSheetPlacement('right');
    setEditingPlan(planRecord);
    setShowEdit(true);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(allPlans.length / pageSize));
    setActivePage((current) => Math.min(current || 1, totalPages));
  }, [allPlans, pageSize]);

  const filteredUserSubscriptions = useMemo(() => {
    const keyword = userSubscriptionsKeyword.trim().toLowerCase();
    return allUserSubscriptions.filter((record) => {
      const status = deriveUserSubscriptionStatus(record);
      if (
        userSubscriptionsStatus !== 'all' &&
        status !== userSubscriptionsStatus
      ) {
        return false;
      }
      if (!keyword) return true;

      const user = record?.user || {};
      const plan = record?.plan || {};
      const sub = record?.subscription || {};
      const haystack = [
        user.username,
        user.display_name,
        user.email,
        user.group,
        plan.title,
        plan.subtitle,
        sub.source,
        String(sub.id || ''),
        String(user.id || ''),
        String(plan.id || ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [allUserSubscriptions, userSubscriptionsKeyword, userSubscriptionsStatus]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredUserSubscriptions.length / userSubscriptionsPageSize),
    );
    setUserSubscriptionsPage((current) => Math.min(current || 1, totalPages));
  }, [filteredUserSubscriptions, userSubscriptionsPageSize]);

  const planCount = allPlans.length;
  const plans = allPlans.slice(
    Math.max(0, (activePage - 1) * pageSize),
    Math.max(0, (activePage - 1) * pageSize) + pageSize,
  );

  const userSubscriptionCount = filteredUserSubscriptions.length;
  const userSubscriptions = filteredUserSubscriptions.slice(
    Math.max(0, (userSubscriptionsPage - 1) * userSubscriptionsPageSize),
    Math.max(0, (userSubscriptionsPage - 1) * userSubscriptionsPageSize) +
      userSubscriptionsPageSize,
  );

  return {
    plans,
    planCount,
    loading: plansLoading,

    showEdit,
    editingPlan,
    sheetPlacement,
    setShowEdit,
    setEditingPlan,

    compactMode,
    setCompactMode,

    activePage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,

    loadPlans,
    setPlanEnabled,
    refresh,
    closeEdit,
    openCreate,
    openEdit,

    allUserSubscriptions,
    userSubscriptions,
    userSubscriptionCount,
    userSubscriptionsLoading,
    userSubscriptionsPage,
    userSubscriptionsPageSize,
    handleUserSubscriptionsPageChange,
    handleUserSubscriptionsPageSizeChange,
    userSubscriptionsKeyword,
    setUserSubscriptionsKeyword,
    userSubscriptionsStatus,
    setUserSubscriptionsStatus,
    loadUserSubscriptions,
    adjustUserSubscriptionDuration,
    invalidateUserSubscription,
    deleteUserSubscription,
    deriveUserSubscriptionStatus,

    t,
  };
};
