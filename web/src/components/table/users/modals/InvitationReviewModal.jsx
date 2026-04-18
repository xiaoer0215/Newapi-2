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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui';
import { API, renderQuota, showError, showSuccess, timestamp2string } from '../../../../helpers';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';

const { Text } = Typography;

const STATUS_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'pending_any' },
  { label: '首次邀请待审', value: 'pending_register' },
  { label: '首充待审', value: 'pending_first_topup' },
  { label: '已通过', value: 'approved_any' },
  { label: '已驳回', value: 'rejected_any' },
];

const EMPTY_REVIEW_DIALOG = {
  visible: false,
  record: null,
  reviewType: 'register',
  action: 'approve',
  rejectReason: '',
};

const INVITATION_COPY = {
  inviter: '\u9080\u8bf7\u4eba',
  inviterId: '\u9080\u8bf7\u4eba ID',
  invitee: '\u88ab\u9080\u8bf7\u7528\u6237',
  inviteeId: '\u88ab\u9080\u8bf7\u4eba ID',
  inviteChain: '\u9080\u8bf7\u94fe\u8def',
  childInvites: '\u4e8c\u7ea7\u9080\u8bf7',
  noChildInvites: '\u6682\u65e0\u4e0b\u7ea7\u9080\u8bf7',
};

const renderStatusTag = (status, quota, t) => {
  if (status === 'approved') {
    return <Tag color='green'>{`${t('奖励')} ${renderQuota(quota || 0)}`}</Tag>;
  }
  if (status === 'pending') {
    return <Tag color='orange'>{t('审核中')}</Tag>;
  }
  if (status === 'rejected') {
    return <Tag color='red'>{t('已驳回')}</Tag>;
  }
  if (status === 'first_invite_used') {
    return <Tag color='grey'>{t('仅一次')}</Tag>;
  }
  if (status === 'none') {
    return <Tag color='grey'>{t('未开启')}</Tag>;
  }
  return <Tag color='grey'>{t('未首充')}</Tag>;
};

const renderIPTypeTag = (ipMeta, t) => {
  const type = ipMeta?.type || '';
  const label = ipMeta?.label || '--';

  if (type === 'proxy') {
    return <Tag color='red'>{t(label)}</Tag>;
  }
  if (type === 'datacenter') {
    return <Tag color='orange'>{t(label)}</Tag>;
  }
  if (type === 'normal') {
    return <Tag color='green'>{t(label)}</Tag>;
  }
  return <Tag color='grey'>{t(label)}</Tag>;
};

const buildRiskTags = (record, t) => {
  const tags = [];

  if ((record?.same_register_ip_count || 0) > 1) {
    tags.push(
      <Tag key='same-register-ip' color='red'>
        {`${t('同注册 IP')} x${record.same_register_ip_count}`}
      </Tag>,
    );
  }
  if ((record?.same_register_fingerprint_count || 0) > 1) {
    tags.push(
      <Tag key='same-register-fingerprint' color='red'>
        {`${t('同注册指纹')} x${record.same_register_fingerprint_count}`}
      </Tag>,
    );
  }
  if ((record?.same_topup_fingerprint_count || 0) > 1) {
    tags.push(
      <Tag key='same-topup-fingerprint' color='red'>
        {`${t('同首充指纹')} x${record.same_topup_fingerprint_count}`}
      </Tag>,
    );
  }
  if ((record?.same_payment_account_count || 0) > 1) {
    tags.push(
      <Tag key='same-payment-account' color='red'>
        {`${t('同支付账户')} x${record.same_payment_account_count}`}
      </Tag>,
    );
  }

  if (tags.length === 0) {
    tags.push(
      <Tag key='no-risk' color='green'>
        {t('未命中风控')}
      </Tag>,
    );
  }

  return tags;
};

