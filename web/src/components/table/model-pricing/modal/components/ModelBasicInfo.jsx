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
import { Card, Avatar, Typography, Tag, Space } from '@douyinfe/semi-ui';
import { IconInfoCircle } from '@douyinfe/semi-icons';
import { stringToColor } from '../../../../../helpers';

const { Text } = Typography;

const ModelBasicInfo = ({ modelData, t }) => {
  const getModelDescription = () => {
    if (!modelData) return t('暂无模型描述');
    if (modelData.description) return modelData.description;
    if (modelData.vendor_description) {
      return `${t('供应商信息：')}${modelData.vendor_description}`;
    }
    return t('暂无模型描述');
  };

  const getModelTags = () => {
    const tags = [];
    if (modelData?.tags) {
      modelData.tags
        .split(',')
        .filter((tag) => tag.trim())
        .forEach((tag) => {
          const tagText = tag.trim();
          tags.push({ text: tagText, color: stringToColor(tagText) });
        });
    }
    return tags;
  };

  return (
    <Card className='pricing-model-modal-card !rounded-2xl' style={{ background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
      <div className='pricing-model-modal-card-head'>
        <Avatar size='small' color='blue' className='shadow-sm'>
          <IconInfoCircle size={16} />
        </Avatar>
        <div>
          <Text className='pricing-model-modal-card-title'>
            {t('模型信息')}
          </Text>
          <div className='pricing-model-modal-card-subtitle'>
            {t('模型说明、标签和补充描述')}
          </div>
        </div>
      </div>
      <div className='pricing-model-modal-paragraph'>
        {getModelDescription()}
      </div>
      {getModelTags().length > 0 && (
        <Space wrap>
          {getModelTags().map((tag, index) => (
            <Tag key={index} color={tag.color} shape='circle' size='small'>
              {tag.text}
            </Tag>
          ))}
        </Space>
      )}
    </Card>
  );
};

export default ModelBasicInfo;
