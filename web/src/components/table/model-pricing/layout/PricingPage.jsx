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
import { ImagePreview } from '@douyinfe/semi-ui';
import { LayoutGrid, Rows3, Check, Sparkles } from 'lucide-react';

import ModelDetailSideSheet from '../modal/ModelDetailSideSheet';
import PricingCardView from '../view/card/PricingCardView';
import PricingTable from '../view/table/PricingTable';
import { useModelPricingData } from '../../../../hooks/model-pricing/useModelPricingData';
import { usePricingFilterCounts } from '../../../../hooks/model-pricing/usePricingFilterCounts';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';
import { getLobeHubIcon, isPricingModelConfigured } from '../../../../helpers';

const joinClassNames = (...classes) => classes.filter(Boolean).join(' ');

const normalizeTags = (tags = '') =>
  tags
    .toLowerCase()
    .split(/[,;|]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

const matchesFilters = ({
  model,
  filterGroup,
  filterQuotaType,
  filterEndpointType,
  filterVendor,
  filterTag,
  searchValue,
}) => {
  if (filterGroup !== 'all') {
    if (
      !Array.isArray(model.enable_groups) ||
      !model.enable_groups.includes(filterGroup)
    ) {
      return false;
    }
  }

  if (filterQuotaType !== 'all' && model.quota_type !== filterQuotaType) {
    return false;
  }

  if (filterEndpointType !== 'all') {
    if (
      !Array.isArray(model.supported_endpoint_types) ||
      !model.supported_endpoint_types.includes(filterEndpointType)
    ) {
      return false;
    }
  }

  if (filterVendor !== 'all') {
    if (filterVendor === 'unknown') {
      if (model.vendor_name) {
        return false;
      }
    } else if (model.vendor_name !== filterVendor) {
      return false;
    }
  }

  if (filterTag !== 'all') {
    const tags = normalizeTags(model.tags);
    if (!tags.includes(filterTag.toLowerCase())) {
      return false;
    }
  }

  if (searchValue) {
    const keyword = searchValue.toLowerCase();
    const haystack = [
      model.model_name,
      model.description,
      model.tags,
      model.vendor_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(keyword)) {
      return false;
    }
  }

  return true;
};

const buildVendorCountMap = (models) => {
  const map = new Map();
  models.forEach((model) => {
    const vendorKey = model.vendor_name || 'unknown';
    map.set(vendorKey, (map.get(vendorKey) || 0) + 1);
  });
  return map;
};

const buildEndpointCountMap = (models) => {
  const map = new Map();
  models.forEach((model) => {
    const endpoints = Array.isArray(model.supported_endpoint_types)
      ? [...new Set(model.supported_endpoint_types.filter(Boolean))]
      : [];
    endpoints.forEach((endpoint) => {
      map.set(endpoint, (map.get(endpoint) || 0) + 1);
    });
  });
  return map;
};

const buildGroupCountMap = (models) => {
  const map = new Map();
  models.forEach((model) => {
    const groups = Array.isArray(model.enable_groups)
      ? [...new Set(model.enable_groups.filter(Boolean))]
      : [];
    groups.forEach((group) => {
      map.set(group, (map.get(group) || 0) + 1);
    });
  });
  return map;
};

const FilterChip = ({
  active,
  disabled = false,
  icon,
  label,
  count,
  note,
  onClick,
}) => (
  <button
    type='button'
    className={joinClassNames(
      'pricing-showcase-chip',
      active && 'is-active',
      disabled && 'is-disabled',
    )}
    onClick={onClick}
    disabled={disabled}
  >
    {icon ? <span className='pricing-showcase-chip-icon'>{icon}</span> : null}
    <span className='pricing-showcase-chip-label'>{label}</span>
    {note ? <span className='pricing-showcase-chip-note'>{note}</span> : null}
    {typeof count === 'number' ? (
      <span className='pricing-showcase-chip-count'>{count}</span>
    ) : null}
    {active ? (
      <span className='pricing-showcase-chip-check'>
        <Check size={12} />
      </span>
    ) : null}
  </button>
);

const PricingPage = () => {
  const pricingData = useModelPricingData();
  const isMobile = useIsMobile();
  const showRatio = false;
  const [viewMode, setViewMode] = React.useState('card');
  const [showAvailableOnly, setShowAvailableOnly] = React.useState(true);

  const t = pricingData.t;

  React.useEffect(() => {
    pricingData.setCurrentPage(1);
  }, [showAvailableOnly, pricingData.setCurrentPage]);

  const baseModels = React.useMemo(() => {
    if (!showAvailableOnly) {
      return pricingData.models;
    }
    return pricingData.models.filter((model) =>
      isPricingModelConfigured(model),
    );
  }, [pricingData.models, showAvailableOnly]);

  const filteredModels = React.useMemo(
    () =>
      baseModels.filter((model) =>
        matchesFilters({
          model,
          filterGroup: pricingData.filterGroup,
          filterQuotaType: pricingData.filterQuotaType,
          filterEndpointType: pricingData.filterEndpointType,
          filterVendor: pricingData.filterVendor,
          filterTag: pricingData.filterTag,
          searchValue: pricingData.searchValue,
        }),
      ),
    [
      baseModels,
      pricingData.filterEndpointType,
      pricingData.filterGroup,
      pricingData.filterQuotaType,
      pricingData.filterTag,
      pricingData.filterVendor,
      pricingData.searchValue,
    ],
  );

  const { vendorModels, endpointTypeModels, groupCountModels } =
    usePricingFilterCounts({
      models: baseModels,
      filterGroup: pricingData.filterGroup,
      filterQuotaType: pricingData.filterQuotaType,
      filterEndpointType: pricingData.filterEndpointType,
      filterVendor: pricingData.filterVendor,
      filterTag: pricingData.filterTag,
      searchValue: pricingData.searchValue,
    });

  const vendorCountMap = React.useMemo(
    () => buildVendorCountMap(vendorModels),
    [vendorModels],
  );

  const endpointCountMap = React.useMemo(
    () => buildEndpointCountMap(endpointTypeModels),
    [endpointTypeModels],
  );

  const groupCountMap = React.useMemo(
    () => buildGroupCountMap(groupCountModels),
    [groupCountModels],
  );

  const vendorIconMap = React.useMemo(() => {
    const iconMap = new Map();
    baseModels.forEach((model) => {
      if (
        model.vendor_name &&
        model.vendor_icon &&
        !iconMap.has(model.vendor_name)
      ) {
        iconMap.set(model.vendor_name, model.vendor_icon);
      }
    });
    return iconMap;
  }, [baseModels]);

  const vendorOptions = React.useMemo(() => {
    const vendorNames = Array.from(
      new Set(baseModels.map((model) => model.vendor_name).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right));

    const options = [
      {
        value: 'all',
        label: t('全部供应商'),
        count: baseModels.length,
      },
      ...vendorNames.map((vendorName) => ({
        value: vendorName,
        label: vendorName,
        icon: vendorIconMap.get(vendorName)
          ? getLobeHubIcon(vendorIconMap.get(vendorName), 15)
          : null,
        count: vendorCountMap.get(vendorName) || 0,
      })),
    ];

    if (baseModels.some((model) => !model.vendor_name)) {
      options.push({
        value: 'unknown',
        label: t('未知供应商'),
        count: vendorCountMap.get('unknown') || 0,
      });
    }

    return options;
  }, [baseModels, t, vendorCountMap, vendorIconMap]);

  const endpointOptions = React.useMemo(() => {
    const endpointTypes = Array.from(
      new Set(
        baseModels.flatMap((model) =>
          Array.isArray(model.supported_endpoint_types)
            ? model.supported_endpoint_types.filter(Boolean)
            : [],
        ),
      ),
    ).sort((left, right) => left.localeCompare(right));

    return [
      {
        value: 'all',
        label: t('全部端点'),
        count: baseModels.length,
      },
      ...endpointTypes.map((endpointType) => ({
        value: endpointType,
        label: endpointType,
        count: endpointCountMap.get(endpointType) || 0,
      })),
    ];
  }, [baseModels, endpointCountMap, t]);

  const groupOptions = React.useMemo(() => {
    const groupsFromModels = baseModels.flatMap((model) =>
      Array.isArray(model.enable_groups)
        ? model.enable_groups.filter(Boolean)
        : [],
    );
    const allGroupKeys = [
      ...new Set([
        ...Object.keys(pricingData.usableGroup || {}).filter(Boolean),
        ...groupsFromModels,
      ]),
    ];

    return [
      {
        value: 'all',
        label: t('全部分组'),
        count: baseModels.length,
        note: 'x1',
      },
      ...allGroupKeys.map((groupKey) => ({
        value: groupKey,
        label: groupKey,
        count: groupCountMap.get(groupKey) || 0,
        note: `x${pricingData.groupRatio[groupKey] ?? 1}`,
      })),
    ];
  }, [
    baseModels,
    groupCountMap,
    pricingData.groupRatio,
    pricingData.usableGroup,
    t,
  ]);

  const hasActiveFilters =
    pricingData.searchValue ||
    pricingData.filterVendor !== 'all' ||
    pricingData.filterEndpointType !== 'all' ||
    pricingData.filterGroup !== 'all' ||
    !showAvailableOnly;

  const handleGroupSelect = React.useCallback(
    (group) => {
      pricingData.setSelectedGroup(group);
      pricingData.setFilterGroup(group);
    },
    [pricingData.setFilterGroup, pricingData.setSelectedGroup],
  );

  return (
    <div className='pricing-showcase-page'>
      <div className='pricing-showcase-shell'>
        {/* 渐变头部 */}
        <section className='pricing-showcase-hero'>
          <div className='pricing-showcase-hero-left'>
            <div className='pricing-showcase-hero-icon'>
              <Sparkles size={26} color='#fff' />
            </div>
            <div>
              <h1 className='pricing-showcase-hero-title'>{t('模型广场')}</h1>
              <p className='pricing-showcase-hero-subtitle'>{t('探索所有可用模型及其定价')}</p>
            </div>
          </div>
          <div className='pricing-showcase-hero-right'>
            <div className='pricing-showcase-view-toggle pricing-showcase-view-toggle-hero'>
              <button
                type='button'
                className={joinClassNames(
                  'pricing-showcase-view-button',
                  viewMode === 'card' && 'is-active',
                )}
                onClick={() => setViewMode('card')}
                aria-label={t('卡片视图')}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type='button'
                className={joinClassNames(
                  'pricing-showcase-view-button',
                  viewMode === 'table' && 'is-active',
                )}
                onClick={() => setViewMode('table')}
                aria-label={t('列表视图')}
              >
                <Rows3 size={16} />
              </button>
            </div>
          </div>
        </section>

        <section className='pricing-showcase-panel'>
          <div className='pricing-showcase-search-row'>
            <label className='pricing-showcase-search'>
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='11' cy='11' r='8'/><path d='m21 21-4.35-4.35'/></svg>
              <input
                value={pricingData.searchValue}
                onChange={(event) =>
                  pricingData.handleChange(event.target.value)
                }
                onCompositionStart={pricingData.handleCompositionStart}
                onCompositionEnd={pricingData.handleCompositionEnd}
                placeholder={t('搜索模型名称、说明、标签')}
              />
            </label>

            <div className='pricing-showcase-toolbar'>
              <div className='pricing-showcase-unit-toggle'>
                <span className='pricing-showcase-toolbar-label'>
                  {t('Token 单位')}
                </span>
                <div className='pricing-showcase-segmented'>
                  {['M', 'K'].map((unit) => (
                    <button
                      key={unit}
                      type='button'
                      className={joinClassNames(
                        'pricing-showcase-segment',
                        pricingData.tokenUnit === unit && 'is-active',
                      )}
                      onClick={() => pricingData.setTokenUnit(unit)}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type='button'
                className={joinClassNames(
                  'pricing-showcase-availability',
                  showAvailableOnly && 'is-active',
                )}
                onClick={() => setShowAvailableOnly((value) => !value)}
              >
                <span className='pricing-showcase-availability-indicator'>
                  <Check size={12} />
                </span>
                <span>{t('只显示可用')}</span>
              </button>
            </div>
          </div>

          <div className='pricing-showcase-filter-row'>
            <span className='pricing-showcase-filter-label'>{t('供应商')}</span>
            <div className='pricing-showcase-chip-wrap'>
              {vendorOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  active={pricingData.filterVendor === option.value}
                  disabled={
                    option.count === 0 &&
                    pricingData.filterVendor !== option.value
                  }
                  icon={option.icon}
                  label={option.label}
                  count={option.count}
                  onClick={() => pricingData.setFilterVendor(option.value)}
                />
              ))}
            </div>
          </div>

          <div className='pricing-showcase-filter-row'>
            <span className='pricing-showcase-filter-label'>
              {t('端点类型')}
            </span>
            <div className='pricing-showcase-chip-wrap'>
              {endpointOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  active={pricingData.filterEndpointType === option.value}
                  disabled={
                    option.count === 0 &&
                    pricingData.filterEndpointType !== option.value
                  }
                  label={option.label}
                  count={option.count}
                  onClick={() =>
                    pricingData.setFilterEndpointType(option.value)
                  }
                />
              ))}
            </div>
          </div>

          <div className='pricing-showcase-filter-row'>
            <span className='pricing-showcase-filter-label'>
              {t('可用分组')}
            </span>
            <div className='pricing-showcase-chip-wrap'>
              {groupOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  active={pricingData.filterGroup === option.value}
                  disabled={
                    option.count === 0 &&
                    pricingData.filterGroup !== option.value
                  }
                  label={option.label}
                  count={option.count}
                  note={option.note}
                  onClick={() => handleGroupSelect(option.value)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className='pricing-showcase-summary'>
          <div className='pricing-showcase-summary-main'>
            <span className='pricing-showcase-summary-count'>
              {t('共 {{count}} 个模型', { count: filteredModels.length })}
            </span>
            {hasActiveFilters ? (
              <span className='pricing-showcase-summary-note'>
                {t('已应用当前筛选条件')}
              </span>
            ) : null}
          </div>
        </section>

        <section
          className={joinClassNames(
            'pricing-showcase-results',
            viewMode === 'table' && 'is-table',
          )}
        >
          {viewMode === 'card' ? (
            <PricingCardView
              filteredModels={filteredModels}
              loading={pricingData.loading}
              pageSize={pricingData.pageSize}
              setPageSize={pricingData.setPageSize}
              currentPage={pricingData.currentPage}
              setCurrentPage={pricingData.setCurrentPage}
              selectedGroup={pricingData.selectedGroup}
              groupRatio={pricingData.groupRatio}
              copyText={pricingData.copyText}
              setModalImageUrl={pricingData.setModalImageUrl}
              setIsModalOpenurl={pricingData.setIsModalOpenurl}
              currency={pricingData.currency}
              siteDisplayType={pricingData.siteDisplayType}
              tokenUnit={pricingData.tokenUnit}
              displayPrice={pricingData.displayPrice}
              showRatio={showRatio}
              t={t}
              openModelDetail={pricingData.openModelDetail}
            />
          ) : (
            <PricingTable
              filteredModels={filteredModels}
              loading={pricingData.loading}
              pageSize={pricingData.pageSize}
              setPageSize={pricingData.setPageSize}
              selectedGroup={pricingData.selectedGroup}
              groupRatio={pricingData.groupRatio}
              copyText={pricingData.copyText}
              setModalImageUrl={pricingData.setModalImageUrl}
              setIsModalOpenurl={pricingData.setIsModalOpenurl}
              currency={pricingData.currency}
              siteDisplayType={pricingData.siteDisplayType}
              tokenUnit={pricingData.tokenUnit}
              displayPrice={pricingData.displayPrice}
              searchValue={pricingData.searchValue}
              showRatio={showRatio}
              compactMode={isMobile}
              openModelDetail={pricingData.openModelDetail}
              t={t}
            />
          )}
        </section>
      </div>

      <ImagePreview
        src={pricingData.modalImageUrl}
        visible={pricingData.isModalOpenurl}
        onVisibleChange={(visible) => pricingData.setIsModalOpenurl(visible)}
      />

      <ModelDetailSideSheet
        visible={pricingData.showModelDetail}
        onClose={pricingData.closeModelDetail}
        modelData={pricingData.selectedModel}
        selectedGroup={pricingData.selectedGroup}
        groupRatio={pricingData.groupRatio}
        detailGroupRatio={pricingData.allGroupRatio}
        usableGroup={pricingData.usableGroup}
        currency={pricingData.currency}
        siteDisplayType={pricingData.siteDisplayType}
        tokenUnit={pricingData.tokenUnit}
        displayPrice={pricingData.displayPrice}
        showRatio={showRatio}
        vendorsMap={pricingData.vendorsMap}
        endpointMap={pricingData.endpointMap}
        autoGroups={pricingData.autoGroups}
        t={t}
      />
    </div>
  );
};

export default PricingPage;
