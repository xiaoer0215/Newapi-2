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
import {
  Card,
  Checkbox,
  Empty,
  Pagination,
  Button,
  Tooltip,
  Dropdown,
} from '@douyinfe/semi-ui';
import { Copy, ArrowRight } from 'lucide-react';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import {
  calculateModelPrice,
  getModelPriceItems,
  getLobeHubIcon,
  getLogo,
  isPricingModelConfigured,
} from '../../../../../helpers';
import PricingCardSkeleton from './PricingCardSkeleton';
import { useMinimumLoadingTime } from '../../../../../hooks/common/useMinimumLoadingTime';
import { useIsMobile } from '../../../../../hooks/common/useIsMobile';

const GROUP_GAP = 8;

const getGroupToneStyle = (isActive = false) => ({
  '--group-bg': isActive ? 'rgba(37, 99, 235, 0.08)' : '#f8fafc',
  '--group-border': isActive ? 'rgba(37, 99, 235, 0.28)' : '#dbe4f0',
  '--group-text': isActive ? '#1d4ed8' : '#475569',
});

const PricingGroupOverflow = ({ groups, currentGroup, t }) => {
  const containerRef = React.useRef(null);
  const groupMeasureRefs = React.useRef([]);
  const moreMeasureRefs = React.useRef({});
  const [visibleCount, setVisibleCount] = React.useState(groups.length);

  const recalcVisibleCount = React.useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth || 0;
    if (!containerWidth || groups.length === 0) {
      setVisibleCount(groups.length);
      return;
    }

    const groupWidths = groups.map(
      (_, index) => groupMeasureRefs.current[index]?.offsetWidth || 0,
    );
    if (groupWidths.some((width) => width <= 0)) {
      setVisibleCount(groups.length);
      return;
    }

    let usedWidth = 0;
    let nextVisibleCount = groups.length;

    for (let index = 0; index < groups.length; index++) {
      const nextWidth =
        usedWidth + (index > 0 ? GROUP_GAP : 0) + groupWidths[index];
      const hiddenCount = groups.length - index - 1;
      const moreWidth =
        hiddenCount > 0
          ? GROUP_GAP + (moreMeasureRefs.current[hiddenCount]?.offsetWidth || 0)
          : 0;

      if (nextWidth + moreWidth <= containerWidth) {
        usedWidth = nextWidth;
        nextVisibleCount = index + 1;
        continue;
      }

      nextVisibleCount = Math.max(1, index);
      break;
    }

    setVisibleCount(nextVisibleCount);
  }, [groups]);

  React.useLayoutEffect(() => {
    recalcVisibleCount();
  }, [recalcVisibleCount]);

  React.useLayoutEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      recalcVisibleCount();
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [recalcVisibleCount]);

  const visibleGroups = groups.slice(0, visibleCount);
  const hiddenGroups = groups.slice(visibleCount);

  return (
    <>
      <div className='pricing-market-card-groups' ref={containerRef}>
        {visibleGroups.map((group) => (
          <Tooltip key={group} content={group} position='top' showArrow>
            <span
              className={`pricing-market-card-group ${
                group === currentGroup ? 'pricing-market-card-group-active' : ''
              }`}
              style={getGroupToneStyle(group === currentGroup)}
            >
              <span className='pricing-market-card-group-text'>{group}</span>
            </span>
          </Tooltip>
        ))}
        {hiddenGroups.length > 0 ? (
          <Dropdown
            trigger='click'
            position='bottomRight'
            render={
              <Dropdown.Menu className='pricing-market-card-group-menu'>
                {hiddenGroups.map((group) => (
                  <Dropdown.Item key={group}>
                    <Tooltip content={group} position='left' showArrow>
                      <span className='pricing-market-card-group-menu-item'>
                        {group}
                      </span>
                    </Tooltip>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            }
          >
            <button
              type='button'
              className='pricing-market-card-group pricing-market-card-group-more'
            >
              <span className='pricing-market-card-group-text'>
                {t('更多')} +{hiddenGroups.length}
              </span>
            </button>
          </Dropdown>
        ) : null}
      </div>

      <div
        className='pricing-market-card-group-measure-layer'
        aria-hidden='true'
      >
        {groups.map((group, index) => (
          <span
            key={`measure-${group}-${index}`}
            ref={(element) => {
              groupMeasureRefs.current[index] = element;
            }}
            className={`pricing-market-card-group ${
              group === currentGroup ? 'pricing-market-card-group-active' : ''
            }`}
            style={getGroupToneStyle(group === currentGroup)}
          >
            <span className='pricing-market-card-group-text'>{group}</span>
          </span>
        ))}
        {Array.from({ length: Math.max(groups.length - 1, 0) }, (_, index) => {
          const hiddenCount = index + 1;
          return (
            <span
              key={`measure-more-${hiddenCount}`}
              ref={(element) => {
                moreMeasureRefs.current[hiddenCount] = element;
              }}
              className='pricing-market-card-group pricing-market-card-group-more'
            >
              <span className='pricing-market-card-group-text'>
                {t('更多')} +{hiddenCount}
              </span>
            </span>
          );
        })}
      </div>
    </>
  );
};

const getUnavailablePriceItems = (model, siteDisplayType, t) => {
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

  if (model?.quota_type === 1) {
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

const PricingCardView = ({
  filteredModels,
  loading,
  rowSelection,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  selectedGroup,
  groupRatio,
  copyText,
  setModalImageUrl,
  setIsModalOpenurl,
  currency,
  siteDisplayType,
  tokenUnit,
  displayPrice,
  t,
  selectedRowKeys = [],
  setSelectedRowKeys,
  openModelDetail,
}) => {
  const showSkeleton = useMinimumLoadingTime(loading);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedModels = filteredModels.slice(
    startIndex,
    startIndex + pageSize,
  );
  const getModelKey = (model) => model.key ?? model.model_name ?? model.id;
  const isMobile = useIsMobile();

  const handleCheckboxChange = (model, checked) => {
    if (!setSelectedRowKeys) return;
    const modelKey = getModelKey(model);
    const newKeys = checked
      ? Array.from(new Set([...selectedRowKeys, modelKey]))
      : selectedRowKeys.filter((key) => key !== modelKey);
    setSelectedRowKeys(newKeys);
    rowSelection?.onChange?.(newKeys, null);
  };

  const getModelIcon = (model) => {
    if (!model || !model.model_name) {
      return (
        <div className='pricing-market-card-logo'>
          <div className='pricing-market-card-logo-icon'>
            <img src={getLogo()} alt='logo' style={{ width: 26, height: 26, objectFit: 'contain' }} />
          </div>
        </div>
      );
    }

    if (model.icon) {
      return (
        <div className='pricing-market-card-logo'>
          <div className='pricing-market-card-logo-icon'>
            {getLobeHubIcon(model.icon, 26)}
          </div>
        </div>
      );
    }

    if (model.vendor_icon) {
      return (
        <div className='pricing-market-card-logo'>
          <div className='pricing-market-card-logo-icon'>
            {getLobeHubIcon(model.vendor_icon, 26)}
          </div>
        </div>
      );
    }

    return (
      <div className='pricing-market-card-logo'>
        <div className='pricing-market-card-logo-icon'>
          <img src={getLogo()} alt='logo' style={{ width: 26, height: 26, objectFit: 'contain' }} />
        </div>
      </div>
    );
  };

  const getBillingText = (record) => {
    if (record.quota_type === 1) return t('按次计费');
    if (record.quota_type === 0) return t('按量计费');
    return t('未设置');
  };

  const getBillingClassName = (record) => {
    if (record.quota_type === 1) return 'is-orange';
    if (record.quota_type === 0) return 'is-green';
    return 'is-neutral';
  };

  const getPriceValueClassName = (item) => {
    if ((item.key || '').startsWith('unavailable')) return 'is-muted';
    if (item.key === 'completion' || item.key === 'fixed') return 'is-warm';
    return 'is-cool';
  };

  const handleOpenDetail = (event, model) => {
    event?.stopPropagation?.();
    openModelDetail?.(model);
  };

  if (showSkeleton) {
    return (
      <PricingCardSkeleton rowSelection={!!rowSelection} showRatio={false} />
    );
  }

  if (!filteredModels || filteredModels.length === 0) {
    return (
      <div className='flex justify-center items-center py-20'>
        <Empty
          image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
          darkModeImage={
            <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
          }
          description={t('搜索无结果')}
        />
      </div>
    );
  }

  return (
    <div className='pricing-market-card-grid'>
      <div className='pricing-market-card-list'>
        {paginatedModels.map((model, index) => {
          const modelKey = getModelKey(model);
          const isSelected = selectedRowKeys.includes(modelKey);
          const priceData = calculateModelPrice({
            record: model,
            selectedGroup,
            groupRatio,
            tokenUnit,
            displayPrice,
            currency,
            quotaDisplayType: siteDisplayType,
          });
          const isAvailable = isPricingModelConfigured(model);
          const priceItems = getModelPriceItems(
            priceData,
            t,
            siteDisplayType,
          ).slice(0, 2);
          const displayPriceItems =
            isAvailable && priceItems.length > 0
              ? priceItems
              : getUnavailablePriceItems(model, siteDisplayType, t);
          const vendorName = model.vendor_name || t('未知供应商');
          const allGroups = Array.isArray(model.enable_groups)
            ? model.enable_groups.filter(Boolean)
            : [];
          const currentGroup =
            priceData?.usedGroup || allGroups[0] || t('默认分组');
          const orderedGroups = [
            currentGroup,
            ...allGroups.filter((group) => group !== currentGroup),
          ].filter(Boolean);
          const uniqueGroups = Array.from(new Set(orderedGroups));
          const visibleGroupList =
            selectedGroup && selectedGroup !== 'all'
              ? uniqueGroups.filter((group) => group === selectedGroup)
              : uniqueGroups;

          return (
            <Card
              key={modelKey || index}
              className={`pricing-market-card ${isSelected ? 'pricing-market-card-selected' : ''}`}
              style={{ background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}
              bodyStyle={{ height: '100%', padding: 0 }}
            >
              <div className='pricing-market-card-inner'>
                <div className='pricing-market-card-head'>
                  <div className='pricing-market-card-head-main'>
                    {getModelIcon(model)}
                    <div className='pricing-market-card-title-wrap'>
                      <div className='pricing-market-card-title-row'>
                        <Tooltip
                          content={model.model_name}
                          position='top'
                          showArrow
                        >
                          <h3 className='pricing-market-card-title'>
                            {model.model_name}
                          </h3>
                        </Tooltip>
                      </div>
                      <div className='pricing-market-card-vendor'>
                        {vendorName}
                      </div>
                    </div>
                  </div>

                  <div className='pricing-market-card-actions'>
                    <span
                      className={`pricing-market-card-status ${
                        isAvailable ? 'is-available' : 'is-unavailable'
                      }`}
                    >
                      {isAvailable ? t('可用') : t('不可用')}
                    </span>
                    <Tooltip content={t('点击复制ID')} position='top' showArrow>
                      <button
                        type='button'
                        className='pricing-market-copy-bubble'
                        aria-label={t('点击复制ID')}
                        onClick={(event) => {
                          event.stopPropagation();
                          copyText(model.model_name);
                        }}
                      >
                        <Copy size={12} />
                      </button>
                    </Tooltip>
                    {rowSelection && (
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleCheckboxChange(model, e.target.checked);
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className='pricing-market-card-divider' />

                <div className='pricing-market-card-section pricing-market-card-section-inline'>
                  <div className='pricing-market-card-section-label'>
                    {t('计费方式')}
                  </div>
                  <span
                    className={`pricing-market-card-billing ${getBillingClassName(model)}`}
                  >
                    {getBillingText(model)}
                  </span>
                </div>

                <div className='pricing-market-card-divider' />

                <div className='pricing-market-card-price-block'>
                  {displayPriceItems.map((item) => (
                    <div
                      key={item.key}
                      className='pricing-market-card-price-row'
                    >
                      <span className='pricing-market-card-price-label'>
                        {item.label}
                      </span>
                      <span
                        className={`pricing-market-card-price-value ${getPriceValueClassName(item)}`}
                        title={`${item.value}${item.suffix || ''}`}
                      >
                        {item.value}
                        {item.suffix}
                      </span>
                    </div>
                  ))}
                </div>

                <div className='pricing-market-card-divider' />

                <div className='pricing-market-card-footer'>
                  <span className='pricing-market-card-section-label pricing-market-card-group-label'>
                    {t('当前用户分组')}
                  </span>
                  <div className='pricing-market-card-group-block'>
                    <PricingGroupOverflow
                      groups={visibleGroupList}
                      currentGroup={currentGroup}
                      t={t}
                    />
                  </div>
                </div>

                <div className='pricing-market-card-cta'>
                  <Button
                    theme='solid'
                    type='primary'
                    block
                    icon={<ArrowRight size={14} />}
                    iconPosition='right'
                    onClick={(event) => handleOpenDetail(event, model)}
                  >
                    {t('查看详情')}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredModels.length > 0 && (
        <div className='flex justify-center mt-6 py-4 border-t pricing-pagination-divider'>
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            total={filteredModels.length}
            showSizeChanger={true}
            pageSizeOptions={[10, 20, 50, 100]}
            size={isMobile ? 'small' : 'default'}
            showQuickJumper={isMobile}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PricingCardView;
