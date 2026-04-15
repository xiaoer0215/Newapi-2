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
import { Typography, Toast, Avatar, Button, Tag } from '@douyinfe/semi-ui';
import { Copy } from 'lucide-react';
import { copy, getLobeHubIcon } from '../../../../../helpers';

const { Text } = Typography;

const CARD_STYLES = {
  container:
    'w-12 h-12 rounded-2xl flex items-center justify-center relative shadow-md',
  icon: 'w-8 h-8 flex items-center justify-center',
};

const ModelHeader = ({ modelData, isAvailable, t }) => {
  const getModelIcon = () => {
    if (modelData?.icon) {
      return (
        <div className={CARD_STYLES.container}>
          <div className={CARD_STYLES.icon}>
            {getLobeHubIcon(modelData.icon, 32)}
          </div>
        </div>
      );
    }

    if (modelData?.vendor_icon) {
      return (
        <div className={CARD_STYLES.container}>
          <div className={CARD_STYLES.icon}>
            {getLobeHubIcon(modelData.vendor_icon, 32)}
          </div>
        </div>
      );
    }

    const avatarText = modelData?.model_name?.slice(0, 2).toUpperCase() || 'AI';
    return (
      <div className={CARD_STYLES.container}>
        <Avatar
          size='large'
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 'bold',
          }}
        >
          {avatarText}
        </Avatar>
      </div>
    );
  };

  const handleCopy = async () => {
    if (await copy(modelData?.model_name || '')) {
      Toast.success({ content: t('已复制模型名称') });
    }
  };

  return (
    <div className='pricing-model-header'>
      {getModelIcon()}
      <div className='pricing-model-header-main'>
        <div className='pricing-model-header-row'>
          <span className='pricing-model-header-title'>
            {modelData?.model_name || t('未知模型')}
          </span>
          <div className='pricing-model-header-actions'>
            <Tag
              color={isAvailable ? 'green' : 'red'}
              type='light'
              size='small'
              shape='square'
              className='pricing-model-header-status'
            >
              {isAvailable ? t('可用') : t('不可用')}
            </Tag>
            <Button
              size='small'
              theme='outline'
              type='tertiary'
              icon={<Copy size={14} />}
              className='pricing-model-copy-btn'
              onClick={handleCopy}
            >
              {t('复制')}
            </Button>
          </div>
        </div>
        <Text type='tertiary' className='pricing-model-header-subtitle'>
          {modelData?.vendor_name || t('未知供应商')}
        </Text>
      </div>
    </div>
  );
};

export default ModelHeader;
