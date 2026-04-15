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
import { Card, Avatar, Typography, Table, Tag } from '@douyinfe/semi-ui';
import { IconCoinMoneyStroked } from '@douyinfe/semi-icons';
import {
  calculateModelPrice,
  getModelPriceItems,
  isPricingModelConfigured,
} from '../../../../../helpers';
import { useIsMobile } from '../../../../../hooks/common/useIsMobile';

const { Text } = Typography;

const PricingValueChip = ({ value, tone }) => (
  <span className={`pricing-model-modal-price-chip ${tone}`}>
    {value || '-'}
  </span>
);

const getUnavailablePriceItems = (modelData, siteDisplayType, t) => {
  if (siteDisplayType === 'TOKENS') {
    return [
      {
        key: 'unavailable-input-ratio',
        label: t('输入倍率'),
        value: t('不可用'),
        suffix: '',
      },
      {
        key: 'unavailable-completion-ratio',
        label: t('补全倍率'),
        value: t('不可用'),
        suffix: '',
      },
    ];
  }

  if (modelData?.quota_type === 1) {
    return [
      {
        key: 'unavailable-fixed-price',
        label: t('模型价格'),
        value: t('不可用'),
        suffix: '',
      },
      {
        key: 'unavailable-price-status',
        label: t('价格状态'),
        value: t('不可用'),
        suffix: '',
      },
    ];
  }

  return [
    {
      key: 'unavailable-input-price',
      label: t('输入价格'),
      value: t('不可用'),
      suffix: '',
    },
    {
      key: 'unavailable-completion-price',
      label: t('补全价格'),
      value: t('不可用'),
      suffix: '',
    },
  ];
};

