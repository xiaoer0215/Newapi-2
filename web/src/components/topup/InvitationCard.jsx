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
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Pagination,
  Space,
  Spin,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { Copy, Users, BarChart2, TrendingUp, Gift, Zap } from 'lucide-react';
import { API, showError } from '../../helpers';

const { Text } = Typography;
const INVITATION_RECORDS_PAGE_SIZE = 4;
const INVITATION_DEMO_ROW_HEIGHT = 56;
const INVITATION_DEMO_VISIBLE_ROWS = 4;
const INVITATION_DEMO_USERS = [
  'a7**29',
  'k9m**81',
  'neo**24',
  'v6x**58',
  'r2d**90',
  'm8t**37',
  'c4n**62',
  'l5p**18',
  'q3e**74',
  'b7y**25',
  'u2k**49',
  's8n**63',
  'd4r**57',
  'x6m**28',
  'p9t**41',
];
const INVITATION_DEMO_REGISTER_STATUS_FLOW = [
  'pending',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
  'first_invite_used',
];
const INVITATION_DEMO_TOPUP_STATUS_FLOW = [
  'not_topped_up',
  'pending',
  'not_topped_up',
  'approved',
  'not_topped_up',
  'not_topped_up',
  'pending',
  'not_topped_up',
  'approved',
  'not_topped_up',
  'pending',
  'not_topped_up',
  'not_topped_up',
  'approved',
  'not_topped_up',
];
const RULE_HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;
const INVITATION_RULE_ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);
const INVITATION_RULE_BLOCKED_TAGS = new Set([
  'base',
  'button',
  'embed',
  'form',
  'iframe',
  'input',
  'link',
  'meta',
  'object',
  'script',
  'select',
  'style',
  'textarea',
]);
const INVITATION_RULE_ALLOWED_ATTRS = new Set([
  'alt',
  'class',
  'colspan',
  'height',
  'href',
  'rel',
  'rowspan',
  'src',
  'style',
  'target',
  'title',
  'width',
]);

const isSafeInvitationRuleUrl = (value, allowDataImage = false) => {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (
    normalizedValue.startsWith('/') ||
    normalizedValue.startsWith('#') ||
    normalizedValue.startsWith('./') ||
    normalizedValue.startsWith('../')
  ) {
    return true;
  }

  if (/^(https?:|mailto:|tel:)/.test(normalizedValue)) {
    return true;
  }

  if (allowDataImage && /^data:image\//.test(normalizedValue)) {
    return true;
  }

  return false;
};

const sanitizeInvitationRuleHtml = (html) => {
  if (!html || typeof window === 'undefined') {
    return '';
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const walk = (parentNode) => {
    Array.from(parentNode.childNodes).forEach((childNode) => {
      if (childNode.nodeType !== window.Node.ELEMENT_NODE) {
        return;
      }

      const element = childNode;
      const tagName = element.tagName.toLowerCase();

      if (INVITATION_RULE_BLOCKED_TAGS.has(tagName)) {
        element.remove();
        return;
      }

      if (!INVITATION_RULE_ALLOWED_TAGS.has(tagName)) {
        const fragment = doc.createDocumentFragment();
        while (element.firstChild) {
          fragment.appendChild(element.firstChild);
        }
        element.replaceWith(fragment);
        walk(parentNode);
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        const attrName = attribute.name.toLowerCase();
        const attrValue = attribute.value;

        if (attrName.startsWith('on')) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (
          !INVITATION_RULE_ALLOWED_ATTRS.has(attrName) &&
          !attrName.startsWith('data-')
        ) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (
          attrName === 'href' &&
          !isSafeInvitationRuleUrl(attrValue, false)
        ) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (
          attrName === 'src' &&
          !isSafeInvitationRuleUrl(attrValue, tagName === 'img')
        ) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (attrName === 'target' && attrValue === '_blank') {
          element.setAttribute('rel', 'noopener noreferrer');
        }
      });

      walk(element);
    });
  };

  walk(doc.body);
  return doc.body.innerHTML;
};

const buildDemoInvitationRecords = (registerRewardQuota, firstTopupRewardQuota) => {
  return INVITATION_DEMO_USERS.map((inviteeDisplay, index) => {
    const registerRewardStatus =
      registerRewardQuota > 0
        ? INVITATION_DEMO_REGISTER_STATUS_FLOW[index] || 'first_invite_used'
        : 'none';
    const firstTopupRewardStatus =
      firstTopupRewardQuota > 0
        ? INVITATION_DEMO_TOPUP_STATUS_FLOW[index] || 'not_topped_up'
        : 'none';

    return {
      id: `demo-${index}`,
      invitee_display: inviteeDisplay,
      register_reward_status: registerRewardStatus,
      register_reward_quota:
        registerRewardStatus === 'approved' ? registerRewardQuota : 0,
      first_topup_reward_status: firstTopupRewardStatus,
      first_topup_reward_quota:
        firstTopupRewardStatus === 'approved' ? firstTopupRewardQuota : 0,
    };
  });
};

