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
import { Banner, Button, Col, Form, Row, Spin, Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import {
  API,
  removeTrailingSlash,
  showError,
  showSuccess,
} from '../../../helpers';

const { Text } = Typography;

const parseBooleanOption = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value === 'true';
  }
  return Boolean(value);
};

const buildInputs = (options = {}) => ({
  StripeApiSecret: options.StripeApiSecret || '',
  StripeWebhookSecret: options.StripeWebhookSecret || '',
  StripePriceId: options.StripePriceId || '',
  StripeUnitPrice:
    options.StripeUnitPrice !== undefined &&
    options.StripeUnitPrice !== null &&
    options.StripeUnitPrice !== ''
      ? parseFloat(options.StripeUnitPrice)
      : 8,
  StripeMinTopUp:
    options.StripeMinTopUp !== undefined &&
    options.StripeMinTopUp !== null &&
    options.StripeMinTopUp !== ''
      ? parseInt(options.StripeMinTopUp, 10)
      : 1,
  StripeTopUpEnabled: parseBooleanOption(options.StripeTopUpEnabled, true),
  StripePromotionCodesEnabled: parseBooleanOption(
    options.StripePromotionCodesEnabled,
    false,
  ),
});

export default function SettingsPaymentGatewayStripe(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState(buildInputs());
  const formApiRef = useRef(null);

  useEffect(() => {
    if (!props.options || !formApiRef.current) {
      return;
    }
    const nextInputs = buildInputs(props.options);
    setInputs(nextInputs);
    formApiRef.current.setValues(nextInputs);
  }, [props.options]);

  const handleFormChange = (values) => {
    setInputs((prev) => ({
      ...prev,
      ...values,
    }));
  };

  const submitStripeSetting = async () => {
    if (!props.options?.ServerAddress) {
      showError(t('请先填写服务器地址'));
      return;
    }

    setLoading(true);
    try {
      const options = [
        { key: 'StripeApiSecret', value: inputs.StripeApiSecret || '' },
        {
          key: 'StripeWebhookSecret',
          value: inputs.StripeWebhookSecret || '',
        },
        { key: 'StripePriceId', value: inputs.StripePriceId || '' },
        {
          key: 'StripeUnitPrice',
          value: String(inputs.StripeUnitPrice ?? 8),
        },
        {
          key: 'StripeMinTopUp',
          value: String(inputs.StripeMinTopUp ?? 1),
        },
        {
          key: 'StripeTopUpEnabled',
          value: inputs.StripeTopUpEnabled ? 'true' : 'false',
        },
        {
          key: 'StripePromotionCodesEnabled',
          value: inputs.StripePromotionCodesEnabled ? 'true' : 'false',
        },
      ];

      const results = await Promise.all(
        options.map((option) =>
          API.put('/api/option/', {
            key: option.key,
            value: option.value,
          }),
        ),
      );

      const failed = results.filter((res) => !res.data.success);
      if (failed.length > 0) {
        failed.forEach((res) => showError(res.data.message));
        return;
      }

      showSuccess(t('更新成功'));
      props.refresh?.();
    } catch (error) {
      showError(t('更新失败'));
    } finally {
      setLoading(false);
    }
  };

  const webhookBase = props.options?.ServerAddress
    ? removeTrailingSlash(props.options.ServerAddress)
    : t('服务器地址');

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={handleFormChange}
        getFormApi={(api) => {
          formApiRef.current = api;
        }}
      >
        <Form.Section text={t('Stripe 设置')}>
          <Text>
            {t('Stripe 密钥、Webhook 等配置请前往')}{' '}
            <a
              href='https://dashboard.stripe.com/developers'
              rel='noreferrer'
              target='_blank'
            >
              Stripe Dashboard
            </a>
            {t(' 查看，建议先在测试环境完成联调。')}
          </Text>

          <Banner
            type='info'
            description={`Webhook URL: ${webhookBase}/api/stripe/webhook`}
          />
          <Banner
            type='warning'
            description='Webhook 需要包含事件：checkout.session.completed、checkout.session.expired、checkout.session.async_payment_succeeded、checkout.session.async_payment_failed'
            style={{ marginTop: 12 }}
          />

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='StripeApiSecret'
                label={t('API 密钥')}
                placeholder={t('sk_xxx 或 rk_xxx 的 Stripe 密钥，敏感信息不显示')}
                type='password'
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='StripeWebhookSecret'
                label={t('Webhook 签名密钥')}
                placeholder={t('whsec_xxx 的 Webhook 签名密钥，敏感信息不显示')}
                type='password'
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='StripePriceId'
                label={t('商品价格 ID')}
                placeholder={t('price_xxx 的商品价格 ID，新建产品后可获得')}
              />
            </Col>
          </Row>

          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={24} md={6} lg={6} xl={6}>
              <Form.InputNumber
                field='StripeUnitPrice'
                precision={2}
                label={t('Stripe 单价倍率')}
                placeholder='8'
              />
            </Col>
            <Col xs={24} sm={24} md={6} lg={6} xl={6}>
              <Form.InputNumber
                field='StripeMinTopUp'
                label={t('最低充值美元数量')}
                placeholder='1'
              />
            </Col>
            <Col xs={24} sm={24} md={6} lg={6} xl={6}>
              <Form.Switch
                field='StripeTopUpEnabled'
                size='default'
                checkedText='开'
                uncheckedText='关'
                label={t('展示 Stripe 支付')}
              />
            </Col>
            <Col xs={24} sm={24} md={6} lg={6} xl={6}>
              <Form.Switch
                field='StripePromotionCodesEnabled'
                size='default'
                checkedText='开'
                uncheckedText='关'
                label={t('允许在 Stripe 支付中输入优惠码')}
              />
            </Col>
          </Row>

          <Text type='tertiary' style={{ display: 'block', marginTop: 12 }}>
            {t('关闭“展示 Stripe 支付”后，即使已经填写了 Stripe 配置，前台支付页面也不会展示 Stripe。')}
          </Text>

          <Button onClick={submitStripeSetting} style={{ marginTop: 16 }}>
            {t('更新 Stripe 设置')}
          </Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}