const ModelPricingTable = ({
  modelData,
  selectedGroup,
  groupRatio,
  detailGroupRatio,
  currency,
  siteDisplayType,
  tokenUnit,
  displayPrice,
  showRatio,
  usableGroup,
  autoGroups = [],
  t,
}) => {
  const isMobile = useIsMobile();
  const modelEnableGroups = Array.isArray(modelData?.enable_groups)
    ? modelData.enable_groups
    : [];
  const pricingGroupRatio = detailGroupRatio || groupRatio || {};

  const autoChain = autoGroups.filter((group) =>
    modelEnableGroups.includes(group),
  );

  const availableGroups = Object.keys(usableGroup || {})
    .filter((group) => group !== '')
    .filter((group) => group !== 'auto')
    .filter((group) => modelEnableGroups.includes(group));

  const fallbackGroups = Array.from(
    new Set(modelEnableGroups.filter((group) => group && group !== 'auto')),
  );
  const baseDisplayGroups =
    availableGroups.length > 0 ? availableGroups : fallbackGroups;
  const displayGroups =
    selectedGroup && selectedGroup !== 'all'
      ? baseDisplayGroups.filter((group) => group === selectedGroup)
      : baseDisplayGroups;
  const useFallbackGroups =
    availableGroups.length === 0 && fallbackGroups.length > 0;

  const tableData = displayGroups.map((group) => {
    const isConfigured = isPricingModelConfigured(modelData);
    const priceData =
      isConfigured && modelData
        ? calculateModelPrice({
            record: modelData,
            selectedGroup: group,
            groupRatio: pricingGroupRatio,
            tokenUnit,
            displayPrice,
            currency,
            quotaDisplayType: siteDisplayType,
          })
        : { price: '-' };

    return {
      key: group,
      group,
      ratio:
        pricingGroupRatio && pricingGroupRatio[group] !== undefined
          ? pricingGroupRatio[group]
          : 1,
      billingType:
        modelData?.quota_type === 0
          ? t('按量计费')
          : modelData?.quota_type === 1
            ? t('按次计费')
            : '-',
      priceItems: isConfigured
        ? getModelPriceItems(priceData, t, siteDisplayType)
        : getUnavailablePriceItems(modelData, siteDisplayType, t),
    };
  });

  const getPrimaryPriceValue = (items, keys) => {
    const matched = keys
      .map((key) => items.find((item) => item.key === key))
      .find(Boolean);
    if (!matched) {
      return '-';
    }
    return `${matched.value}${matched.suffix || ''}`;
  };

  const normalizedTableData = tableData.map((item) => ({
    ...item,
    inputValue: getPrimaryPriceValue(item.priceItems, [
      'input',
      'input-ratio',
      'unavailable-input-price',
      'unavailable-input-ratio',
    ]),
    outputValue: getPrimaryPriceValue(item.priceItems, [
      'completion',
      'completion-ratio',
      'unavailable-completion-price',
      'unavailable-completion-ratio',
    ]),
    fixedValue: getPrimaryPriceValue(item.priceItems, [
      'fixed',
      'unavailable-fixed-price',
    ]),
  }));

  const showFixedPriceColumn = modelData?.quota_type === 1;

  const columns = [
    {
      title: t('分组'),
      dataIndex: 'group',
      align: 'center',
      render: (text) => (
        <span className='pricing-model-modal-group-chip'>{text}</span>
      ),
    },
    showFixedPriceColumn
      ? {
          title: t('价格'),
          dataIndex: 'fixedValue',
          align: 'center',
          render: (text) => <PricingValueChip value={text} tone='is-fixed' />,
        }
      : {
          title: t('输入'),
          dataIndex: 'inputValue',
          align: 'center',
          render: (text) => <PricingValueChip value={text} tone='is-input' />,
        },
    showFixedPriceColumn
      ? null
      : {
          title: t('输出'),
          dataIndex: 'outputValue',
          align: 'center',
          render: (text) => <PricingValueChip value={text} tone='is-output' />,
        },
  ].filter(Boolean);

  const renderMobilePricingColumns = (item) => {
    if (showFixedPriceColumn) {
      return (
        <div className='pricing-model-mobile-pricing-grid is-single'>
          <div className='pricing-model-mobile-pricing-col'>
            <span className='pricing-model-mobile-pricing-label'>
              {t('价格')}
            </span>
            <PricingValueChip value={item.fixedValue} tone='is-fixed' />
          </div>
        </div>
      );
    }

    return (
      <div className='pricing-model-mobile-pricing-grid'>
        <div className='pricing-model-mobile-pricing-col'>
          <span className='pricing-model-mobile-pricing-label'>
            {t('输入')}
          </span>
          <PricingValueChip value={item.inputValue} tone='is-input' />
        </div>
        <div className='pricing-model-mobile-pricing-col'>
          <span className='pricing-model-mobile-pricing-label'>
            {t('输出')}
          </span>
          <PricingValueChip value={item.outputValue} tone='is-output' />
        </div>
      </div>
    );
  };

  const renderMobileList = () => (
    <div className='pricing-model-mobile-pricing-list'>
      {normalizedTableData.map((item) => (
        <div key={item.key} className='pricing-model-mobile-pricing-item'>
          <div className='pricing-model-mobile-pricing-head'>
            <span className='pricing-model-modal-group-chip'>{item.group}</span>
          </div>
          <div className='pricing-model-mobile-pricing-body'>
            {renderMobilePricingColumns(item)}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className='pricing-model-modal-card !rounded-2xl' style={{ background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
      <div className='pricing-model-modal-card-head'>
        <Avatar size='small' color='orange' className='shadow-sm'>
          <IconCoinMoneyStroked size={16} />
        </Avatar>
        <div>
          <Text className='pricing-model-modal-card-title'>
            {t('价格明细')}
          </Text>
          <div className='pricing-model-modal-card-subtitle'>
            {useFallbackGroups
              ? t('当前账号暂无可用分组，以下展示模型已启用分组价格')
              : t('按当前可用分组展示模型价格')}
          </div>
        </div>
      </div>

      {autoChain.length > 0 && (
        <div className='pricing-model-auto-chain'>
          <span className='pricing-model-auto-chain-label'>
            {t('自动分组链路')}
          </span>
          {autoChain.map((group) => (
            <Tag key={group} color='blue' size='small' shape='circle'>
              {group}
            </Tag>
          ))}
        </div>
      )}

      {isMobile ? (
        renderMobileList()
      ) : (
        <Table
          dataSource={normalizedTableData}
          columns={columns}
          pagination={false}
          size='small'
          bordered={false}
          className='pricing-model-modal-table'
        />
      )}
    </Card>
  );
};

export default ModelPricingTable;
