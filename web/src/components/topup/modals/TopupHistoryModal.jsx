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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Empty,
  Input,
  Modal,
  Table,
  Tabs,
  TabPane,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { IconSearch } from '@douyinfe/semi-icons';
import { useNavigate } from 'react-router-dom';
import { API, renderQuotaWithAmount, timestamp2string } from '../../../helpers';
import { isAdmin, isRoot } from '../../../helpers/utils';
import { useIsMobile } from '../../../hooks/common/useIsMobile';

const { Text } = Typography;

const STATUS_CONFIG = {
  success: { type: 'success', text: '成功' },
  pending: { type: 'warning', text: '待支付' },
  failed: { type: 'danger', text: '失败' },
  expired: { type: 'danger', text: '已过期' },
};

const PAYMENT_METHOD_MAP = {
  stripe: 'Stripe',
  creem: 'Creem',
  waffo: 'Waffo',
  alipay: '支付宝',
  wxpay: '微信',
};

const TopupHistoryModal = ({ visible, onCancel, t }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [topups, setTopups] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');

  // Auto delivery orders state
  const [adOrders, setAdOrders] = useState([]);
  const [adLoading, setAdLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('topup');
  const [summaryStats, setSummaryStats] = useState({
    yesterday_income: 0,
    today_income: 0,
    unsuccessful_count: 0,
  });

  const isMobile = useIsMobile();
  const userIsAdmin = useMemo(() => isAdmin(), []);
  const userIsRoot = useMemo(() => isRoot(), []);
  const modalWidth = useMemo(() => {
    if (isMobile) {
      return '100%';
    }
    if (typeof window === 'undefined') {
      return userIsAdmin ? 1280 : 1120;
    }
    return Math.min(window.innerWidth - 40, userIsAdmin ? 1280 : 1120);
  }, [isMobile, userIsAdmin]);
  const tableScrollY = useMemo(() => {
    if (isMobile || typeof window === 'undefined') {
      return undefined;
    }
    return Math.max(360, Math.min(620, window.innerHeight - 320));
  }, [isMobile]);

  const formatMoney = (value) => Number(value || 0).toFixed(2);

  const loadTopups = async (currentPage, currentPageSize) => {
    setLoading(true);
    try {
      const base = userIsAdmin ? '/api/user/topup' : '/api/user/topup/self';
      const query =
        `p=${currentPage}&page_size=${currentPageSize}` +
        (keyword ? `&keyword=${encodeURIComponent(keyword)}` : '');
      const res = await API.get(`${base}?${query}`);
      const { success, message, data } = res.data;
      if (success) {
        setTopups(data.items || []);
        setTotal(data.total || 0);
      } else {
        Toast.error({ content: message || t('加载失败') });
      }
    } catch (_) {
      Toast.error({ content: t('加载账单失败') });
    } finally {
      setLoading(false);
    }
  };

  const loadAdOrders = async () => {
    setAdLoading(true);
    try {
      const res = await API.get('/api/auto_delivery/orders');
      const { success, message, data } = res.data;
      if (success) {
        setAdOrders(data || []);
      } else {
        Toast.error({ content: message || t('加载失败') });
      }
    } catch (_) {
      Toast.error({ content: t('加载失败') });
    } finally {
      setAdLoading(false);
    }
  };

  const loadSummaryStats = async () => {
    if (!userIsRoot) {
      return;
    }
    try {
      const res = await API.get('/api/user/topup/stats');
      const { success, data } = res.data;
      if (success && data) {
        setSummaryStats({
          yesterday_income: Number(data.yesterday_income || 0),
          today_income: Number(data.today_income || 0),
          unsuccessful_count: Number(data.unsuccessful_count || 0),
        });
      }
    } catch (_) {
      // Ignore stats loading failure to avoid blocking the modal.
    }
  };

  useEffect(() => {
    if (visible) {
      loadTopups(page, pageSize);
      loadAdOrders();
      loadSummaryStats();
    }
  }, [visible, page, pageSize, keyword]);

  const handleAdminComplete = async (tradeNo) => {
    try {
      const res = await API.post('/api/user/topup/complete', {
        trade_no: tradeNo,
      });
      if (res.data?.success) {
        Toast.success({ content: t('补单成功') });
        await loadTopups(page, pageSize);
        await loadSummaryStats();
      } else {
        Toast.error({ content: res.data?.message || t('补单失败') });
      }
    } catch (_) {
      Toast.error({ content: t('补单失败') });
    }
  };

  const confirmAdminComplete = (tradeNo) => {
    Modal.confirm({
      title: t('确认补单'),
      content: t('是否将该订单标记为成功并为用户入账？'),
      onOk: () => handleAdminComplete(tradeNo),
    });
  };

  const renderStatus = (status) => {
    const config = STATUS_CONFIG[status] || { type: 'primary', text: status };
    return (
      <span className='flex items-center gap-2'>
        <Badge dot type={config.type} />
        <span>{t(config.text)}</span>
      </span>
    );
  };

  const renderMethod = (value) => {
    return <Text>{PAYMENT_METHOD_MAP[value] || value || '-'}</Text>;
  };

  const navigateToUserSearch = (keyword) => {
    if (!keyword) {
      return;
    }
    navigate(`/console/user?keyword=${encodeURIComponent(keyword)}`);
  };

  const getDisplayedPaymentOrderNo = (record) => {
    if (record?.payment_order_no) {
      return record.payment_order_no;
    }
    if (record?.status === 'success') {
      return record?.trade_no || '';
    }
    return '';
  };

  const isSubscriptionTopup = (record) => {
    const tradeNo = (record?.trade_no || '').toLowerCase();
    return Number(record?.amount || 0) === 0 && tradeNo.startsWith('sub');
  };

  const columns = [
    {
      title: t('支付号'),
      dataIndex: 'payment_order_no',
      key: 'payment_order_no',
      width: 250,
      render: (_, record) => {
        const displayValue = getDisplayedPaymentOrderNo(record);
        if (!displayValue) {
          return <Text type='tertiary'>-</Text>;
        }
        return <Text copyable>{displayValue}</Text>;
      },
    },
    {
      title: t('支付方式'),
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 108,
      render: renderMethod,
    },
    {
      title: t('原金额'),
      dataIndex: 'amount',
      key: 'amount',
      width: 104,
      render: (amount, record) => {
        if (isSubscriptionTopup(record)) {
          return <Tag color='purple'>{t('订阅套餐')}</Tag>;
        }
        return <Text>{renderQuotaWithAmount(amount)}</Text>;
      },
    },
    {
      title: t('赠送'),
      dataIndex: 'gift_amount',
      key: 'gift_amount',
      width: 110,
      render: (giftAmount, record) => {
        if (isSubscriptionTopup(record) || !giftAmount) {
          return <Text type='tertiary'>-</Text>;
        }
        return (
          <Tag color='red' type='light'>
            + {renderQuotaWithAmount(giftAmount)}
          </Tag>
        );
      },
    },
    {
      title: t('到账'),
      key: 'credit_amount',
      width: 110,
      render: (_, record) => {
        if (isSubscriptionTopup(record)) {
          return <Text type='tertiary'>-</Text>;
        }
        const credited =
          Number(record.credit_amount || 0) > 0
            ? Number(record.credit_amount)
            : Number(record.amount || 0) + Number(record.gift_amount || 0);
        return <Text strong>{renderQuotaWithAmount(credited)}</Text>;
      },
    },
    {
      title: t('支付金额'),
      dataIndex: 'money',
      key: 'money',
      width: 96,
      render: (money) => (
        <Text type='danger'>{Number(money || 0).toFixed(2)}</Text>
      ),
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      width: 98,
      render: renderStatus,
    },
    {
      title: t('创建时间'),
      dataIndex: 'create_time',
      key: 'create_time',
      width: 168,
      render: (value) => timestamp2string(value),
    },
  ];

  if (userIsAdmin) {
    columns.splice(1, 0, {
      title: t('用户名'),
      dataIndex: 'username',
      key: 'username',
      width: 130,
      render: (text) => {
        if (!text) {
          return <Text>-</Text>;
        }
        return (
          <button
            type='button'
            onClick={() => navigateToUserSearch(text)}
            className='cursor-pointer border-none bg-transparent p-0 text-left font-medium'
            style={{ color: 'var(--semi-color-link)' }}
          >
            {text}
          </button>
        );
      },
    });

    columns.splice(7, 0, {
      title: t('操作'),
      key: 'action',
      width: 96,
      render: (_, record) => {
        if (record.status !== 'pending') {
          return null;
        }
        return (
          <Button
            size='small'
            type='primary'
            theme='outline'
            onClick={() => confirmAdminComplete(record.trade_no)}
          >
            {t('补单')}
          </Button>
        );
      },
    });
  }

  const adColumns = [
    {
      title: t('商品名称'),
      dataIndex: 'product_name',
      key: 'product_name',
      width: 160,
      render: (name, record) => (
        <Text>{name || `商品 #${record.product_id}`}</Text>
      ),
    },
    {
      title: t('支付方式'),
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 108,
      render: renderMethod,
    },
    {
      title: t('支付金额'),
      dataIndex: 'money',
      key: 'money',
      width: 96,
      render: (money) => (
        <Text type='danger'>{Number(money || 0).toFixed(2)}</Text>
      ),
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      width: 98,
      render: renderStatus,
    },
    {
      title: t('卡密'),
      dataIndex: 'delivered_secret',
      key: 'delivered_secret',
      width: 220,
      render: (secret) => {
        if (!secret) return <Text type='tertiary'>-</Text>;
        return <Text copyable ellipsis={{ showTooltip: true, rows: 1 }}>{secret}</Text>;
      },
    },
    {
      title: t('教程'),
      dataIndex: 'delivered_tutorial',
      key: 'delivered_tutorial',
      width: 180,
      render: (tutorial) => {
        if (!tutorial) return <Text type='tertiary'>-</Text>;
        const isUrl = /^https?:\/\//i.test(tutorial.trim());
        if (isUrl) {
          return (
            <a
              href={tutorial.trim()}
              target='_blank'
              rel='noopener noreferrer'
              style={{ color: 'var(--semi-color-link)' }}
            >
              {t('查看教程')}
            </a>
          );
        }
        return (
          <Text ellipsis={{ showTooltip: true, rows: 1 }}>
            {tutorial}
          </Text>
        );
      },
    },
    {
      title: t('购买时间'),
      dataIndex: 'create_time',
      key: 'create_time',
      width: 168,
      render: (value) => timestamp2string(value),
    },
  ];

  const emptyContent = (
    <Empty
      image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
      darkModeImage={
        <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
      }
      description={t('暂无记录')}
      style={{ padding: 30 }}
    />
  );

  return (
    <Modal
      title={t('充值账单')}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      size={isMobile ? 'full-width' : 'large'}
      width={modalWidth}
      className='topup-history-modal'
      bodyStyle={{
        paddingTop: 10,
        paddingBottom: 8,
        maxHeight: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 180px)',
        overflow: 'hidden',
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 12 }}
      >
        <TabPane tab={t('充值记录')} itemKey='topup'>
          <div className='mb-3 topup-history-search'>
            <Input
              prefix={<IconSearch />}
              placeholder={t(userIsAdmin ? '搜索支付号 / 用户名' : '搜索支付号')}
              value={keyword}
              onChange={(value) => {
                setKeyword(value);
                setPage(1);
              }}
              showClear
            />
          </div>

          {userIsRoot ? (
            <div className='mb-3 flex flex-wrap items-center gap-2'>
              <Tag color='blue' size='large'>
                {`${t('昨天收入')}：${formatMoney(summaryStats.yesterday_income)}${t('元')}`}
              </Tag>
              <Tag color='green' size='large'>
                {`${t('今日收入')}：${formatMoney(summaryStats.today_income)}${t('元')}`}
              </Tag>
              <Tag color='orange' size='large'>
                {`${t('未支付成功')}：${summaryStats.unsuccessful_count}${t('单')}`}
              </Tag>
            </div>
          ) : null}

          <Table
            columns={columns}
            dataSource={topups}
            loading={loading}
            rowKey='id'
            size={isMobile ? 'small' : 'middle'}
            className='topup-history-table'
            tableLayout='fixed'
            scroll={{ x: userIsAdmin ? 1320 : 1120, y: tableScrollY }}
            pagination={{
              currentPage: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOpts: [10, 20, 50, 100],
              onPageChange: (currentPage) => setPage(currentPage),
              onPageSizeChange: (currentPageSize) => {
                setPageSize(currentPageSize);
                setPage(1);
              },
            }}
            empty={
              <Empty
                image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
                darkModeImage={
                  <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
                }
                description={t('暂无充值记录')}
                style={{ padding: 30 }}
              />
            }
          />
        </TabPane>

        <TabPane tab={t('自动发货')} itemKey='auto_delivery'>
          <Table
            columns={adColumns}
            dataSource={adOrders}
            loading={adLoading}
            rowKey='id'
            size={isMobile ? 'small' : 'middle'}
            tableLayout='fixed'
            scroll={{ x: 1030, y: tableScrollY }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOpts: [10, 20, 50],
            }}
            empty={emptyContent}
          />
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default TopupHistoryModal;
