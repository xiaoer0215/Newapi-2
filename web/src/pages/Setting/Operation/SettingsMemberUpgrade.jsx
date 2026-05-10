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

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Form,
  Button,
  Switch,
  Typography,
  Space,
  TextArea,
  Input,
} from '@douyinfe/semi-ui';
import { API, showSuccess, showError, showWarning } from '../../../helpers';

const { Text } = Typography;

export default function SettingsMemberUpgrade(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    MemberUpgradeEnabled: true,
    MemberUpgradeAdminOnly: false,
    MemberUpgradeFAQ: '',
    MemberBalanceConversionTitle: '',
    MemberBalanceConversionContent: '',
  });
  const [originalInputs, setOriginalInputs] = useState({});

  const defaultFAQ = [
    {
      question: '升级后余额为什么变少了？',
      answer: '升级后当前余额会按 0.05 的比例换算下调，比如原有 $200 会显示为 $10。虽然显示数值会变化，但 SVIP 基础单价更低，后续消费反而会更优惠。'
    },
    {
      question: 'SVIP 到期后我的数据会丢失吗？',
      answer: '绝对不会。SVIP 主要影响的是费率和外观身份。到期后仅仅是恢复标准费率和普通用户卡面，历史记录、配置和数据资产都不会受影响。'
    },
    {
      question: '我可以叠加购买新的套餐吗？',
      answer: '不可以。如您购买的是月卡，需等到期后才可重新开通其他套餐。当前套餐有效期内无法叠加或更换。'
    },
    {
      question: '如果当前分组不支持升级怎么办？',
      answer: '如果当前账号分组不支持直接升级，系统会在点击开通时进行拦截并给出提示，你可以联系管理员调整基础分组。'
    }
  ];

  useEffect(() => {
    if (props.options) {
      let faqValue = '';
      try {
        if (props.options.MemberUpgradeFAQ) {
          const parsed = JSON.parse(props.options.MemberUpgradeFAQ);
          faqValue = JSON.stringify(parsed, null, 2);
        }
      } catch (e) {
        // 解析失败时保持空字符串
      }

      const currentInputs = {
        MemberUpgradeEnabled:
          props.options.MemberUpgradeEnabled === 'true' ||
          props.options.MemberUpgradeEnabled === true ||
          props.options.MemberUpgradeEnabled === undefined,
        MemberUpgradeAdminOnly:
          props.options.MemberUpgradeAdminOnly === 'true' ||
          props.options.MemberUpgradeAdminOnly === true,
        MemberUpgradeFAQ: faqValue,
        MemberBalanceConversionTitle: props.options.MemberBalanceConversionTitle || '',
        MemberBalanceConversionContent: props.options.MemberBalanceConversionContent || '',
      };
      setInputs(currentInputs);
      setOriginalInputs(currentInputs);
    }
  }, [props.options]);

  const handleChange = (field) => (value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async () => {
    // 检查是否有修改
    if (
      inputs.MemberUpgradeEnabled === originalInputs.MemberUpgradeEnabled &&
      inputs.MemberUpgradeAdminOnly === originalInputs.MemberUpgradeAdminOnly &&
      inputs.MemberUpgradeFAQ === originalInputs.MemberUpgradeFAQ &&
      inputs.MemberBalanceConversionTitle === originalInputs.MemberBalanceConversionTitle &&
      inputs.MemberBalanceConversionContent === originalInputs.MemberBalanceConversionContent
    ) {
      return showWarning(t('你似乎并没有修改什么'));
    }

    // 验证FAQ格式
    if (inputs.MemberUpgradeFAQ) {
      try {
        const parsed = JSON.parse(inputs.MemberUpgradeFAQ);
        if (!Array.isArray(parsed)) {
          return showError(t('FAQ格式错误：必须是JSON数组'));
        }
        for (const item of parsed) {
          if (!item.question || !item.answer) {
            return showError(t('FAQ格式错误：每项必须包含question和answer字段'));
          }
        }
      } catch (e) {
        return showError(t('FAQ格式错误：') + e.message);
      }
    }

    setLoading(true);
    try {
      const requests = [
        API.put('/api/option/', {
          key: 'MemberUpgradeEnabled',
          value: String(inputs.MemberUpgradeEnabled),
        }),
        API.put('/api/option/', {
          key: 'MemberUpgradeAdminOnly',
          value: String(inputs.MemberUpgradeAdminOnly),
        }),
        API.put('/api/option/', {
          key: 'MemberUpgradeFAQ',
          value: inputs.MemberUpgradeFAQ,
        }),
        API.put('/api/option/', {
          key: 'MemberBalanceConversionTitle',
          value: inputs.MemberBalanceConversionTitle,
        }),
        API.put('/api/option/', {
          key: 'MemberBalanceConversionContent',
          value: inputs.MemberBalanceConversionContent,
        }),
      ];

      const results = await Promise.all(requests);
      const hasError = results.some((res) => !res.data?.success);

      if (hasError) {
        showError(t('部分保存失败，请重试'));
      } else {
        showSuccess(t('保存成功'));
        setOriginalInputs(inputs);
        if (props.refresh) {
          await props.refresh();
        }
      }
    } catch (error) {
      showError(t('保存失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
        {t('会员升级功能设置')}
      </h3>

      {/* 两列布局：开关 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={{ padding: '12px', backgroundColor: 'var(--semi-color-fill-0)', borderRadius: '6px', border: '1px solid var(--semi-color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>{t('侧边栏展示会员升级入口')}</span>
            <Switch checked={inputs.MemberUpgradeEnabled} onChange={handleChange('MemberUpgradeEnabled')} />
          </div>
          <Text type='secondary' size='small' style={{ fontSize: '12px', lineHeight: '1.5' }}>
            {t('关闭后，侧边栏将不显示"会员升级"入口，用户无法通过侧边栏访问会员升级页面。注意：此开关需要配合"侧边栏管理"中的会员升级模块一起使用。')}
          </Text>
        </div>

        <div style={{ padding: '12px', backgroundColor: inputs.MemberUpgradeAdminOnly ? 'var(--semi-color-warning-light-default)' : 'var(--semi-color-fill-0)', borderRadius: '6px', border: inputs.MemberUpgradeAdminOnly ? '1px solid var(--semi-color-warning-light-active)' : '1px solid var(--semi-color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>{t('仅管理员可见（测试模式）')}</span>
            <Switch checked={inputs.MemberUpgradeAdminOnly} onChange={handleChange('MemberUpgradeAdminOnly')} />
          </div>
          <Text type='secondary' size='small' style={{ fontSize: '12px', lineHeight: '1.5' }}>
            {t('开启后，只有管理员账户可以看到并访问会员升级功能，普通用户无法看到该入口。适合在正式上线前进行测试。')}
          </Text>
        </div>
      </div>

      {/* 使用说明 */}
      <div style={{ padding: '10px 12px', backgroundColor: 'var(--semi-color-info-light-default)', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', lineHeight: '1.6', color: 'var(--semi-color-info-dark)' }}>
        <strong>{t('使用说明：')}</strong>
        {t('1. "侧边栏展示"开关控制会员升级入口是否在侧边栏显示')} |
        {t('2. "仅管理员可见"开关用于测试阶段，开启后只有管理员能看到该功能')} |
        {t('3. 两个开关可以独立控制，建议先开启"仅管理员可见"进行测试，确认无误后再关闭')} |
        {t('4. 如需完全隐藏该功能，请同时关闭"侧边栏展示"并在"侧边栏管理"中禁用会员升级模块')}
      </div>

      {/* FAQ配置 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>{t('常见问题配置（FAQ）')}</div>
        <Text type='secondary' size='small' style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
          {t('配置会员升级页面的常见问题，格式为JSON数组，每项包含question和answer字段')}
        </Text>
        <TextArea
          value={inputs.MemberUpgradeFAQ}
          onChange={handleChange('MemberUpgradeFAQ')}
          placeholder={JSON.stringify(defaultFAQ, null, 2)}
          autosize={{ minRows: 6, maxRows: 15 }}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        />
      </div>

      {/* 两列布局：余额换算 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>{t('余额换算说明标题')}</div>
          <Input
            value={inputs.MemberBalanceConversionTitle}
            onChange={handleChange('MemberBalanceConversionTitle')}
            placeholder='余额换算说明'
            size='small'
          />
        </div>
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>{t('余额换算说明内容')}</div>
          <TextArea
            value={inputs.MemberBalanceConversionContent}
            onChange={handleChange('MemberBalanceConversionContent')}
            placeholder='升级至 SVIP 后，当前余额会按 <strong>0.05</strong> 的比例换算下调...'
            autosize={{ minRows: 3, maxRows: 8 }}
            style={{ fontSize: '12px' }}
          />
        </div>
      </div>

      {/* 保存按钮 */}
      <div style={{ paddingTop: '12px', borderTop: '1px solid var(--semi-color-border)' }}>
        <Button type='primary' onClick={onSubmit} loading={loading} style={{ minWidth: '100px' }}>
          {t('保存设置')}
        </Button>
      </div>
    </div>
  );
}
