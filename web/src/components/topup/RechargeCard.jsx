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

import React, { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Banner,
  Button,
  Card,
  Col,
  Form,
  Row,
  Skeleton,
  Space,
  Spin,
  Tag,
  Tabs,
  TabPane,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import { IconGift } from '@douyinfe/semi-icons';
import { SiAlipay, SiStripe, SiWechat } from 'react-icons/si';
import {
  BarChart2,
  Coins,
  CreditCard,
  Receipt,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useMinimumLoadingTime } from '../../hooks/common/useMinimumLoadingTime';
import SubscriptionPlansCard from './SubscriptionPlansCard';
import AutoDeliveryShop from './AutoDeliveryShop';

const { Text } = Typography;

const RechargeCard = ({
  t,
  enableOnlineTopUp,
  enableStripeTopUp,
  enableCreemTopUp,
  creemProducts,
  creemPreTopUp,
  presetAmounts,
  selectedPreset,
  selectPresetAmount,
  formatLargeNumber,
  priceRatio,
  topUpCount,
  minTopUp,
  renderQuotaWithAmount,
  getAmount,
  setTopUpCount,
  setSelectedPreset,
  renderAmount,
  amountLoading,
  payMethods,
  preTopUp,
  paymentLoading,
  payWay,
  redemptionCode,
  setRedemptionCode,
  topUp,
  isSubmitting,
  topUpLink,
  openTopUpLink,
  userState,
  renderQuota,
  statusLoading,
  topupInfo,
  onOpenHistory,
  enableWaffoTopUp,
  waffoTopUp,
  waffoPayMethods,
  subscriptionLoading = false,
  subscriptionPlans = [],
  billingPreference,
  onChangeBillingPreference,
  activeSubscriptions = [],
  allSubscriptions = [],
  reloadSubscriptionSelf,
}) => {
  const onlineFormApiRef = useRef(null);
  const initialTabSetRef = useRef(false);
  const showAmountSkeleton = useMinimumLoadingTime(amountLoading);
  const [activeTab, setActiveTab] = useState('topup');

  const shouldShowSubscription =
    !subscriptionLoading && subscriptionPlans.length > 0;
  const selectedGiftAmount = Number(topupInfo?.gift?.[topUpCount] || 0);
  const selectedCreditAmount = Number(topUpCount || 0) + selectedGiftAmount;

  // Effective discount for the currently entered amount (preset-specific or custom fallback)
  const isPresetAmount = (topupInfo?.amount_options || []).includes(Number(topUpCount));
  const presetDiscount = topupInfo?.discount?.[topUpCount];
  const customDiscount = topupInfo?.custom_discount;
  const selectedDiscount = presetDiscount != null
    ? presetDiscount
    : (!isPresetAmount && customDiscount > 0 && customDiscount < 1)
      ? customDiscount
      : 1.0;
  const hasCustomDiscount = selectedDiscount < 1;

  useEffect(() => {
    if (initialTabSetRef.current) return;
    if (subscriptionLoading) return;
    setActiveTab(shouldShowSubscription ? 'subscription' : 'topup');
    initialTabSetRef.current = true;
  }, [shouldShowSubscription, subscriptionLoading]);

  useEffect(() => {
    if (!shouldShowSubscription && activeTab === 'subscription') {
      setActiveTab('topup');
    }
  }, [shouldShowSubscription, activeTab]);

  const formatCnyDisplay = (value) => {
    return `¥${Number(value || 0).toFixed(2)}`;
  };

  const renderPaymentMethodIcon = (payMethod) => {
    if (payMethod.type === 'alipay') {
      return <SiAlipay size={18} color='#1677FF' />;
    }
    if (payMethod.type === 'wxpay') {
      return <SiWechat size={18} color='#07C160' />;
    }
    if (payMethod.type === 'stripe') {
      return <SiStripe size={18} color='#635BFF' />;
    }
    return (
      <CreditCard
        size={18}
        color={payMethod.color || 'var(--semi-color-text-2)'}
      />
    );
  };

  const buildPresetDisplay = (preset) => {
    const giftAmount = Number(
      preset.gift || topupInfo?.gift?.[preset.value] || 0,
    );
    const creditAmount = Number(
      preset.credit_amount || Number(preset.value || 0) + giftAmount,
    );
    const discount = Number(
      preset.discount || topupInfo?.discount?.[preset.value] || 1,
    );
    const originalPrice = Number(preset.value || 0) * Number(priceRatio || 1);
    const actualPay = originalPrice * discount;
    const saveAmount = originalPrice - actualPay;

    return {
      actualPay,
      creditAmount,
      discount,
      giftAmount,
      hasDiscount: discount < 1,
      saveAmount,
      usdAmount: Number(preset.value || 0),
    };
  };

  const renderPresetCard = (preset, index) => {
    const display = buildPresetDisplay(preset);

    return (
      <Card
        key={index}
        style={{
          cursor: 'pointer',
          border:
            selectedPreset === preset.value
              ? '2px solid var(--semi-color-primary)'
              : '1px solid var(--semi-color-border)',
          height: '100%',
          width: '100%',
        }}
        bodyStyle={{ padding: '10px 12px' }}
        onClick={() => {
          selectPresetAmount(preset);
          onlineFormApiRef.current?.setValue('topUpCount', preset.value);
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className='flex items-center justify-center gap-1.5'>
            <Coins size={16} />
            <Typography.Title heading={6} style={{ margin: 0 }}>
              {renderQuotaWithAmount(display.usdAmount)}
            </Typography.Title>
            {display.hasDiscount && (
              <Tag color='green' type='light' size='small'>
                {(display.discount * 10).toFixed(1)}
                {t('折')}
              </Tag>
            )}
          </div>

          <div className='mt-1 text-[12px] text-gray-500'>
            {t('实付')} {formatCnyDisplay(display.actualPay)}
            {display.hasDiscount && (
              <>
                {'，'}
                {t('节省')} {formatCnyDisplay(display.saveAmount)}
              </>
            )}
          </div>

          <div className='mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px]'>
            <span className='text-gray-500'>
              {t('到账')} {renderQuotaWithAmount(display.creditAmount)}
            </span>
            {display.giftAmount > 0 && (
              <span className='text-red-500'>
                {t('赠送')} {renderQuotaWithAmount(display.giftAmount)}
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const redeemPanel = (
    <Card
      className='topup-redeem-panel !rounded-xl w-full border border-red-100 bg-[linear-gradient(135deg,rgba(254,242,242,0.96),rgba(255,255,255,0.98))]'
      bodyStyle={{ padding: '16px 18px' }}
    >
      <div className='mb-3 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-red-600'>
            {t('卡密兑换')}
          </div>
          <div className='mt-1 text-xs text-[var(--semi-color-text-2)]'>
            {t('输入兑换码后可直接将额度充值到当前账户')}
          </div>
        </div>
        <Tag color='red' shape='square' type='light'>
          {t('底部兑换')}
        </Tag>
      </div>

      <Form initValues={{ redemptionCode }}>
        <Form.Input
          field='redemptionCode'
          noLabel
          placeholder={t('请输入兑换码')}
          value={redemptionCode}
          onChange={(value) => setRedemptionCode(value)}
          prefix={<IconGift />}
          suffix={
            <Button
              type='primary'
              theme='solid'
              onClick={topUp}
              loading={isSubmitting}
            >
              {t('兑换额度')}
            </Button>
          }
          showClear
          style={{ width: '100%' }}
          extraText={
            topUpLink && (
              <Text type='tertiary'>
                {t('在找兑换码？')}
                <Text
                  type='secondary'
                  underline
                  className='cursor-pointer'
                  onClick={openTopUpLink}
                >
                  {t('购买兑换码')}
                </Text>
              </Text>
            )
          }
        />
      </Form>
    </Card>
  );

  const topupContent = (
    <Space
      vertical
      style={{ width: '100%' }}
      size='large'
      className='topup-content-stack'
    >
      <Card
        className='!rounded-xl w-full'
        cover={
          <div
            className='relative min-h-[128px]'
            style={{
              '--palette-primary-darkerChannel': '37 99 235',
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
                  {t('账户统计')}
                </Text>
              </div>

              <div className='topup-summary-grid grid grid-cols-3 gap-3 sm:gap-6 mt-4'>
                <div className='text-center'>
                  <div
                    className='text-base sm:text-2xl font-bold mb-2'
                    style={{ color: 'white' }}
                  >
                    {renderQuota(userState?.user?.quota)}
                  </div>
                  <div className='flex items-center justify-center text-sm'>
                    <Wallet
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
                      {t('当前余额')}
                    </Text>
                  </div>
                </div>

                <div className='text-center'>
                  <div
                    className='text-base sm:text-2xl font-bold mb-2'
                    style={{ color: 'white' }}
                  >
                    {renderQuota(userState?.user?.used_quota)}
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
                      {t('历史消耗')}
                    </Text>
                  </div>
                </div>

                <div className='text-center'>
                  <div
                    className='text-base sm:text-2xl font-bold mb-2'
                    style={{ color: 'white' }}
                  >
                    {userState?.user?.request_count || 0}
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
                      {t('请求次数')}
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      >
        {statusLoading ? (
          <div className='py-8 flex justify-center'>
            <Spin size='large' />
          </div>
        ) : enableOnlineTopUp ||
          enableStripeTopUp ||
          enableCreemTopUp ||
          enableWaffoTopUp ? (
          <Form
            getFormApi={(api) => {
              onlineFormApiRef.current = api;
            }}
            initValues={{ topUpCount }}
          >
            <div className='space-y-4 topup-form-stack'>
              {(enableOnlineTopUp || enableStripeTopUp || enableWaffoTopUp) && (
                <Row gutter={12} className='topup-controls-row'>
                  <Col xs={24} sm={24} md={24} lg={10} xl={10}>
                    <Form.InputNumber
                      field='topUpCount'
                      label={t('充值数量')}
                      disabled={
                        !enableOnlineTopUp &&
                        !enableStripeTopUp &&
                        !enableWaffoTopUp
                      }
                      placeholder={
                        t('充值数量，最低 ') + renderQuotaWithAmount(minTopUp)
                      }
                      value={topUpCount}
                      min={minTopUp}
                      max={999999999}
                      step={1}
                      precision={0}
                      onChange={async (value) => {
                        if (value && value >= 1) {
                          setTopUpCount(value);
                          setSelectedPreset(null);
                          await getAmount(value);
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value);
                        if (!value || value < minTopUp) {
                          setTopUpCount(minTopUp);
                          getAmount(minTopUp);
                        }
                      }}
                      formatter={(value) => (value ? `${value}` : '')}
                      parser={(value) =>
                        value ? parseInt(value.replace(/[^\d]/g, '')) : 0
                      }
                      extraText={
                        <Skeleton
                          loading={showAmountSkeleton}
                          active
                          placeholder={
                            <Skeleton.Title
                              style={{
                                width: 140,
                                height: 20,
                                borderRadius: 6,
                              }}
                            />
                          }
                        >
                          <div className='flex flex-wrap items-center gap-2'>
                            <Text type='secondary'>
                              {t('实付金额')}：
                              <span style={{ color: 'red' }}>
                                {renderAmount()}
                              </span>
                            </Text>
                            {selectedGiftAmount > 0 && (
                              <Tag color='blue' type='light' size='small'>
                                {t('到账')}{' '}
                                {renderQuotaWithAmount(selectedCreditAmount)}
                              </Tag>
                            )}
                            {selectedGiftAmount > 0 && (
                              <Tag color='red' type='light' size='small'>
                                {t('赠送')}{' '}
                                {renderQuotaWithAmount(selectedGiftAmount)}
                              </Tag>
                            )}
                            {hasCustomDiscount && selectedGiftAmount === 0 && (
                              <Tag color='green' type='light' size='small'>
                                {(selectedDiscount * 10).toFixed(1)}{t('折')}
                              </Tag>
                            )}
                          </div>
                        </Skeleton>
                      }
                      style={{ width: '100%' }}
                    />
                  </Col>
                  {payMethods &&
                    payMethods.filter((method) => method.type !== 'waffo')
                      .length > 0 && (
                      <Col xs={24} sm={24} md={24} lg={14} xl={14}>
                        <Form.Slot label={t('选择支付方式')}>
                          <Space wrap className='topup-pay-methods'>
                            {payMethods
                              .filter((method) => method.type !== 'waffo')
                              .map((payMethod) => {
                                const minTopupVal =
                                  Number(payMethod.min_topup) || 0;
                                const isStripe = payMethod.type === 'stripe';
                                const disabled =
                                  (!enableOnlineTopUp && !isStripe) ||
                                  (!enableStripeTopUp && isStripe) ||
                                  minTopupVal > Number(topUpCount || 0);

                                const buttonEl = (
                                  <Button
                                    key={payMethod.type}
                                    theme='outline'
                                    type='tertiary'
                                    onClick={() => preTopUp(payMethod.type)}
                                    disabled={disabled}
                                    loading={
                                      paymentLoading &&
                                      payWay === payMethod.type
                                    }
                                    icon={renderPaymentMethodIcon(payMethod)}
                                    className='!rounded-lg !px-4 !py-2'
                                  >
                                    {payMethod.name}
                                  </Button>
                                );

                                return disabled &&
                                  minTopupVal > Number(topUpCount || 0) ? (
                                  <Tooltip
                                    content={`${t('此支付方式最低充值金额为')} ${minTopupVal}`}
                                    key={payMethod.type}
                                  >
                                    {buttonEl}
                                  </Tooltip>
                                ) : (
                                  <React.Fragment key={payMethod.type}>
                                    {buttonEl}
                                  </React.Fragment>
                                );
                              })}
                          </Space>
                        </Form.Slot>
                      </Col>
                    )}
                </Row>
              )}

              {(enableOnlineTopUp || enableStripeTopUp || enableWaffoTopUp) && (
                <Form.Slot label={t('选择充值额度')}>
                  <div className='topup-preset-grid grid grid-cols-2 lg:grid-cols-4 gap-2.5'>
                    {presetAmounts.map((preset, index) =>
                      renderPresetCard(preset, index),
                    )}
                  </div>
                </Form.Slot>
              )}

              {enableWaffoTopUp &&
                waffoPayMethods &&
                waffoPayMethods.length > 0 && (
                  <Form.Slot label={t('Waffo 充值')}>
                    <Space wrap>
                      {waffoPayMethods.map((method, index) => (
                        <Button
                          key={index}
                          theme='outline'
                          type='tertiary'
                          onClick={() => waffoTopUp(index)}
                          loading={paymentLoading}
                          icon={
                            method.icon ? (
                              <img
                                src={method.icon}
                                alt={method.name}
                                style={{
                                  width: 36,
                                  height: 36,
                                  objectFit: 'contain',
                                }}
                              />
                            ) : (
                              <CreditCard
                                size={18}
                                color='var(--semi-color-text-2)'
                              />
                            )
                          }
                          className='!rounded-lg !px-4 !py-2'
                        >
                          {method.name}
                        </Button>
                      ))}
                    </Space>
                  </Form.Slot>
                )}

              {enableCreemTopUp && creemProducts.length > 0 && (
                <Form.Slot label={t('Creem 充值')}>
                  <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'>
                    {creemProducts.map((product, index) => (
                      <Card
                        key={index}
                        onClick={() => creemPreTopUp(product)}
                        className='cursor-pointer !rounded-2xl transition-all hover:shadow-md border-gray-200 hover:border-gray-300'
                        bodyStyle={{ padding: '16px', textAlign: 'center' }}
                      >
                        <div className='font-medium text-lg mb-2'>
                          {product.name}
                        </div>
                        <div className='text-sm text-gray-600 mb-2'>
                          {t('充值额度')}：{product.quota}
                        </div>
                        <div className='text-lg font-semibold text-blue-600'>
                          {product.currency === 'EUR' ? '€' : '$'}
                          {product.price}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Form.Slot>
              )}
            </div>
          </Form>
        ) : (
          <Banner
            type='info'
            description={t(
              '管理员未开启在线充值功能，请联系管理员开启或使用兑换码充值。',
            )}
            className='!rounded-xl'
            closeIcon={null}
          />
        )}
      </Card>
    </Space>
  );

  return (
    <Card className='topup-shell-card !rounded-2xl shadow-sm border-0'>
      <div className='topup-shell-card__header flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='topup-shell-card__heading flex items-center min-w-0'>
          <Avatar size='small' color='blue' className='mr-3 shadow-md'>
            <CreditCard size={16} />
          </Avatar>
          <div className='min-w-0'>
            <Typography.Text className='text-lg font-medium'>
              {t('账户充值')}
            </Typography.Text>
            <div className='text-xs'>{t('多种充值方式，安全便捷')}</div>
          </div>
        </div>
        <div className='topup-shell-card__actions flex flex-wrap items-center gap-2 sm:justify-end'>
          <Button
            icon={<Receipt size={16} />}
            theme='solid'
            onClick={onOpenHistory}
            className='topup-history-trigger !rounded-xl'
          >
            {t('账单')}
          </Button>
        </div>
      </div>

      <Tabs
        type='card'
        activeKey={activeTab}
        onChange={setActiveTab}
        className='topup-tabs'
      >
        {shouldShowSubscription && (
          <TabPane
            tab={
              <div className='flex items-center gap-2'>
                <Sparkles size={16} />
                {t('订阅套餐')}
              </div>
            }
            itemKey='subscription'
          >
            <div className='py-2'>
              <SubscriptionPlansCard
                t={t}
                loading={subscriptionLoading}
                plans={subscriptionPlans}
                payMethods={payMethods}
                enableOnlineTopUp={enableOnlineTopUp}
                enableStripeTopUp={enableStripeTopUp}
                enableCreemTopUp={enableCreemTopUp}
                billingPreference={billingPreference}
                onChangeBillingPreference={onChangeBillingPreference}
                activeSubscriptions={activeSubscriptions}
                allSubscriptions={allSubscriptions}
                reloadSubscriptionSelf={reloadSubscriptionSelf}
                withCard={false}
              />
            </div>
          </TabPane>
        )}
        <TabPane
          tab={
            <div className='flex items-center gap-2'>
              <Wallet size={16} />
              {t('额度充值')}
            </div>
          }
          itemKey='topup'
        >
          <div className='space-y-4 py-2'>
            {topupContent}
            {redeemPanel}
          </div>
        </TabPane>
        {Array.isArray(topupInfo?.auto_delivery_products) && (
        <TabPane
          tab={
            <div className='flex items-center gap-2'>
              <IconGift size={16} />
              {t('自动发货')}
            </div>
          }
          itemKey='auto_delivery'
        >
          <div className='py-2'>
            <AutoDeliveryShop
              t={t}
              reloadUserQuota={reloadSubscriptionSelf}
              payMethods={payMethods}
              enableOnlineTopUp={enableOnlineTopUp}
              enableStripeTopUp={enableStripeTopUp}
              enableCreemTopUp={enableCreemTopUp}
              products={topupInfo?.auto_delivery_products || []}
            />
          </div>
        </TabPane>
        )}
      </Tabs>
    </Card>
  );
};

export default RechargeCard;
