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

import React, { useMemo } from 'react';
import {
  Button,
  Empty,
  Modal,
  Space,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import CardTable from '../../common/ui/CardTable';
import { renderQuota, timestamp2string } from '../../../helpers';

const { Text } = Typography;

const renderStatusTag = (status, t) => {
  if (status === 'active') {
    return <Tag color='green'>{t('生效中')}</Tag>;
  }
  if (status === 'cancelled') {
    return <Tag color='grey'>{t('已作废')}</Tag>;
  }
  return <Tag color='orange'>{t('已过期')}</Tag>;
};

const UserSubscriptionsAdminTable = ({
  dataSource,
  loading,
  compactMode,
  t,
  deriveUserSubscriptionStatus,
  openAdjustModal,
  invalidateUserSubscription,
  deleteUserSubscription,
}) => {
  const columns = useMemo(() => {
    return [
      {
        title: 'ID',
        dataIndex: ['subscription', 'id'],
        width: 70,
        render: (value) => <Text type='tertiary'>#{value}</Text>,
      },
      {
        title: t('用户'),
        key: 'user',
        width: 220,
        render: (_, record) => {
          const user = record?.user || {};
          return (
            <div className='min-w-0'>
              <div className='font-medium truncate'>
                {user.display_name || user.username || '-'}
              </div>
              <div className='text-xs text-gray-500 truncate'>
                {user.email || user.username || '-'}
              </div>
              <div className='text-xs text-gray-400 truncate'>
                ID: {user.id || '-'} · {user.group || '-'}
              </div>
            </div>
          );
        },
      },
      {
        title: t('订阅套餐'),
        key: 'plan',
        width: 220,
        render: (_, record) => {
          const plan = record?.plan || {};
          return (
            <div className='min-w-0'>
              <div className='font-medium truncate'>
                {plan.title || `#${record?.subscription?.plan_id || '-'}`}
              </div>
              {plan.subtitle ? (
                <div className='text-xs text-gray-500 truncate'>
                  {plan.subtitle}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        title: t('状态'),
        key: 'status',
        width: 90,
        render: (_, record) =>
          renderStatusTag(deriveUserSubscriptionStatus(record), t),
      },
      {
        title: t('有效期'),
        key: 'time',
        width: 220,
        render: (_, record) => {
          const sub = record?.subscription || {};
          return (
            <div className='text-xs text-gray-600'>
              <div>
                {t('开始')}:{' '}
                {sub.start_time ? timestamp2string(sub.start_time) : '-'}
              </div>
              <div>
                {t('到期')}:{' '}
                {sub.end_time ? timestamp2string(sub.end_time) : '-'}
              </div>
            </div>
          );
        },
      },
      {
        title: t('额度'),
        key: 'quota',
        width: 140,
        render: (_, record) => {
          const sub = record?.subscription || {};
          const total = Number(sub.amount_total || 0);
          const used = Number(sub.amount_used || 0);
          if (total <= 0) {
            return <Text type='tertiary'>{t('不限')}</Text>;
          }
          return (
            <div className='text-xs'>
              <div>
                {renderQuota(used)} / {renderQuota(total)}
              </div>
              <div className='text-gray-500'>
                {t('剩余')}: {renderQuota(record?.remaining_amount || 0)}
              </div>
            </div>
          );
        },
      },
      {
        title: t('来源'),
        key: 'source',
        width: 110,
        render: (_, record) => (
          <Text type='tertiary'>{record?.subscription?.source || '-'}</Text>
        ),
      },
      {
        title: t('操作'),
        key: 'operate',
        dataIndex: 'operate',
        fixed: 'right',
        width: 280,
        render: (_, record) => {
          const status = deriveUserSubscriptionStatus(record);
          return (
            <Space spacing={8}>
              <Button
                size='small'
                theme='light'
                onClick={() => openAdjustModal('extend', record)}
              >
                {t('补时')}
              </Button>
              <Button
                size='small'
                theme='light'
                type='primary'
                onClick={() => openAdjustModal('gift', record)}
              >
                {t('赠送时长')}
              </Button>
              <Button
                size='small'
                theme='light'
                type='warning'
                disabled={status !== 'active'}
                onClick={() => {
                  Modal.confirm({
                    title: t('确认作废'),
                    content: t('作废后该订阅会立即失效，是否继续？'),
                    centered: true,
                    onOk: async () => {
                      await invalidateUserSubscription(
                        record?.subscription?.id,
                      );
                    },
                  });
                }}
              >
                {t('作废')}
              </Button>
              <Button
                size='small'
                theme='light'
                type='danger'
                onClick={() => {
                  Modal.confirm({
                    title: t('确认删除'),
                    content: t('删除后将移除这条订阅实例记录，是否继续？'),
                    centered: true,
                    okType: 'danger',
                    onOk: async () => {
                      await deleteUserSubscription(record?.subscription?.id);
                    },
                  });
                }}
              >
                {t('删除')}
              </Button>
            </Space>
          );
        },
      },
    ];
  }, [
    t,
    deriveUserSubscriptionStatus,
    openAdjustModal,
    invalidateUserSubscription,
    deleteUserSubscription,
  ]);

  const tableColumns = useMemo(() => {
    return compactMode
      ? columns.map((col) => {
          if (col.dataIndex === 'operate') {
            const { fixed, ...rest } = col;
            return rest;
          }
          return col;
        })
      : columns;
  }, [columns, compactMode]);

  return (
    <CardTable
      columns={tableColumns}
      dataSource={dataSource}
      rowKey={(row) => row?.subscription?.id}
      loading={loading}
      scroll={compactMode ? undefined : { x: 'max-content' }}
      pagination={false}
      hidePagination={true}
      empty={
        <Empty
          image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
          darkModeImage={
            <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
          }
          description={t('暂无用户订阅')}
          style={{ padding: 30 }}
        />
      }
      className='overflow-hidden'
      size='middle'
    />
  );
};

export default UserSubscriptionsAdminTable;