const InvitationReviewModal = ({ visible, onCancel, t }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('pending_any');
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [reviewDialog, setReviewDialog] = useState(EMPTY_REVIEW_DIALOG);
  const [submittingReview, setSubmittingReview] = useState(false);
  const requestSeqRef = useRef(0);
  const isMobile = useIsMobile();
  const modalWidth = useMemo(() => {
    if (isMobile) {
      return '100%';
    }
    if (typeof window === 'undefined') {
      return 1320;
    }
    return Math.min(window.innerWidth - 40, 1320);
  }, [isMobile]);
  const tableScrollY = useMemo(() => {
    if (isMobile || typeof window === 'undefined') {
      return undefined;
    }
    return 520;
  }, [isMobile]);

  const loadData = useCallback(
    async (page = activePage, size = pageSize, overrides = {}) => {
      if (!visible) {
        return;
      }

      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;
      setLoading(true);
      try {
        const res = await API.get('/api/user/aff/rewards', {
          disableDuplicate: true,
          params: {
            p: page,
            page_size: size,
            keyword: overrides.keyword ?? keyword ?? '',
            status:
              (overrides.status ?? status ?? 'all') === 'all'
                ? ''
                : overrides.status ?? status,
          },
        });
        const { success, message, data } = res.data;
        if (requestSeq !== requestSeqRef.current) {
          return;
        }
        if (success) {
          setRecords(data?.items || []);
          setActivePage(data?.page || page);
          setPageSize(data?.page_size || size);
          setTotal(data?.total || 0);
        } else {
          showError(message);
        }
      } catch {
        if (requestSeq !== requestSeqRef.current) {
          return;
        }
        showError(t('邀请奖励记录加载失败'));
      } finally {
        if (requestSeq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [activePage, keyword, pageSize, status, t, visible],
  );

  useEffect(() => {
    if (visible) {
      loadData(1, pageSize, { keyword, status });
    } else {
      requestSeqRef.current += 1;
      setLoading(false);
      setReviewDialog(EMPTY_REVIEW_DIALOG);
      setSubmittingReview(false);
    }
  }, [visible]);

  const tableRenderKey = useMemo(
    () =>
      [
        visible ? 'visible' : 'hidden',
        loading ? 'loading' : 'ready',
        activePage,
        pageSize,
        total,
        records.length,
      ].join('-'),
    [activePage, loading, pageSize, records.length, total, visible],
  );

  const openReviewDialog = (record, reviewType, action) => {
    setReviewDialog({
      visible: true,
      record,
      reviewType,
      action,
      rejectReason: '',
    });
  };

  const closeReviewDialog = () => {
    if (submittingReview) {
      return;
    }
    setReviewDialog(EMPTY_REVIEW_DIALOG);
  };

  const submitReview = async () => {
    if (!reviewDialog?.record?.id) {
      return;
    }

    const rejectReason = (reviewDialog.rejectReason || '').trim();
    if (reviewDialog.action === 'reject' && !rejectReason) {
      showError(t('请填写驳回理由'));
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await API.post(
        `/api/user/aff/rewards/${reviewDialog.record.id}/review`,
        {
          review_type: reviewDialog.reviewType,
          action: reviewDialog.action,
          reject_reason: rejectReason,
        },
      );
      const { success, message } = res.data;
      if (success) {
        showSuccess(
          reviewDialog.action === 'approve'
            ? t('审核通过成功')
            : t('驳回成功'),
        );
        setReviewDialog(EMPTY_REVIEW_DIALOG);
        await loadData(activePage, pageSize);
      } else {
        showError(message);
      }
    } catch {
      showError(t('操作失败，请重试'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: t('邀请关系'),
        key: 'relation',
        width: 280,
        render: (_, record) => {
          const inviteeLabel =
            record.invitee_username || record.invitee_display || '--';
          const inviterLabel =
            record.inviter_username || `#${record.inviter_id || '--'}`;
          const children = record.invitee_children || [];
          const childPreviewLimit = isMobile ? 2 : 3;

          return (
            <div className='min-w-0 flex flex-col gap-2'>
              <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
                <Tag color='blue' type='light'>
                  {t(INVITATION_COPY.inviter)}
                </Tag>
                <div
                  className='truncate text-sm font-medium'
                  style={{ maxWidth: isMobile ? 120 : 88 }}
                >
                  {inviterLabel}
                </div>
                <Tag color='grey' type='light'>
                  {`ID ${record.inviter_id || '--'}`}
                </Tag>

                <Text type='tertiary'>-&gt;</Text>

                <Tag color='cyan' type='light'>
                  {t(INVITATION_COPY.invitee)}
                </Tag>
                <div
                  className='truncate text-sm font-medium'
                  style={{ maxWidth: isMobile ? 120 : 96 }}
                >
                  {inviteeLabel}
                </div>
                <Tag color='grey' type='light'>
                  {`ID ${record.invitee_id || '--'}`}
                </Tag>
              </div>

              <div className='flex flex-wrap gap-1'>
                {children.length > 0 ? (
                  <Tag color='orange' type='light'>
                    {`${t(INVITATION_COPY.childInvites)} ${children.length}`}
                  </Tag>
                ) : (
                  <Tag color='grey' type='light'>
                    {t(INVITATION_COPY.noChildInvites)}
                  </Tag>
                )}

                {children.slice(0, childPreviewLimit).map((child) => (
                  <Tag key={child.id} color='blue'>
                    {child.invitee_display ||
                      child.invitee_username ||
                      `#${child.invitee_id}`}
                  </Tag>
                ))}

                {children.length > childPreviewLimit ? (
                  <Tag color='grey'>{`+${children.length - childPreviewLimit}`}</Tag>
                ) : null}
              </div>
              <div className='hidden'>
              <div className='overflow-hidden rounded-xl border border-gray-200 bg-gray-50 px-3 py-3'>
                <div
                  className='grid gap-x-3 gap-y-2 items-start'
                  style={{
                    gridTemplateColumns: isMobile
                      ? '1fr'
                      : '84px minmax(0, 1fr)',
                  }}
                >
                  <Text type='tertiary' size='small'>
                    {t(INVITATION_COPY.inviter)}
                  </Text>
                  <div className='min-w-0 break-all text-sm font-medium'>
                    {inviterLabel}
                  </div>

                  <Text type='tertiary' size='small'>
                    {t(INVITATION_COPY.inviterId)}
                  </Text>
                  <div className='min-w-0 break-all text-sm'>
                    {record.inviter_id || '--'}
                  </div>

                  <Text type='tertiary' size='small'>
                    {t(INVITATION_COPY.invitee)}
                  </Text>
                  <div className='min-w-0 break-all text-sm font-medium'>
                    {inviteeLabel}
                  </div>

                  <Text type='tertiary' size='small'>
                    {t(INVITATION_COPY.inviteeId)}
                  </Text>
                  <div className='min-w-0 break-all text-sm'>
                    {record.invitee_id || '--'}
                  </div>

                  <Text type='tertiary' size='small'>
                    {t(INVITATION_COPY.inviteChain)}
                  </Text>
                  <div className='min-w-0 break-all text-sm text-gray-600'>
                    {`${inviterLabel} -> ${inviteeLabel}`}
                  </div>
                </div>
              </div>
              <div className='hidden'>
              <div className='font-medium break-all'>{inviteeLabel}</div>
              <Text type='quaternary' size='small'>
                {`${t('閭€璇蜂汉 ID')}锛?${record.inviter_id || '--'}`}
              </Text>
              <Text type='tertiary' size='small'>
                {`${t('邀请链路')}：${inviterLabel} -> ${inviteeLabel}`}
              </Text>
              <Text type='quaternary' size='small'>
                {`${t('邀请用户 ID')}：${record.invitee_id || '--'}`}
              </Text>
              </div>

              {children.length > 0 ? (
                <div className='rounded-lg bg-gray-50 px-3 py-2'>
                  <div className='text-xs text-gray-500 mb-2'>
                    {`${t(INVITATION_COPY.childInvites)} ${children.length}`}
                  </div>
                  <div className='hidden text-xs text-gray-500 mb-2'>
                    {`${t('该好友后续又邀请了')} ${children.length} ${t('人')}`}
                  </div>
                  <div className='flex flex-wrap gap-1'>
                    {children.slice(0, 6).map((child) => (
                      <Tag key={child.id} color='blue'>
                        {child.invitee_display ||
                          child.invitee_username ||
                          `#${child.invitee_id}`}
                      </Tag>
                    ))}
                    {children.length > 6 ? (
                      <Tag color='grey'>{`+${children.length - 6}`}</Tag>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                <Text type='quaternary' size='small'>
                  {t(INVITATION_COPY.noChildInvites)}
                </Text>
                <Text className='hidden' type='quaternary' size='small'>
                  {t('暂无下级邀请')}
                </Text>
                </>
              )}
              </div>
            </div>
          );
        },
      },
      {
        title: t('首次邀请奖励'),
        key: 'register_reward',
        width: 230,
        render: (_, record) => (
          <div className='flex flex-col gap-2'>
            {renderStatusTag(
              record.register_reward_status,
              record.register_reward_quota,
              t,
            )}
            {record.register_reward_status === 'rejected' &&
            record.register_reward_reject_reason ? (
              <Text type='danger' size='small'>
                {`${t('驳回理由')}：${record.register_reward_reject_reason}`}
              </Text>
            ) : null}
            {record.register_reward_status === 'pending' ? (
              <Space spacing={8}>
                <Button
                  size='small'
                  type='primary'
                  theme='solid'
                  onClick={() =>
                    openReviewDialog(record, 'register', 'approve')
                  }
                >
                  {t('通过')}
                </Button>
                <Button
                  size='small'
                  type='danger'
                  theme='light'
                  onClick={() =>
                    openReviewDialog(record, 'register', 'reject')
                  }
                >
                  {t('驳回')}
                </Button>
              </Space>
            ) : null}
          </div>
        ),
      },
      {
        title: t('首充奖励'),
        key: 'first_topup_reward',
        width: 240,
        render: (_, record) => (
          <div className='flex flex-col gap-2'>
            {renderStatusTag(
              record.first_topup_reward_status,
              record.first_topup_reward_quota,
              t,
            )}
            {record.first_topup_amount > 0 ? (
              <Text type='tertiary' size='small'>
                {`${t('首充金额')}：${Number(record.first_topup_amount).toFixed(2)}`}
              </Text>
            ) : null}
            {record.first_topup_reward_status === 'rejected' &&
            record.first_topup_reward_reject_reason ? (
              <Text type='danger' size='small'>
                {`${t('驳回理由')}：${record.first_topup_reward_reject_reason}`}
              </Text>
            ) : null}
            {record.first_topup_reward_status === 'pending' ? (
              <Space spacing={8}>
                <Button
                  size='small'
                  type='primary'
                  theme='solid'
                  onClick={() =>
                    openReviewDialog(record, 'first_topup', 'approve')
                  }
                >
                  {t('通过')}
                </Button>
                <Button
                  size='small'
                  type='danger'
                  theme='light'
                  onClick={() =>
                    openReviewDialog(record, 'first_topup', 'reject')
                  }
                >
                  {t('驳回')}
                </Button>
              </Space>
            ) : null}
          </div>
        ),
      },
      {
        title: t('风控信息'),
        key: 'risk',
        width: 360,
        render: (_, record) => (
          <div className='text-xs text-gray-600 flex flex-col gap-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <span>{`${t('注册 IP')}：${record.register_ip || '--'}`}</span>
              {renderIPTypeTag(record.register_ip_meta, t)}
            </div>
            {record.first_topup_ip ? (
              <div className='flex flex-wrap items-center gap-2'>
                <span>{`${t('首充 IP')}：${record.first_topup_ip}`}</span>
                {renderIPTypeTag(record.first_topup_ip_meta, t)}
              </div>
            ) : null}
            {record.register_device_fingerprint ? (
              <div className='break-all'>
                {`${t('注册指纹')}：${record.register_device_fingerprint}`}
              </div>
            ) : null}
            {record.first_topup_device_fingerprint ? (
              <div className='break-all'>
                {`${t('首充指纹')}：${record.first_topup_device_fingerprint}`}
              </div>
            ) : null}
            {record.first_topup_payment_account ? (
              <div className='break-all'>
                {`${t('支付账户')}：${record.first_topup_payment_account}`}
              </div>
            ) : null}
            <div className='flex flex-wrap gap-1'>
              {buildRiskTags(record, t)}
            </div>
          </div>
        ),
      },
      {
        title: t('时间'),
        key: 'time',
        width: 240,
        render: (_, record) => (
          <div className='text-xs text-gray-600 flex flex-col gap-1'>
            <div>{`${t('邀请时间')}：${timestamp2string(record.created_time)}`}</div>
            <div>
              {`${t('首充时间')}：${
                record.first_topup_qualified_at
                  ? timestamp2string(record.first_topup_qualified_at)
                  : '--'
              }`}
            </div>
            <div>
              {`${t('首次邀请审核')}：${
                record.register_reward_reviewed_at
                  ? timestamp2string(record.register_reward_reviewed_at)
                  : '--'
              }`}
            </div>
            <div>
              {`${t('首充审核')}：${
                record.first_topup_reviewed_at
                  ? timestamp2string(record.first_topup_reviewed_at)
                  : '--'
              }`}
            </div>
          </div>
        ),
      },
    ],
    [t],
  );

  const reviewRewardLabel =
    reviewDialog.reviewType === 'register' ? t('首次邀请奖励') : t('首充奖励');
  const reviewTargetLabel =
    reviewDialog.record?.invitee_display ||
    reviewDialog.record?.invitee_username ||
    '--';

  return (
    <>
      <Modal
        title={t('邀请奖励审核')}
        visible={visible}
        onCancel={onCancel}
        footer={null}
        size={isMobile ? 'full-width' : 'large'}
        width={modalWidth}
        centered
        bodyStyle={{
          paddingTop: 10,
          paddingBottom: 8,
          maxHeight: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 180px)',
          overflow: 'hidden',
        }}
      >
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col md:flex-row gap-3'>
            <Input
              value={keyword}
              showClear
              placeholder={t('搜索邀请用户')}
              onChange={setKeyword}
              onEnterPress={() => loadData(1, pageSize)}
            />
            <Select
              style={{ minWidth: 180 }}
              value={status}
              optionList={STATUS_OPTIONS.map((item) => ({
                label: t(item.label),
                value: item.value,
              }))}
              onChange={(value) => {
                setStatus(value);
                loadData(1, pageSize, { status: value });
              }}
            />
            <Button type='primary' onClick={() => loadData(1, pageSize)}>
              {t('搜索')}
            </Button>
          </div>

          <Table
            key={tableRenderKey}
            columns={columns}
            dataSource={records}
            loading={loading}
            rowKey='id'
            pagination={{
              currentPage: activePage,
              pageSize,
              total,
              pageSizeOpts: [10, 20, 50],
              showSizeChanger: true,
              onPageChange: (page) => loadData(page, pageSize),
              onPageSizeChange: (size) => {
                setPageSize(size);
                loadData(1, size);
              },
            }}
            scroll={{ x: 'max-content', y: tableScrollY }}
            empty={
              <Empty
                description={t('暂无邀请奖励记录')}
                image={null}
                style={{ padding: 24 }}
              />
            }
          />
        </div>
      </Modal>

      <Modal
        title={
          reviewDialog.action === 'approve'
            ? `${t('确认通过')} ${reviewRewardLabel}`
            : `${t('确认驳回')} ${reviewRewardLabel}`
        }
        visible={reviewDialog.visible}
        centered
        okType={reviewDialog.action === 'approve' ? 'primary' : 'danger'}
        confirmLoading={submittingReview}
        onCancel={closeReviewDialog}
        onOk={submitReview}
      >
        <div className='flex flex-col gap-3'>
          <Text className='hidden'>
            {`${t('邀请好友')}：${reviewTargetLabel}`}
          </Text>
          <div className='rounded-xl border border-gray-200 bg-gray-50 px-3 py-3'>
            <div
              className='grid gap-x-3 gap-y-2 items-start'
              style={{
                gridTemplateColumns: isMobile ? '1fr' : '96px minmax(0, 1fr)',
              }}
            >
              <Text type='tertiary' size='small'>
                {t(INVITATION_COPY.invitee)}
              </Text>
              <div className='min-w-0 break-all text-sm font-medium'>
                {reviewTargetLabel}
              </div>

              <Text type='tertiary' size='small'>
                {t(INVITATION_COPY.inviter)}
              </Text>
              <div className='min-w-0 break-all text-sm font-medium'>
                {reviewDialog.record?.inviter_username || '--'}
              </div>

              <Text type='tertiary' size='small'>
                {t(INVITATION_COPY.inviterId)}
              </Text>
              <div className='min-w-0 break-all text-sm'>
                {reviewDialog.record?.inviter_id || '--'}
              </div>
            </div>
          </div>
          <Text className='hidden' type='secondary'>
            {`${t('閭€璇蜂汉')}锛?${reviewDialog.record?.inviter_username || '--'} (#${
              reviewDialog.record?.inviter_id || '--'
            })`}
          </Text>
          {reviewDialog.action === 'reject' ? (
            <div className='flex flex-col gap-2'>
              <Text type='secondary'>{t('请填写驳回理由，用户端会同步显示')}</Text>
              <TextArea
                value={reviewDialog.rejectReason}
                onChange={(value) =>
                  setReviewDialog((prev) => ({
                    ...prev,
                    rejectReason: value,
                  }))
                }
                maxCount={200}
                showClear
                autosize={{ minRows: 4, maxRows: 6 }}
                placeholder={t('请输入驳回理由')}
              />
            </div>
          ) : (
            <Text type='secondary'>
              {t('通过后奖励将进入邀请奖励余额，用户可再通过划转功能转入账户余额')}
            </Text>
          )}
        </div>
      </Modal>
    </>
  );
};

export default InvitationReviewModal;
