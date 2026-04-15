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
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';

const { Text } = Typography;

const unitOptions = [
  { label: '天', value: 'day' },
  { label: '小时', value: 'hour' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
  { label: '自定义秒数', value: 'custom' },
];

const AdjustUserSubscriptionDurationModal = ({
  visible,
  action,
  record,
  loading,
  onCancel,
  onSubmit,
  t,
}) => {
  const [durationUnit, setDurationUnit] = useState('day');
  const [durationValue, setDurationValue] = useState(7);
  const [customSeconds, setCustomSeconds] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setDurationUnit('day');
    setDurationValue(action === 'gift' ? 30 : 7);
    setCustomSeconds(0);
  }, [visible, action]);

  const title = action === 'gift' ? t('赠送时长') : t('补时');

  const subtitle = useMemo(() => {
    const userName =
      record?.user?.display_name || record?.user?.username || t('未知用户');
    const planTitle =
      record?.plan?.title || `#${record?.subscription?.plan_id || '-'}`;
    return `${userName} · ${planTitle}`;
  }, [record, t]);

  const handleOk = async () => {
    const payload = {
      action,
      duration_unit: durationUnit,
      duration_value:
        durationUnit === 'custom' ? 0 : Number(durationValue || 0),
      custom_seconds:
        durationUnit === 'custom' ? Number(customSeconds || 0) : 0,
    };
    const ok = await onSubmit?.(record?.subscription?.id, payload);
    if (ok) {
      onCancel?.();
    }
  };

  return (
    <Modal
      title={title}
      visible={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      centered
      maskClosable={false}
    >
      <div className='space-y-4'>
        <Space>
          <Tag color='blue'>{action === 'gift' ? t('赠送') : t('补时')}</Tag>
          <Text strong>{subtitle}</Text>
        </Space>

        <div>
          <Text strong className='block mb-2'>
            {t('时长单位')}
          </Text>
          <Select
            value={durationUnit}
            optionList={unitOptions.map((item) => ({
              ...item,
              label: t(item.label),
            }))}
            onChange={(value) => setDurationUnit(value)}
            style={{ width: '100%' }}
          />
        </div>

        {durationUnit === 'custom' ? (
          <div>
            <Text strong className='block mb-2'>
              {t('秒数')}
            </Text>
            <InputNumber
              min={1}
              value={customSeconds}
              onChange={(value) => setCustomSeconds(value)}
              style={{ width: '100%' }}
            />
          </div>
        ) : (
          <div>
            <Text strong className='block mb-2'>
              {t('数量')}
            </Text>
            <InputNumber
              min={1}
              value={durationValue}
              onChange={(value) => setDurationValue(value)}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AdjustUserSubscriptionDurationModal;