const InvitationCard = ({
  t,
  userState,
  renderQuota,
  setOpenTransfer,
  affLink,
  handleAffLinkClick,
}) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [ruleText, setRuleText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [demoRegisterRewardQuota, setDemoRegisterRewardQuota] = useState(0);
  const [demoFirstTopupRewardQuota, setDemoFirstTopupRewardQuota] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadInvitationRewards = async () => {
      setLoading(true);
      try {
        const res = await API.get('/api/user/self/aff/rewards', {
          disableDuplicate: true,
        });
        const { success, message, data } = res.data;
        if (!mounted) {
          return;
        }
        if (success) {
          setRecords(data?.items || []);
          setRuleText(data?.rule_text || '');
          setDemoRegisterRewardQuota(data?.demo_register_reward_quota || 0);
          setDemoFirstTopupRewardQuota(
            data?.demo_first_topup_reward_quota || 0,
          );
        } else {
          showError(message);
        }
      } catch {
        if (mounted) {
          showError(t('邀请记录加载失败'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInvitationRewards();
    return () => {
      mounted = false;
    };
  }, [
    t,
    userState?.user?.aff_count,
    userState?.user?.aff_quota,
    userState?.user?.aff_history_quota,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [records.length]);

  const renderRewardStatus = (status, quota, type) => {
    if (status === 'approved') {
      return (
        <Tag color='green' type='light' shape='circle' size='small'>
          {t('奖励')} {renderQuota(quota || 0)}
        </Tag>
      );
    }
    if (status === 'pending') {
      return (
        <Tag color='orange' type='light' shape='circle' size='small'>
          {t('审核中')}
        </Tag>
      );
    }
    if (status === 'rejected') {
      return (
        <Tag color='red' type='light' shape='circle' size='small'>
          {t('已驳回')}
        </Tag>
      );
    }
    if (status === 'first_invite_used') {
      return (
        <Tag color='grey' type='light' shape='circle' size='small'>
          {t('仅一次')}
        </Tag>
      );
    }
    if (status === 'none') {
      return (
        <Tag color='grey' type='light' shape='circle' size='small'>
          {t('未开启')}
        </Tag>
      );
    }
    if (type === 'topup') {
      return (
        <Tag color='grey' type='light' shape='circle' size='small'>
          {t('未首充')}
        </Tag>
      );
    }
    return (
      <Tag color='grey' type='light' shape='circle' size='small'>
        {t('待处理')}
      </Tag>
    );
  };

  const renderRewardCell = (record, type) => {
    const isRegister = type === 'register';
    const status = isRegister
      ? record.register_reward_status
      : record.first_topup_reward_status;
    const quota = isRegister
      ? record.register_reward_quota
      : record.first_topup_reward_quota;
    const rejectReason = isRegister
      ? record.register_reward_reject_reason
      : record.first_topup_reject_reason;

    return (
      <div className='flex flex-col items-center gap-1 text-center'>
        {renderRewardStatus(status, quota, type)}
        {status === 'rejected' && rejectReason ? (
          <Text
            type='danger'
            className='max-w-[180px] break-words text-[12px] leading-5'
          >
            {`${t('驳回理由')}：${rejectReason}`}
          </Text>
        ) : null}
      </div>
    );
  };

  const pagedRecords = records.slice(
    (currentPage - 1) * INVITATION_RECORDS_PAGE_SIZE,
    currentPage * INVITATION_RECORDS_PAGE_SIZE,
  );
  const hasRealRecords = records.length > 0;
  const demoRecords = useMemo(
    () =>
      buildDemoInvitationRecords(
        demoRegisterRewardQuota,
        demoFirstTopupRewardQuota,
      ),
    [demoRegisterRewardQuota, demoFirstTopupRewardQuota],
  );
  const loopedDemoRecords = useMemo(
    () => [...demoRecords, ...demoRecords],
    [demoRecords],
  );

  const renderDefaultRuleBlock = () => {
    return (
      <div className='space-y-3'>
        <div className='flex items-start gap-2'>
          <Badge dot type='success' />
          <Text type='tertiary' className='text-sm'>
            {t('邀请成功后，首次邀请奖励会先进入审核中')}
          </Text>
        </div>
        <div className='flex items-start gap-2'>
          <Badge dot type='success' />
          <Text type='tertiary' className='text-sm'>
            {t('通过划转功能将奖励额度转入到账的账户余额中')}
          </Text>
        </div>
        <div className='flex items-start gap-2'>
          <Badge dot type='success' />
          <Text type='tertiary' className='text-sm'>
            {t('邀请的好友越多，获得的奖励越多')}
          </Text>
        </div>
        <div className='flex items-start gap-2'>
          <Badge dot type='success' />
          <Text type='tertiary' className='text-sm'>
            {t('更多邀请奖励细则、审核说明与活动规则，可点击右上角“查看规则”了解详情')}
          </Text>
        </div>
      </div>
    );
  };

  const renderCustomRuleBlock = () => {
    if (!ruleText) {
      return renderDefaultRuleBlock();
    }

    const containsHtml = RULE_HTML_TAG_REGEX.test(ruleText);
    if (containsHtml) {
      const sanitizedHtml = sanitizeInvitationRuleHtml(ruleText);
      if (sanitizedHtml) {
        return (
          <div
            className='text-sm text-gray-600 leading-7 break-words [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_img]:max-w-full [&_img]:rounded-lg [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-50 [&_pre]:p-3 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:border [&_tbody_tr:nth-child(odd)]:bg-gray-50 [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-3 [&_th]:py-2 [&_ul]:list-disc [&_ul]:pl-5'
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        );
      }
    }

    return (
      <div className='whitespace-pre-wrap text-sm text-gray-600 leading-7'>
        {ruleText}
      </div>
    );
  };

  return (
    <Card className='!rounded-2xl shadow-sm border-0'>
      <div className='flex items-center mb-4'>
        <Avatar size='small' color='green' className='mr-3 shadow-md'>
          <Gift size={16} />
        </Avatar>
        <div>
          <Typography.Text className='text-lg font-medium'>
            {t('邀请奖励')}
          </Typography.Text>
          <div className='text-xs'>{t('邀请好友获得额外奖励')}</div>
        </div>
      </div>

      <Space vertical style={{ width: '100%' }} size='large'>
        <Card
          className='!rounded-xl w-full'
          cover={
            <div
              className='relative min-h-[128px]'
              style={{
                '--palette-primary-darkerChannel': '0 75 80',
                backgroundImage:
                  "linear-gradient(0deg, rgba(var(--palette-primary-darkerChannel) / 80%), rgba(var(--palette-primary-darkerChannel) / 80%)), url('/cover-4.webp')",
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
              }}
            >
              <div className='relative z-10 h-full flex flex-col justify-between p-4'>
                <div className='flex justify-between items-center'>
                  <Text strong style={{ color: 'white', fontSize: '16px' }}>
                    {t('收益统计')}
                  </Text>
                  <Button
                    type='primary'
                    theme='solid'
                    size='small'
                    disabled={
                      !userState?.user?.aff_quota ||
                      userState?.user?.aff_quota <= 0
                    }
                    onClick={() => setOpenTransfer(true)}
                    className='!rounded-lg'
                  >
                    <Zap size={12} className='mr-1' />
                    {t('划转到余额')}
                  </Button>
                </div>

                <div className='grid grid-cols-3 gap-6 mt-4'>
                  <div className='text-center'>
                    <div
                      className='text-base sm:text-2xl font-bold mb-2'
                      style={{ color: 'white' }}
                    >
                      {renderQuota(userState?.user?.aff_quota || 0)}
                    </div>
                    <div className='flex items-center justify-center text-sm'>
                      <TrendingUp
                        size={14}
                        className='mr-1'
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                      />
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '12px',
                        }}
                      >
                        {t('待使用收益')}
                      </Text>
                    </div>
                  </div>

                  <div className='text-center'>
                    <div
                      className='text-base sm:text-2xl font-bold mb-2'
                      style={{ color: 'white' }}
                    >
                      {renderQuota(userState?.user?.aff_history_quota || 0)}
                    </div>
                    <div className='flex items-center justify-center text-sm'>
                      <BarChart2
                        size={14}
                        className='mr-1'
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                      />
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '12px',
                        }}
                      >
                        {t('总收益')}
                      </Text>
                    </div>
                  </div>

                  <div className='text-center'>
                    <div
                      className='text-base sm:text-2xl font-bold mb-2'
                      style={{ color: 'white' }}
                    >
                      {userState?.user?.aff_count || 0}
                    </div>
                    <div className='flex items-center justify-center text-sm'>
                      <Users
                        size={14}
                        className='mr-1'
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                      />
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '12px',
                        }}
                      >
                        {t('邀请人数')}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <Input
            value={affLink}
            readOnly
            className='!rounded-lg'
            prefix={t('邀请链接')}
            suffix={
              <Button
                type='primary'
                theme='solid'
                onClick={handleAffLinkClick}
                icon={<Copy size={14} />}
                className='!rounded-lg'
              >
                {t('复制')}
              </Button>
            }
          />
        </Card>

        <Card
          className='!rounded-xl w-full'
          title={
            <div className='flex items-center justify-between gap-3'>
              <Text type='tertiary'>{t('邀请记录')}</Text>
              {hasRealRecords ? (
                <Text type='quaternary' className='text-xs'>
                  {t('共 {{count}} 条', { count: records.length })}
                </Text>
              ) : (
                <Text type='quaternary' className='text-xs'>
                  {t('邀请示例')}
                </Text>
              )}
            </div>
          }
        >
          <Spin spinning={loading}>
            {!hasRealRecords ? (
              <div className='space-y-2'>
                <div className='overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm'>
                  <div className='grid grid-cols-3 gap-3 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500'>
                    <div>{t('好友用户名')}</div>
                    <div className='text-center'>{t('首次邀请')}</div>
                    <div className='text-center'>{t('首充奖励')}</div>
                  </div>

                  <div
                    className='relative overflow-hidden'
                    style={{
                      height: `${INVITATION_DEMO_ROW_HEIGHT * INVITATION_DEMO_VISIBLE_ROWS}px`,
                    }}
                  >
                    <div className='pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-white to-transparent' />
                    <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-white to-transparent' />

                    <div className='invitation-demo-scroll divide-y divide-gray-100'>
                      {loopedDemoRecords.map((record, index) => (
                        <div
                          key={`${record.id}-${index}`}
                          className='grid grid-cols-3 gap-3 items-center px-3 text-sm'
                          style={{ minHeight: `${INVITATION_DEMO_ROW_HEIGHT}px` }}
                        >
                          <div className='min-w-0 font-medium text-gray-800 break-all'>
                            {record.invitee_display || '--'}
                          </div>
                          <div className='flex justify-center'>
                            {renderRewardStatus(
                              record.register_reward_status,
                              record.register_reward_quota,
                              'register',
                            )}
                          </div>
                          <div className='flex justify-center'>
                            {renderRewardStatus(
                              record.first_topup_reward_status,
                              record.first_topup_reward_quota,
                              'topup',
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='space-y-2'>
                <div className='overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm'>
                  <div className='grid grid-cols-3 gap-3 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500'>
                    <div>{t('好友用户名')}</div>
                    <div className='text-center'>{t('首次邀请')}</div>
                    <div className='text-center'>{t('首充奖励')}</div>
                  </div>

                  <div className='divide-y divide-gray-100'>
                    {pagedRecords.map((record) => (
                      <div
                        key={record.id}
                        className='grid grid-cols-3 gap-3 items-center px-3 py-3 text-sm'
                      >
                        <div className='min-w-0 font-medium text-gray-800 break-all'>
                          {record.invitee_display || '--'}
                        </div>
                        <div className='flex justify-center'>
                          {renderRewardCell(record, 'register')}
                        </div>
                        <div className='flex justify-center'>
                          {renderRewardCell(record, 'topup')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {records.length > INVITATION_RECORDS_PAGE_SIZE && (
                  <div className='flex justify-center pt-2 border-t border-gray-100'>
                    <Pagination
                      currentPage={currentPage}
                      pageSize={INVITATION_RECORDS_PAGE_SIZE}
                      total={records.length}
                      showSizeChanger={false}
                      showQuickJumper={false}
                      size='small'
                      onPageChange={(page) => setCurrentPage(page)}
                    />
                  </div>
                )}
              </div>
            )}
          </Spin>
        </Card>

        <Card
          className='!rounded-xl w-full'
          title={
            <div className='flex items-center justify-between gap-3'>
              <Text type='tertiary'>{t('奖励说明')}</Text>
              {ruleText ? (
                <Button
                  size='small'
                  theme='light'
                  type='tertiary'
                  className='!rounded-lg shrink-0'
                  onClick={() => setRuleModalVisible(true)}
                >
                  {t('查看规则')}
                </Button>
              ) : null}
            </div>
          }
        >
          {renderDefaultRuleBlock()}
        </Card>

      </Space>

      <Modal
        title={t('邀请规则')}
        visible={ruleModalVisible}
        footer={null}
        centered
        size='medium'
        onCancel={() => setRuleModalVisible(false)}
      >
        <div className='max-h-[65vh] overflow-y-auto pr-1'>
          {renderCustomRuleBlock()}
        </div>
      </Modal>
    </Card>
  );
};

export default InvitationCard;
