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
import { Modal, Typography, Button, Tag } from '@douyinfe/semi-ui';
import { IconClose } from '@douyinfe/semi-icons';

import { isPricingModelConfigured } from '../../../../helpers';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';
import ModelHeader from './components/ModelHeader';
import ModelBasicInfo from './components/ModelBasicInfo';
import ModelEndpoints from './components/ModelEndpoints';
import ModelPricingTable from './components/ModelPricingTable';

const { Text } = Typography;

const ModelDetailSideSheet = ({
  visible,
  onClose,
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
  vendorsMap,
  endpointMap,
  autoGroups,
  t,
}) => {
  const isMobile = useIsMobile();
  const isAvailable = modelData ? isPricingModelConfigured(modelData) : false;

  const modelTags = (modelData?.tags || '')
    .split(/[,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Modal
      visible={visible}
      footer={null}
      closable={false}
      width={isMobile ? 'calc(100vw - 16px)' : 720}
      centered
      onCancel={onClose}
      bodyStyle={{
        padding: 0,
        maxHeight: isMobile ? 'calc(100vh - 24px)' : '82vh',
        overflow: 'hidden',
      }}
      className='pricing-model-modal'
      maskClosable
    >
      <div className='pricing-model-modal-shell'>
        <div className='pricing-model-modal-topbar'>
          <ModelHeader
            modelData={modelData}
            vendorsMap={vendorsMap}
            isAvailable={isAvailable}
            t={t}
          />
          <Button
            className='pricing-model-modal-close'
            type='tertiary'
            theme='borderless'
            icon={<IconClose />}
            onClick={onClose}
          />
        </div>

        {!modelData && (
          <div className='flex justify-center items-center py-10'>
            <Text type='secondary'>{t('加载中...')}</Text>
          </div>
        )}

        {modelData && (
          <div className='pricing-model-modal-tags'>
            {modelTags.map((tag) => (
              <Tag
                key={tag}
                color='blue'
                type='light'
                shape='circle'
                size='small'
              >
                {tag}
              </Tag>
            ))}
          </div>
        )}

        {modelData && (
          <div className='pricing-model-modal-body'>
            <ModelBasicInfo
              modelData={modelData}
              vendorsMap={vendorsMap}
              t={t}
            />
            <ModelEndpoints
              modelData={modelData}
              endpointMap={endpointMap}
              t={t}
            />
            <ModelPricingTable
              modelData={modelData}
              selectedGroup={selectedGroup}
              groupRatio={groupRatio}
              detailGroupRatio={detailGroupRatio}
              currency={currency}
              siteDisplayType={siteDisplayType}
              tokenUnit={tokenUnit}
              displayPrice={displayPrice}
              showRatio={showRatio}
              usableGroup={usableGroup}
              autoGroups={autoGroups}
              t={t}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ModelDetailSideSheet;
