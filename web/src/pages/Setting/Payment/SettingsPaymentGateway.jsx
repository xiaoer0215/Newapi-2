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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  InputNumber,
  Row,
  Space,
  Spin,
  Typography,
} from '@douyinfe/semi-ui';
import {
  API,
  removeTrailingSlash,
  showError,
  showSuccess,
  verifyJSON,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const createAmountRow = (amount = 0, discount = 1, gift = 0) => ({
  id: `${Date.now()}-${Math.random()}`,
  amount: Number(amount || 0),
  discount: Number(discount || 1),
  discountedPrice:
    Number(amount || 0) > 0
      ? Number((Number(amount || 0) * Number(discount || 1)).toFixed(2))
      : 0,
  gift: Math.round(Number(gift || 0)),
});

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

const buildRowsFromConfig = (
  amountOptionsRaw,
  amountDiscountRaw,
  amountGiftRaw,
) => {
  const amountOptions = safeParse(amountOptionsRaw, []);
  const amountDiscount = safeParse(amountDiscountRaw, {});
  const amountGift = safeParse(amountGiftRaw, {});

  const amountSet = new Set();
  amountOptions.forEach((item) => amountSet.add(Number(item)));
  Object.keys(amountDiscount || {}).forEach((item) =>
    amountSet.add(Number(item)),
  );
  Object.keys(amountGift || {}).forEach((item) => amountSet.add(Number(item)));

  const rows = Array.from(amountSet)
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((a, b) => a - b)
    .map((amount) =>
      createAmountRow(
        amount,
        Number(amountDiscount?.[amount] || 1),
        Number(amountGift?.[amount] || 0),
      ),
    );

  return rows.length > 0 ? rows : [createAmountRow(10, 1, 0)];
};

const normalizeRow = (row) => {
  const amount = Number(row.amount || 0);
  const gift = Math.round(Number(row.gift || 0));
  let discount = Number(row.discount || 1);
  let discountedPrice = Number(row.discountedPrice || 0);

  if (!Number.isFinite(discount) || discount <= 0) {
    discount = amount > 0 && discountedPrice > 0 ? discountedPrice / amount : 1;
  }
  if (!Number.isFinite(discount) || discount <= 0) {
    discount = 1;
  }

  if (!Number.isFinite(discountedPrice) || discountedPrice <= 0) {
    discountedPrice = amount > 0 ? amount * discount : 0;
  }

  if (amount > 0 && discountedPrice > 0) {
    discount = Number((discountedPrice / amount).toFixed(4));
  }

  return {
    ...row,
    amount,
    discount,
    discountedPrice: Number(discountedPrice.toFixed(2)),
    gift,
  };
};

const serializeRows = (rows) => {
  const normalizedRows = rows
    .map((row) => normalizeRow(row))
    .filter((row) => Number(row.amount || 0) > 0)
    .sort((a, b) => a.amount - b.amount);

  const amountOptions = normalizedRows.map((row) => Number(row.amount));
  const amountDiscount = {};
  const amountGift = {};

  normalizedRows.forEach((row) => {
    if (Number(row.discount || 1) > 0 && Number(row.discount || 1) !== 1) {
      amountDiscount[row.amount] = Number(Number(row.discount).toFixed(4));
    }
    if (Number(row.gift || 0) > 0) {
      amountGift[row.amount] = Math.round(Number(row.gift));
    }
  });

  return {
    amountOptions,
    amountDiscount,
    amountGift,
  };
};

export default function SettingsPaymentGateway(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    PayAddress: '',
    EpayId: '',
    EpayKey: '',
    Price: 7.3,
    MinTopUp: 1,
    TopupGroupRatio: '',
    CustomCallbackAddress: '',
    PayMethods: '',
    AmountOptions: '',
    AmountDiscount: '',
    AmountGift: '',
    AmountCustomDiscount: '1',
  });
  const [originInputs, setOriginInputs] = useState({});
  const [amountRows, setAmountRows] = useState([createAmountRow(10, 1, 0)]);
  // separate state for the custom discount InputNumber to avoid controlled/uncontrolled issues
  const [customDiscountDisplay, setCustomDiscountDisplay] = useState(1);
  const formApiRef = useRef(null);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      const currentInputs = {
        PayAddress: props.options.PayAddress || '',
        EpayId: props.options.EpayId || '',
        EpayKey: props.options.EpayKey || '',
        Price:
          props.options.Price !== undefined
            ? parseFloat(props.options.Price)
            : 7.3,
        MinTopUp:
          props.options.MinTopUp !== undefined
            ? parseFloat(props.options.MinTopUp)
            : 1,
        TopupGroupRatio: props.options.TopupGroupRatio || '',
        CustomCallbackAddress: props.options.CustomCallbackAddress || '',
        PayMethods: props.options.PayMethods || '',
        AmountOptions: props.options.AmountOptions || '',
        AmountDiscount: props.options.AmountDiscount || '',
        AmountGift: props.options.AmountGift || '',
        AmountCustomDiscount: props.options.AmountCustomDiscount || '1',
      };

      // Sync the separate display state for the custom discount field
      const parsedCustomDiscount = parseFloat(currentInputs.AmountCustomDiscount);
      setCustomDiscountDisplay(
        Number.isFinite(parsedCustomDiscount) && parsedCustomDiscount > 0
          ? parsedCustomDiscount
          : 1
      );

      setInputs(currentInputs);
      setOriginInputs({ ...currentInputs });
      setAmountRows(
        buildRowsFromConfig(
          currentInputs.AmountOptions,
          currentInputs.AmountDiscount,
          currentInputs.AmountGift,
        ),
      );
      formApiRef.current.setValues(currentInputs);
    }
  }, [props.options]);

  const handleFormChange = (values) => {
    setInputs((prev) => ({ ...prev, ...values }));
  };

  const updateAmountRow = (id, patch) => {
    setAmountRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const nextRow = { ...row, ...patch };
        return normalizeRow(nextRow);
      }),
    );
  };

  const handleRowAmountChange = (id, value) => {
    setAmountRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const amount = Number(value || 0);
        const discount = Number(row.discount || 1);
        return normalizeRow({
          ...row,
          amount,
          discountedPrice: amount > 0 ? amount * discount : 0,
        });
      }),
    );
  };

  const handleRowDiscountChange = (id, value) => {
    setAmountRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const discount = Number(value || 1);
        return normalizeRow({
          ...row,
          discount,
          discountedPrice: Number(row.amount || 0) * discount,
        });
      }),
    );
  };

  const handleRowDiscountedPriceChange = (id, value) => {
    setAmountRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const discountedPrice = Number(value || 0);
        const amount = Number(row.amount || 0);
        return normalizeRow({
          ...row,
          discountedPrice,
          discount: amount > 0 ? discountedPrice / amount : 1,
        });
      }),
    );
  };

  const addAmountRow = () => {
    setAmountRows((prev) => [...prev, createAmountRow(0, 1, 0)]);
  };

  const removeAmountRow = (id) => {
    setAmountRows((prev) =>
      prev.length > 1 ? prev.filter((row) => row.id !== id) : prev,
    );
  };

  const amountPreviewRows = useMemo(
    () =>
      amountRows.map((row) => ({
        ...normalizeRow(row),
        credited: Number(row.amount || 0) + Number(row.gift || 0),
      })),
    [amountRows],
  );

  const submitPayAddress = async () => {
    if (props.options.ServerAddress === '') {
      showError(t('请先填写服务器地址'));
      return;
    }

    if (originInputs.TopupGroupRatio !== inputs.TopupGroupRatio) {
      if (!verifyJSON(inputs.TopupGroupRatio)) {
        showError(t('充值分组倍率不是合法的 JSON 字符串'));
        return;
      }
    }

    if (originInputs.PayMethods !== inputs.PayMethods) {
      if (!verifyJSON(inputs.PayMethods)) {
        showError(t('充值方式设置不是合法的 JSON 字符串'));
        return;
      }
    }

    const serializedRows = serializeRows(amountRows);
    // custom discount: 0 < v < 1 is a real discount; 1 (or anything else) means no discount
    const customDiscountVal = parseFloat(inputs.AmountCustomDiscount);
    const customDiscount = Number.isFinite(customDiscountVal) && customDiscountVal > 0 && customDiscountVal < 1
      ? customDiscountVal
      : 1;  // store 1 when no discount (not 0) to avoid falsy-zero display issues

    setLoading(true);
    try {
      const options = [
        { key: 'PayAddress', value: removeTrailingSlash(inputs.PayAddress) },
        {
          key: 'payment_setting.amount_options',
          value: JSON.stringify(serializedRows.amountOptions),
        },
        {
          key: 'payment_setting.amount_discount',
          value: JSON.stringify(serializedRows.amountDiscount),
        },
        {
          key: 'payment_setting.amount_gift',
          value: JSON.stringify(serializedRows.amountGift),
        },
        {
          key: 'payment_setting.custom_discount',
          value: String(customDiscount),
        },
      ];

      if (inputs.EpayId !== '') {
        options.push({ key: 'EpayId', value: inputs.EpayId });
      }
      if (inputs.EpayKey !== undefined && inputs.EpayKey !== '') {
        options.push({ key: 'EpayKey', value: inputs.EpayKey });
      }
      if (inputs.Price !== '') {
        options.push({ key: 'Price', value: inputs.Price.toString() });
      }
      if (inputs.MinTopUp !== '') {
        options.push({ key: 'MinTopUp', value: inputs.MinTopUp.toString() });
      }
      if (inputs.CustomCallbackAddress !== undefined) {
        options.push({
          key: 'CustomCallbackAddress',
          value: inputs.CustomCallbackAddress,
        });
      }
      if (originInputs.TopupGroupRatio !== inputs.TopupGroupRatio) {
        options.push({ key: 'TopupGroupRatio', value: inputs.TopupGroupRatio });
      }
      if (originInputs.PayMethods !== inputs.PayMethods) {
        options.push({ key: 'PayMethods', value: inputs.PayMethods });
      }

      const results = await Promise.all(
        options.map((opt) =>
          API.put('/api/option/', { key: opt.key, value: opt.value }),
        ),
      );

      const errorResults = results.filter((res) => !res.data.success);
      if (errorResults.length > 0) {
        errorResults.forEach((res) => showError(res.data.message));
      } else {
        showSuccess(t('更新成功'));
        setOriginInputs({ ...inputs });
        props.refresh && props.refresh();
      }
    } catch (_) {
      showError(t('更新失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={handleFormChange}
        getFormApi={(api) => (formApiRef.current = api)}
      >
        <Form.Section text={t('支付设置')}>
          <Text>
            {t(
              '当前在线支付仍按已有网关配置生效，下面的可视化档位会同步到钱包充值页面与到账展示。',
            )}
          </Text>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} md={8}>
              <Form.Input
                field='PayAddress'
                label={t('支付地址')}
                placeholder={t('例如：https://yourdomain.com')}
              />
            </Col>
            <Col xs={24} md={8}>
              <Form.Input
                field='EpayId'
                label={t('易支付商户 ID')}
                placeholder={t('例如：1001')}
              />
            </Col>
            <Col xs={24} md={8}>
              <Form.Input
                field='EpayKey'
                label={t('易支付商户密钥')}
                placeholder={t('敏感信息不会回显到前端')}
                type='password'
              />
            </Col>
          </Row>

          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} md={8}>
              <Form.Input
                field='CustomCallbackAddress'
                label={t('回调地址')}
                placeholder={t('例如：https://yourdomain.com')}
              />
            </Col>
            <Col xs={24} md={8}>
              <Form.InputNumber
                field='Price'
                precision={2}
                label={t('充值价格（x 元 = 1 美元）')}
                placeholder={t('例如：7.3')}
              />
            </Col>
            <Col xs={24} md={8}>
              <Form.InputNumber
                field='MinTopUp'
                label={t('最低充值数量')}
                placeholder={t('例如：1')}
              />
            </Col>
          </Row>

          <Form.TextArea
            field='TopupGroupRatio'
            label={t('充值分组倍率')}
            placeholder={t('请输入 JSON 文本，键为分组名，值为倍率')}
            autosize
          />
          <Form.TextArea
            field='PayMethods'
            label={t('充值方式设置')}
            placeholder={t('请输入 JSON 文本')}
            autosize
          />

          <Divider margin='20px' />
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div>
              <Typography.Title heading={6} style={{ marginBottom: 4 }}>
                {t('充值档位可视化配置')}
              </Typography.Title>
              <Text type='tertiary'>
                {t('折后价填写后会自动反算折扣；到账 = 充值数量 + 赠送金额。')}
              </Text>
            </div>
            <Button theme='outline' onClick={addAmountRow}>
              {t('新增档位')}
            </Button>
          </div>

          <Space vertical style={{ width: '100%' }} spacing={12}>
            {amountPreviewRows.map((row, index) => (
              <Card
                key={row.id}
                bodyStyle={{ padding: 16 }}
                className='!rounded-2xl'
              >
                <div className='mb-3 flex items-center justify-between gap-2'>
                  <Text strong>
                    {t('档位')} #{index + 1}
                  </Text>
                  <Button
                    theme='borderless'
                    type='danger'
                    disabled={amountRows.length <= 1}
                    onClick={() => removeAmountRow(row.id)}
                  >
                    {t('删除')}
                  </Button>
                </div>

                <Row gutter={12}>
                  <Col xs={24} md={6}>
                    <div className='mb-1 text-xs text-semi-color-text-2'>
                      {t('充值数量')}
                    </div>
                    <InputNumber
                      value={row.amount}
                      min={0}
                      precision={0}
                      style={{ width: '100%' }}
                      onChange={(value) => handleRowAmountChange(row.id, value)}
                    />
                  </Col>
                  <Col xs={24} md={4}>
                    <div className='mb-1 text-xs text-semi-color-text-2'>
                      {t('折扣')}
                    </div>
                    <InputNumber
                      value={row.discount}
                      min={0.01}
                      max={1}
                      precision={4}
                      step={0.01}
                      style={{ width: '100%' }}
                      onChange={(value) =>
                        handleRowDiscountChange(row.id, value)
                      }
                    />
                  </Col>
                  <Col xs={24} md={5}>
                    <div className='mb-1 text-xs text-semi-color-text-2'>
                      {t('折后价')}
                    </div>
                    <InputNumber
                      value={row.discountedPrice}
                      min={0}
                      precision={2}
                      style={{ width: '100%' }}
                      onChange={(value) =>
                        handleRowDiscountedPriceChange(row.id, value)
                      }
                    />
                  </Col>
                  <Col xs={24} md={4}>
                    <div className='mb-1 text-xs text-semi-color-text-2'>
                      {t('可赠送的金额')}
                    </div>
                    <InputNumber
                      value={row.gift}
                      min={0}
                      precision={0}
                      style={{ width: '100%' }}
                      onChange={(value) =>
                        updateAmountRow(row.id, {
                          gift: Math.round(Number(value || 0)),
                        })
                      }
                    />
                  </Col>
                  <Col xs={24} md={5}>
                    <div className='mb-1 text-xs text-semi-color-text-2'>
                      {t('到账预览')}
                    </div>
                    <Card
                      bodyStyle={{ padding: '10px 12px' }}
                      className='!rounded-xl !bg-semi-color-fill-0'
                    >
                      <Text strong>{Number(row.credited).toFixed(0)}</Text>
                    </Card>
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>

          <div style={{ marginTop: 20 }}>
            <Typography.Title heading={6} style={{ marginBottom: 4 }}>
              {t('自定义数量折扣')}
            </Typography.Title>
            <Text type='tertiary'>
              {t('用户输入非预设档位金额时适用的折扣，填 1 或留空表示不打折，例如 0.9 表示九折。')}
            </Text>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                value={customDiscountDisplay}
                min={0.01}
                max={1}
                precision={4}
                step={0.01}
                style={{ width: 160 }}
                onChange={(value) => {
                  const v = value != null && Number.isFinite(value) && value > 0 ? value : 1;
                  setCustomDiscountDisplay(v);
                  setInputs((prev) => ({ ...prev, AmountCustomDiscount: String(v) }));
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <Button onClick={submitPayAddress}>{t('更新支付设置')}</Button>
          </div>
        </Form.Section>
      </Form>
    </Spin>
  );
}
