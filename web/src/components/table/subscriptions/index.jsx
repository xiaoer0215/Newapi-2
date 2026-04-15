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

import React, { useContext, useState } from 'react';
import { Banner, Button, Input, Select } from '@douyinfe/semi-ui';
import CardPro from '../../common/ui/CardPro';
import SubscriptionsTable from './SubscriptionsTable';
import UserSubscriptionsAdminTable from './UserSubscriptionsAdminTable';
import SubscriptionsActions from './SubscriptionsActions';
import SubscriptionsDescription from './SubscriptionsDescription';
import AddEditSubscriptionModal from './modals/AddEditSubscriptionModal';
import AdjustUserSubscriptionDurationModal from './modals/AdjustUserSubscriptionDurationModal';
import { useSubscriptionsData } from '../../../hooks/subscriptions/useSubscriptionsData';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import { createCardProPagination } from '../../../helpers/utils';
import { StatusContext } from '../../../context/Status';

const userSubscriptionStatusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '生效中', value: 'active' },
  { label: '已过期', value: 'expired' },
  { label: '已作废', value: 'cancelled' },
];

const SubscriptionsPage = () => {
  const subscriptionsData = useSubscriptionsData();
  const isMobile = useIsMobile();
  const [statusState] = useContext(StatusContext);
  const enableEpay = !!statusState?.status?.enable_online_topup;

  const [durationModalVisible, setDurationModalVisible] = useState(false);
  const [durationAction, setDurationAction] = useState('extend');
  const [selectedUserSubscription, setSelectedUserSubscription] =
    useState(null);
  const [durationSubmitting, setDurationSubmitting] = useState(false);

  const {
    showEdit,
    editingPlan,
    sheetPlacement,
    closeEdit,
    refresh,
    openCreate,
    compactMode,
    setCompactMode,
    t,
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
  } = subscriptionsData;

  const openAdjustModal = (action, record) => {
    setDurationAction(action);
    setSelectedUserSubscription(record);
    setDurationModalVisible(true);
  };

  const closeAdjustModal = () => {
    setDurationModalVisible(false);
    setSelectedUserSubscription(null);
  };

  const handleAdjustSubmit = async (subscriptionId, payload) => {
    setDurationSubmitting(true);
    try {
      return await adjustUserSubscriptionDuration(subscriptionId, payload);
    } finally {
      setDurationSubmitting(false);
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      <AddEditSubscriptionModal
        visible={showEdit}
        handleClose={closeEdit}
        editingPlan={editingPlan}
        placement={sheetPlacement}
        refresh={refresh}
        t={t}
      />

      <AdjustUserSubscriptionDurationModal
        visible={durationModalVisible}
        action={durationAction}
        record={selectedUserSubscription}
        loading={durationSubmitting}
        onCancel={closeAdjustModal}
        onSubmit={handleAdjustSubmit}
        t={t}
      />

      <CardPro
        type='type1'
        descriptionArea={
          <SubscriptionsDescription
            compactMode={compactMode}
            setCompactMode={setCompactMode}
            t={t}
          />
        }
        actionsArea={
          <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-2 w-full'>
            <div className='order-1 md:order-0 w-full md:w-auto'>
              <SubscriptionsActions openCreate={openCreate} t={t} />
            </div>
            <Banner
              type='info'
              description={t('Stripe/Creem 需要在第三方平台创建商品并填写 ID')}
              closeIcon={null}
              className='!rounded-lg order-2 md:order-1'
              style={{ maxWidth: '100%' }}
            />
          </div>
        }
        paginationArea={createCardProPagination({
          currentPage: subscriptionsData.activePage,
          pageSize: subscriptionsData.pageSize,
          total: subscriptionsData.planCount,
          onPageChange: subscriptionsData.handlePageChange,
          onPageSizeChange: subscriptionsData.handlePageSizeChange,
          isMobile,
          t: subscriptionsData.t,
        })}
        t={t}
      >
        <SubscriptionsTable {...subscriptionsData} enableEpay={enableEpay} />
      </CardPro>

      <CardPro
        type='type1'
        descriptionArea={
          <div className='flex items-center text-blue-500'>
            <span className='text-sm font-medium'>{t('用户订阅实例')}</span>
          </div>
        }
        actionsArea={
          <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 w-full'>
            <div className='flex flex-col md:flex-row gap-2 w-full lg:w-auto'>
              <Input
                showClear
                placeholder={t('搜索用户 / 邮箱 / 套餐')}
                value={userSubscriptionsKeyword}
                onChange={setUserSubscriptionsKeyword}
                style={{ width: isMobile ? '100%' : 260 }}
              />
              <Select
                optionList={userSubscriptionStatusOptions.map((item) => ({
                  ...item,
                  label: t(item.label),
                }))}
                value={userSubscriptionsStatus}
                onChange={setUserSubscriptionsStatus}
                style={{ width: isMobile ? '100%' : 150 }}
              />
              <Button
                onClick={loadUserSubscriptions}
                loading={userSubscriptionsLoading}
              >
                {t('刷新')}
              </Button>
            </div>
            <Banner
              type='info'
              description={t(
                '这里展示的是用户已经绑定的订阅实例，可直接补时、赠送时长、作废或删除',
              )}
              closeIcon={null}
              className='!rounded-lg w-full lg:w-auto'
            />
          </div>
        }
        paginationArea={createCardProPagination({
          currentPage: userSubscriptionsPage,
          pageSize: userSubscriptionsPageSize,
          total: userSubscriptionCount,
          onPageChange: handleUserSubscriptionsPageChange,
          onPageSizeChange: handleUserSubscriptionsPageSizeChange,
          isMobile,
          t,
        })}
        t={t}
      >
        <UserSubscriptionsAdminTable
          dataSource={userSubscriptions}
          loading={userSubscriptionsLoading}
          compactMode={compactMode}
          t={t}
          deriveUserSubscriptionStatus={deriveUserSubscriptionStatus}
          openAdjustModal={openAdjustModal}
          invalidateUserSubscription={invalidateUserSubscription}
          deleteUserSubscription={deleteUserSubscription}
        />
      </CardPro>
    </div>
  );
};

export default SubscriptionsPage;
