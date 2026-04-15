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

import React from 'react';
import { Card, Modal, Skeleton, Tag, Typography } from '@douyinfe/semi-ui';
import { SiAlipay, SiStripe, SiWechat } from 'react-icons/si';
import { Coins, CreditCard, Wallet } from 'lucide-react';

const { Text } = Typography;

const PaymentConfirmModal = ({
  t,
  open,
  onlineTopUp,
  handleCancel,
  confirmLoading,
  topUpCount,
  renderQuotaWithAmount,
  amountLoading,
  renderAmount,
  payWay,
  payMethods,
  amountNumber,
  discountRate,
  giftAmount = 0,
  creditAmount = 0,
}) => {
  const hasDiscount =
    discountRate && discountRate > 0 && discountRate < 1 && amountNumber > 0;
  const originalAmount = hasDiscount ? amountNumber / discountRate : 0;
  const discountAmount = hasDiscount ? originalAmount - amountNumber : 0;

  const payMethod = payMethods.find((method) => method.type === payWay);
  const methodName =
    payMethod?.name ||
    (payWay === 'alipay'
      ? t('支付宝')
      : payWay === 'wxpay'
        ? t('微信')
        : 'Stripe');

  const renderPayIcon = () => {
    if (payWay === 'alipay') return <SiAlipay size={18} color='#1677FF' />;
    if (payWay === 'wxpay') return <SiWechat size={18} color='#07C160' />;
    if (payWay === 'stripe') return <SiStripe size={18} color='#635BFF' />;
    return (
      <CreditCard
        size={18}
        color={payMethod?.color || 'var(--semi-color-text-2)'}
      />
    );
  };

  return (
    <Modal
      title={t('确认充值')}
      visible={open}
      onOk={onlineTopUp}
      onCancel={handleCancel}
      maskClosable={false}
      size='small'
      centered
      confirmLoading={confirmLoading}
      okText={t('立即支付')}
      cancelText={t('取消')}
    >
      <div className='space-y-4'>
        <Card className='!rounded-2xl !border !border-semi-color-border !shadow-none'>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='inline-flex items-center gap-2 rounded-full border border-semi-color-border bg-semi-color-fill-0 px-3 py-1 text-xs font-medium'>
                <Coins size={14} />
                {t('充值档位')}
              </span>
              {hasDiscount && (
                <Tag color='green' type='light'>
                  {(Number(discountRate) * 10).toFixed(1)} {t('折')}
                </Tag>
              )}
            </div>
            <div className='text-2xl font-semibold text-semi-color-text-0'>
              {renderQuotaWithAmount(topUpCount)}
            </div>
            {giftAmount > 0 && (
              <div className='flex items-center gap-2 text-sm'>
                <Wallet size={15} />
                <span className='text-slate-600'>
                  {t('到账')} {renderQuotaWithAmount(creditAmount)}
                </span>
                <span className='text-red-500'>
                  {t('赠送')} {renderQuotaWithAmount(giftAmount)}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card className='!rounded-2xl !border !border-semi-color-border !shadow-none'>
          <div className='grid gap-3'>
            <div className='flex items-center justify-between'>
              <Text type='tertiary'>{t('支付方式')}</Text>
              <div className='flex items-center gap-2'>
                {renderPayIcon()}
                <Text>{methodName}</Text>
              </div>
            </div>

            <div className='flex items-center justify-between'>
              <Text type='tertiary'>{t('实付金额')}</Text>
              {amountLoading ? (
                <Skeleton.Title style={{ width: 80, height: 18 }} />
              ) : (
                <Text strong style={{ color: 'rgb(220, 38, 38)' }}>
                  {renderAmount()}
                </Text>
              )}
            </div>

            {hasDiscount && !amountLoading && (
              <>
                <div className='flex items-center justify-between'>
                  <Text type='tertiary'>{t('原价')}</Text>
                  <Text delete>{`¥${originalAmount.toFixed(2)}`}</Text>
                </div>
                <div className='flex items-center justify-between'>
                  <Text type='tertiary'>{t('优惠')}</Text>
                  <Text style={{ color: 'rgb(5, 150, 105)' }}>
                    - ¥{discountAmount.toFixed(2)}
                  </Text>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </Modal>
  );
};

export default PaymentConfirmModal;
