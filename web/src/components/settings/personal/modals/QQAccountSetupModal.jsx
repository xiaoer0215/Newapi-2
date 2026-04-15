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
import { Input, Modal, Typography } from '@douyinfe/semi-ui';
import { IconLock, IconUser } from '@douyinfe/semi-icons';

const QQAccountSetupModal = ({
  t,
  visible,
  setVisible,
  inputs,
  handleInputChange,
  onSubmit,
  loading,
}) => {
  return (
    <Modal
      title={
        <div className='flex items-center'>
          <IconUser className='mr-2 text-blue-500' />
          {t('\u8bbe\u7f6e QQ \u8d26\u53f7')}
        </div>
      }
      visible={visible}
      onCancel={() => setVisible(false)}
      onOk={onSubmit}
      okText={t('\u5b8c\u6210\u8bbe\u7f6e')}
      cancelText={t('\u53d6\u6d88')}
      confirmLoading={loading}
      size='small'
      centered={true}
      className='modern-modal'
    >
      <div className='space-y-4 py-4'>
        <Typography.Text type='secondary'>
          {t(
            '\u9996\u6b21\u901a\u8fc7 QQ \u767b\u5f55\u540e\uff0c\u8bf7\u5148\u8bbe\u7f6e\u8d26\u53f7\u540d\u548c\u5bc6\u7801\uff0c\u65e0\u9700\u90ae\u7bb1\u9a8c\u8bc1\u7801\u5373\u53ef\u76f4\u63a5\u5b8c\u6210\u3002',
          )}
        </Typography.Text>

        <div>
          <Typography.Text strong className='block mb-2'>
            {t('\u8d26\u53f7\u540d')}
          </Typography.Text>
          <Input
            name='account_username'
            placeholder={t('\u8bf7\u8f93\u5165\u8d26\u53f7\u540d')}
            value={inputs.account_username}
            onChange={(value) => handleInputChange('account_username', value)}
            size='large'
            className='!rounded-lg'
            prefix={<IconUser />}
            maxLength={20}
          />
          <Typography.Text type='tertiary' className='mt-2 block text-xs'>
            {t(
              '\u7528\u6237\u540d\u4ec5\u652f\u6301\u82f1\u6587\u3001\u6570\u5b57\u548c\u4e0b\u5212\u7ebf',
            )}
          </Typography.Text>
        </div>

        <div>
          <Typography.Text strong className='block mb-2'>
            {t('\u767b\u5f55\u5bc6\u7801')}
          </Typography.Text>
          <Input
            name='account_password'
            placeholder={t('\u8bf7\u8f93\u5165\u767b\u5f55\u5bc6\u7801')}
            type='password'
            value={inputs.account_password}
            onChange={(value) => handleInputChange('account_password', value)}
            size='large'
            className='!rounded-lg'
            prefix={<IconLock />}
          />
        </div>

        <div>
          <Typography.Text strong className='block mb-2'>
            {t('\u786e\u8ba4\u767b\u5f55\u5bc6\u7801')}
          </Typography.Text>
          <Input
            name='account_password_confirmation'
            placeholder={t(
              '\u8bf7\u518d\u6b21\u8f93\u5165\u767b\u5f55\u5bc6\u7801',
            )}
            type='password'
            value={inputs.account_password_confirmation}
            onChange={(value) =>
              handleInputChange('account_password_confirmation', value)
            }
            size='large'
            className='!rounded-lg'
            prefix={<IconLock />}
          />
        </div>
      </div>
    </Modal>
  );
};

export default QQAccountSetupModal;
