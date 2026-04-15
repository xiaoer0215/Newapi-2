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
import { Card, Avatar, Typography, Badge } from '@douyinfe/semi-ui';
import { IconLink } from '@douyinfe/semi-icons';

const { Text } = Typography;

const ModelEndpoints = ({ modelData, endpointMap = {}, t }) => {
  const renderAPIEndpoints = () => {
    if (!modelData) return null;

    return (modelData.supported_endpoint_types || []).map((type) => {
      const info = endpointMap[type] || {};
      let path = info.path || '';
      if (path.includes('{model}')) {
        const modelName = modelData.model_name || modelData.modelName || '';
        path = path.replaceAll('{model}', modelName);
      }
      const method = info.method || 'POST';
      return (
        <div key={type} className='pricing-model-endpoint-row'>
          <span className='pricing-model-endpoint-main'>
            <Badge dot type='success' className='mr-2' />
            <span className='pricing-model-endpoint-name'>{type}</span>
            {path ? (
              <span className='pricing-model-endpoint-path'>{path}</span>
            ) : null}
          </span>
          {path ? (
            <span className='pricing-model-endpoint-method'>{method}</span>
          ) : null}
        </div>
      );
    });
  };

  return (
    <Card className='pricing-model-modal-card !rounded-2xl' style={{ background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
      <div className='pricing-model-modal-card-head'>
        <Avatar size='small' color='purple' className='shadow-sm'>
          <IconLink size={16} />
        </Avatar>
        <div>
          <Text className='pricing-model-modal-card-title'>
            {t('API 端点')}
          </Text>
          <div className='pricing-model-modal-card-subtitle'>
            {t('模型支持的请求入口')}
          </div>
        </div>
      </div>
      <div className='pricing-model-endpoint-list'>{renderAPIEndpoints()}</div>
    </Card>
  );
};

export default ModelEndpoints;
