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

import React, { useEffect, useRef, useState } from 'react';
import { Button, Col, Form, Row, Spin, Typography } from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function SettingsIPRestriction(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    'ip_restriction_setting.configured': false,
    'ip_restriction_setting.single_ip_limit_enabled': false,
    'ip_restriction_setting.block_vpn': false,
    'ip_restriction_setting.block_datacenter': false,
    'ip_restriction_setting.block_residential': false,
    'ip_restriction_setting.ip_check_provider': '',
    'ip_restriction_setting.ipinfo_token': '',
    'ip_restriction_setting.ip_api_key': '',
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((state) => ({ ...state, [fieldName]: value }));
    };
  }

  function onSubmit() {
    const nextInputs = {
      ...inputs,
      'ip_restriction_setting.configured': true,
    };
    const updateArray = compareObjects(nextInputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你好像并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      const value =
        typeof nextInputs[item.key] === 'boolean'
          ? String(nextInputs[item.key])
          : String(nextInputs[item.key]);
      return API.put('/api/option/', { key: item.key, value });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined)) {
            return showError(t('部分保存失败，请重试'));
          }
        }
        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const currentInputs = {};
    for (let key in props.options) {
      if (Object.keys(inputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    refForm.current.setValues(currentInputs);
  }, [props.options]);

  const provider = inputs['ip_restriction_setting.ip_check_provider'];
  const ipBlockEnabled =
    inputs['ip_restriction_setting.block_vpn'] ||
    inputs['ip_restriction_setting.block_datacenter'] ||
    inputs['ip_restriction_setting.block_residential'];

  return (
    <Spin spinning={loading}>
      <Form
        values={inputs}
        getFormApi={(formAPI) => (refForm.current = formAPI)}
        style={{ marginBottom: 15 }}
      >
        <Form.Section text={t('IP 限制设置')}>
          <Typography.Text
            type='tertiary'
            style={{ marginBottom: 16, display: 'block' }}
          >
            {t(
              '这里配置可复用的 IP 风控规则，签到等功能只决定是否接入这套限制',
            )}
          </Typography.Text>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'ip_restriction_setting.single_ip_limit_enabled'}
                label={t('单IP限制（防多账号）')}
                size='default'
                checkedText='开'
                uncheckedText='关'
                extraText={t(
                  '同一 IP 每天只允许一个账号通过接入该规则的功能',
                )}
                onChange={handleFieldChange(
                  'ip_restriction_setting.single_ip_limit_enabled',
                )}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'ip_restriction_setting.block_vpn'}
                label={t('屏蔽 VPN / 代理网络')}
                size='default'
                checkedText='开'
                uncheckedText='关'
                extraText={t('屏蔽检测到使用 VPN 或代理的 IP')}
                onChange={handleFieldChange('ip_restriction_setting.block_vpn')}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'ip_restriction_setting.block_datacenter'}
                label={t('屏蔽数据中心 / 服务器 IP')}
                size='default'
                checkedText='开'
                uncheckedText='关'
                extraText={t(
                  '屏蔽来自数据中心、云服务商、机场出口节点的 IP',
                )}
                onChange={handleFieldChange(
                  'ip_restriction_setting.block_datacenter',
                )}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'ip_restriction_setting.block_residential'}
                label={t('屏蔽住宅代理网络')}
                size='default'
                checkedText='开'
                uncheckedText='关'
                extraText={t('屏蔽住宅 IP 代理池（需配置 IP 检测服务）')}
                onChange={handleFieldChange(
                  'ip_restriction_setting.block_residential',
                )}
              />
            </Col>
          </Row>
        </Form.Section>

        <Form.Section text={t('IP 检测服务')}>
          <Typography.Text
            type='tertiary'
            style={{ marginBottom: 16, display: 'block' }}
          >
            {t(
              'VPN / 代理 / 数据中心屏蔽需要接入第三方 IP 情报服务，后续其他功能也会复用这里的配置',
            )}
          </Typography.Text>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Select
                field={'ip_restriction_setting.ip_check_provider'}
                label={t('IP 检测服务商')}
                placeholder={t('选择服务商（不选则不检测）')}
                onChange={handleFieldChange(
                  'ip_restriction_setting.ip_check_provider',
                )}
                optionList={[
                  { value: '', label: t('不启用 IP 检测') },
                  {
                    value: 'ip-api',
                    label: 'ip-api.com（免费版无需 Key，45次/分）',
                  },
                  {
                    value: 'ipinfo',
                    label: 'ipinfo.io（免费版每月5万次，需 Token）',
                  },
                ]}
                style={{ width: '100%' }}
              />
            </Col>

            {provider === 'ip-api' && (
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'ip_restriction_setting.ip_api_key'}
                  label={t('ip-api.com API Key（可选）')}
                  placeholder={t('留空使用免费版（HTTP，限速 45 次/分）')}
                  onChange={handleFieldChange(
                    'ip_restriction_setting.ip_api_key',
                  )}
                  extraText={
                    <Typography.Text
                      type='tertiary'
                      style={{ fontSize: 12 }}
                    >
                      {t(
                        '免费版无需 Key，但仅支持 HTTP 且速率较低。Pro 版填写 Key 后支持 HTTPS 且速率更高。',
                      )}
                      <a
                        href='https://members.ip-api.com/'
                        target='_blank'
                        rel='noreferrer'
                        style={{ marginLeft: 4 }}
                      >
                        {t('获取 Pro Key')}
                      </a>
                    </Typography.Text>
                  }
                />
              </Col>
            )}

            {provider === 'ipinfo' && (
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'ip_restriction_setting.ipinfo_token'}
                  label={t('ipinfo.io Token（可选）')}
                  placeholder={t('留空使用匿名访问（速率极低）')}
                  onChange={handleFieldChange(
                    'ip_restriction_setting.ipinfo_token',
                  )}
                  extraText={
                    <Typography.Text
                      type='tertiary'
                      style={{ fontSize: 12 }}
                    >
                      {t(
                        '免费账号每月 5 万次请求。Privacy Detection 需要付费计划，免费版主要用于识别数据中心 IP。',
                      )}
                      <a
                        href='https://ipinfo.io/signup'
                        target='_blank'
                        rel='noreferrer'
                        style={{ marginLeft: 4 }}
                      >
                        {t('注册获取 Token')}
                      </a>
                    </Typography.Text>
                  }
                />
              </Col>
            )}
          </Row>

          {ipBlockEnabled && !provider && (
            <Typography.Text
              type='warning'
              style={{ marginTop: 8, display: 'block', fontSize: 12 }}
            >
              {t(
                '已开启屏蔽规则，但未选择 IP 检测服务商，屏蔽将不会生效。请先完成服务商配置。',
              )}
            </Typography.Text>
          )}
        </Form.Section>

        <Row>
          <Button size='default' onClick={onSubmit}>
            {t('保存 IP 限制设置')}
          </Button>
        </Row>
      </Form>
    </Spin>
  );
}
