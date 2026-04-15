/*
Copyright (C) 2025 QuantumNous
*/

import React, { useMemo } from 'react';
import { Input, Tag, Button, Card } from '@douyinfe/semi-ui';
import { IconSearch, IconCopy } from '@douyinfe/semi-icons';
import { usePricingFilterCounts } from '../../../../hooks/model-pricing/usePricingFilterCounts';

const PricingPageNew = (props) => {
  const {
    models = [],
    filterGroup = '',
    filterQuotaType = '',
    filterVendor = '',
    searchValue = '',
    handleChange = () => {},
    setFilterGroup = () => {},
    setFilterQuotaType = () => {},
    setFilterVendor = () => {},
    handleGroupClick = () => {},
    t = (key) => key,
    vendorsMap = {},
    openModelDetail = () => {},
    currency = 'CNY',
    tokenUnit = 'K',
  } = props;

  const {
    quotaTypeModels = {},
    vendorModels = {},
    groupCountModels = {},
  } = usePricingFilterCounts({
    models,
    filterGroup,
    filterQuotaType,
    filterEndpointType: props.filterEndpointType || '',
    filterVendor,
    filterTag: props.filterTag || '',
    searchValue,
  }) || {};

  // 筛选后的模型
  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      if (
        filterGroup &&
        filterGroup !== 'all' &&
        !model.enable_groups?.includes(filterGroup)
      )
        return false;
      if (
        filterQuotaType &&
        filterQuotaType !== 'all' &&
        model.quota_type !== filterQuotaType
      )
        return false;
      if (
        filterVendor &&
        filterVendor !== 'all' &&
        model.vendor_name !== filterVendor
      )
        return false;
      if (
        searchValue &&
        !model.model_name?.toLowerCase().includes(searchValue.toLowerCase())
      )
        return false;
      return true;
    });
  }, [models, filterGroup, filterQuotaType, filterVendor, searchValue]);

  return (
    <div style={{ padding: '24px', background: '#f7f8fa', minHeight: '100vh' }}>
      {/* 搜索框 */}
      <div
        style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <Input
          prefix={<IconSearch />}
          placeholder={t('搜索模型名称或描述')}
          value={searchValue}
          onChange={(value) => handleChange(value)}
          size='large'
        />
      </div>

      {/* 筛选区域 */}
      <div
        style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        {/* 供应商 */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🌐</span>
            <span>{t('供应商')}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <Tag
              size='large'
              type={!filterVendor ? 'solid' : 'light'}
              onClick={() => setFilterVendor('')}
              style={{ cursor: 'pointer', borderRadius: '6px' }}
            >
              {t('全部')}
            </Tag>
            {Object.entries(vendorModels || {}).map(([vendor, count]) => (
              <Tag
                key={vendor}
                size='large'
                type={filterVendor === vendor ? 'solid' : 'light'}
                onClick={() => setFilterVendor(vendor)}
                style={{ cursor: 'pointer', borderRadius: '6px' }}
              >
                {vendor}
              </Tag>
            ))}
          </div>
        </div>

        {/* 模态类型 */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>📊</span>
            <span>{t('模态类型')}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <Tag
              size='large'
              type={!filterQuotaType ? 'solid' : 'light'}
              onClick={() => setFilterQuotaType('')}
              style={{ cursor: 'pointer', borderRadius: '6px' }}
            >
              {t('全部')}
            </Tag>
            {Object.entries(quotaTypeModels || {}).map(([type, count]) => (
              <Tag
                key={type}
                size='large'
                type={filterQuotaType === type ? 'solid' : 'light'}
                onClick={() => setFilterQuotaType(type)}
                style={{ cursor: 'pointer', borderRadius: '6px' }}
              >
                {type}
              </Tag>
            ))}
          </div>
        </div>

        {/* 分组 */}
        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👥</span>
              <span>{t('分组')}</span>
            </div>
            <Button size='small' theme='borderless'>
              {t('只显示可用')}
            </Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(groupCountModels || {}).map(([group, count]) => (
              <Tag
                key={group}
                size='large'
                type={filterGroup === group ? 'solid' : 'light'}
                onClick={() => handleGroupClick(group)}
                style={{
                  cursor: 'pointer',
                  borderRadius: '20px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                }}
              >
                {filterGroup === group && '✓ '}
                {String(group)} ×{count}
              </Tag>
            ))}
          </div>
        </div>
      </div>

      {/* 模型数量 */}
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
        {t('共')} {filteredModels.length} {t('个模型')}
      </div>

      {/* 模型卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        {filteredModels.map((model) => {
          const modelName = model.model_name || '';
          const vendorName = model.vendor_name || 'Unknown';
          const quotaType =
            model.quota_type === 0 ? t('按次计费') : t('按量付费');
          const firstGroup = model.enable_groups?.[0] || t('默认');

          return (
            <Card className='!rounded-2xl' style={{ background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}
              key={modelName}
              style={{ cursor: 'pointer' }}
              bodyStyle={{ padding: '20px' }}
              onClick={() => openModelDetail(model)}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                  }}
                >
                  {vendorName.charAt(0) || '🤖'}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      marginBottom: '4px',
                    }}
                  >
                    {modelName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {vendorName}
                  </div>
                </div>
                <IconCopy
                  style={{ color: '#999', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(modelName);
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '4px',
                  }}
                >
                  {t('计费方式')}
                </div>
                <Tag color='green' size='small'>
                  {quotaType}
                </Tag>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {t('输入价格')}
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#52c41a',
                    }}
                  >
                    $0.00/ 1{tokenUnit}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {t('输出价格')}
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#faad14',
                    }}
                  >
                    $0.00/ 1{tokenUnit}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '4px',
                  }}
                >
                  {t('当前用户组')}
                </div>
                <Tag color='blue' size='small'>
                  {firstGroup}
                </Tag>
              </div>

              <Button block theme='solid' type='primary'>
                {t('查看详情')} →
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PricingPageNew;
