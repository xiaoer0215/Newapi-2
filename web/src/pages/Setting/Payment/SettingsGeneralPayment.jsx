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

import React, { useEffect, useState, useRef } from 'react';
import { Button, Form, Spin } from '@douyinfe/semi-ui';
import {
  API,
  removeTrailingSlash,
  showError,
  showSuccess,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function SettingsGeneralPayment(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    ServerAddress: '',
    AllowedCallbackDomains: '',
  });
  const formApiRef = useRef(null);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      const currentInputs = {
        ServerAddress: props.options.ServerAddress || '',
        AllowedCallbackDomains: props.options.AllowedCallbackDomains || '',
      };
      setInputs(currentInputs);
      formApiRef.current.setValues(currentInputs);
    }
  }, [props.options]);

  const handleFormChange = (values) => {
    setInputs(values);
  };

  const submitServerAddress = async () => {
    setLoading(true);
    try {
      let ServerAddress = removeTrailingSlash(inputs.ServerAddress);
      const res = await API.put('/api/option/', {
        key: 'ServerAddress',
        value: ServerAddress,
      });
      if (res.data.success) {
        showSuccess(t('更新成功'));
        props.refresh && props.refresh();
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(t('更新失败'));
    }
    setLoading(false);
  };

  const submitAllowedCallbackDomains = async () => {
    setLoading(true);
    try {
      const res = await API.put('/api/option/', {
        key: 'AllowedCallbackDomains',
        value: inputs.AllowedCallbackDomains || '',
      });
      if (res.data.success) {
        showSuccess(t('更新成功'));
        props.refresh && props.refresh();
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(t('更新失败'));
    }
    setLoading(false);
  };

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={handleFormChange}
        getFormApi={(api) => (formApiRef.current = api)}
      >
        <Form.Section text={t('通用设置')}>
          <Form.Input
            field='ServerAddress'
            label={t('服务器地址')}
            placeholder={'https://yourdomain.com'}
            style={{ width: '100%' }}
            extraText={t(
              '该服务器地址将影响支付回调地址以及默认首页展示的地址，请确保正确配置',
            )}
          />
          <Button onClick={submitServerAddress}>{t('更新服务器地址')}</Button>
        </Form.Section>

        <Form.Section text={t('动态回调域名白名单')}>
          <Form.TextArea
            field='AllowedCallbackDomains'
            label={t('允许动态回调的域名')}
            placeholder={'u22.top, xxx.ccc.com, *.example.com'}
            style={{ width: '100%' }}
            rows={3}
            extraText={t(
              '逗号分隔多个域名，支持通配符子域名（如 *.example.com）。用户从这些域名发起支付时，回调地址将自动使用用户当前访问的域名，忽略下方支付设置中的回调地址配置。留空则始终使用下方配置的回调地址（或服务器地址）。',
            )}
          />
          <Button onClick={submitAllowedCallbackDomains}>{t('更新白名单')}</Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}
