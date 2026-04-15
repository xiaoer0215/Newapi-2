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
import { Button, Col, Form, Row, Spin, Typography, Select } from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function SettingsCheckin(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    'checkin_setting.enabled': false,
    'checkin_setting.min_quota': 1000,
    'checkin_setting.max_quota': 10000,
    'checkin_setting.turnstile_enabled': false,
    'checkin_setting.ip_limit_enabled': false,
    'checkin_setting.block_vpn': false,
    'checkin_setting.block_datacenter': false,
    'checkin_setting.block_residential': false,
    'checkin_setting.ip_check_provider': '',
    'checkin_setting.ipinfo_token': '',
    'checkin_setting.ip_api_key': '',
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((inputs) => ({ ...inputs, [fieldName]: value }));
    };
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      let value = typeof inputs[item.key] === 'boolean'
        ? String(inputs[item.key])
        : String(inputs[item.key]);
      return API.put('/api/option/', { key: item.key, value });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined))
            return showError(t('部分保存失败，请重试'));
        }
        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => { showError(t('保存失败，请重试')); })
      .finally(() => { setLoading(false); });
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

  const enabled = inputs['checkin_setting.enabled'];
  const ipLimitEnabled = inputs['checkin_setting.ip_limit_enabled'];
  const provider = inputs['checkin_setting.ip_check_provider'];
  const ipBlockEnabled = enabled && (inputs['checkin_setting.block_vpn'] || inputs['checkin_setting.block_datacenter'] || inputs['checkin_setting.block_residential']);

  return (
    <Spin spinning={loading}>
      <Form
        values={inputs}
        getFormApi={(formAPI) => (refForm.current = formAPI)}
        style={{ marginBottom: 15 }}
      >
        {/* ── 基本签到设置 ── */}
        <Form.Section text={t('签到设置')}>
          <Typography.Text type='tertiary' style={{ marginBottom: 16, display: 'block' }}>
            {t('签到功能允许用户每日签到获取随机额度奖励')}
          </Typography.Text>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'checkin_setting.enabled'}
                label={t('启用签到功能')}
                size='default'
                checkedText='｜'
                uncheckedText='〇'
                onChange={handleFieldChange('checkin_setting.enabled')}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field={'checkin_setting.min_quota'}
                label={t('签到最小额度')}
                placeholder={t('签到奖励的最小额度')}
                onChange={handleFieldChange('checkin_setting.min_quota')}
                min={0}
                disabled={!enabled}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field={'checkin_setting.max_quota'}
                label={t('签到最大额度')}
                placeholder={t('签到奖励的最大额度')}
                onChange={handleFieldChange('checkin_setting.max_quota')}
                min={0}
                disabled={!enabled}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'checkin_setting.turnstile_enabled'}
                label={t('签到时需要 Turnstile 验证')}
                size='default'
                checkedText='｜'
                uncheckedText='〇'
                extraText={t('需先在登录注册设置中填写 Turnstile Site Key 和 Secret Key')}
                onChange={handleFieldChange('checkin_setting.turnstile_enabled')}
                disabled={!enabled}
              />
            </Col>
          </Row>
        </Form.Section>

        {/* ── IP 限制设置 ── */}
        <Form.Section text={t('IP 限制设置')}>
          <Typography.Text type='tertiary' style={{ marginBottom: 16, display: 'block' }}>
            {t('控制同一 IP 的签到行为，防止多账号刷签到。启用"单IP限制"后，同一 IP 当天只允许一个账号签到。')}
          </Typography.Text>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'checkin_setting.ip_limit_enabled'}
                label={t('单IP限制（防多账号）')}
                size='default'
                checkedText='｜'
                uncheckedText='〇'
                extraText={t('同一 IP 每天只允许一个账号签到，防止同 IP 多账号刷签')}
                onChange={handleFieldChange('checkin_setting.ip_limit_enabled')}
                disabled={!enabled}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'checkin_setting.block_vpn'}
                label={t('屏蔽 VPN / 代理网络')}
                size='default'
                checkedText='｜'
                uncheckedText='〇'
                extraText={t('屏蔽检测到使用 VPN 或代理的 IP')}
                onChange={handleFieldChange('checkin_setting.block_vpn')}
                disabled={!enabled || !ipLimitEnabled}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'checkin_setting.block_datacenter'}
                label={t('屏蔽数据中心 / 服务器 IP')}
                size='default'
                checkedText='｜'
                uncheckedText='〇'
                extraText={t('屏蔽来自数据中心、云服务商、机场出口节点的 IP')}
                onChange={handleFieldChange('checkin_setting.block_datacenter')}
                disabled={!enabled || !ipLimitEnabled}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'checkin_setting.block_residential'}
                label={t('屏蔽住宅代理网络')}
                size='default'
                checkedText='｜'
                uncheckedText='〇'
                extraText={t('屏蔽住宅 IP 代理池（需配置 IP 检测服务）')}
                onChange={handleFieldChange('checkin_setting.block_residential')}
                disabled={!enabled || !ipLimitEnabled}
              />
            </Col>
          </Row>
        </Form.Section>

        {/* ── IP 检测服务配置 ── */}
        <Form.Section text={t('IP 检测服务')}>
          <Typography.Text type='tertiary' style={{ marginBottom: 16, display: 'block' }}>
            {t('VPN / 代理 / 数据中心屏蔽功能需要接入第三方 IP 情报服务才能生效。选择服务商并填写 API Key 后，屏蔽规则将自动生效。')}
          </Typography.Text>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Select
                field={'checkin_setting.ip_check_provider'}
                label={t('IP 检测服务商')}
                placeholder={t('选择服务商（不选则不检测）')}
                onChange={handleFieldChange('checkin_setting.ip_check_provider')}
                disabled={!enabled}
                optionList={[
                  { value: '', label: t('不启用 IP 检测') },
                  { value: 'ip-api', label: 'ip-api.com（免费版无需 Key，45次/分）' },
                  { value: 'ipinfo', label: 'ipinfo.io（免费版每月5万次，需 Token）' },
                ]}
                style={{ width: '100%' }}
              />
            </Col>

            {provider === 'ip-api' && (
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'checkin_setting.ip_api_key'}
                  label={t('ip-api.com API Key（可选）')}
                  placeholder={t('留空使用免费版（HTTP，限速45次/分）')}
                  onChange={handleFieldChange('checkin_setting.ip_api_key')}
                  disabled={!enabled}
                  extraText={
                    <Typography.Text type='tertiary' style={{ fontSize: 12 }}>
                      {t('免费版无需 Key，但限 HTTP 且速率较低。Pro 版填入 Key 后使用 HTTPS 且速率更高。')}
                      <a href='https://members.ip-api.com/' target='_blank' rel='noreferrer' style={{ marginLeft: 4 }}>
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
                  field={'checkin_setting.ipinfo_token'}
                  label={t('ipinfo.io Token（可选）')}
                  placeholder={t('留空使用匿名访问（速率极低）')}
                  onChange={handleFieldChange('checkin_setting.ipinfo_token')}
                  disabled={!enabled}
                  extraText={
                    <Typography.Text type='tertiary' style={{ fontSize: 12 }}>
                      {t('免费账号每月 5 万次请求。Privacy Detection（VPN/代理检测）需要付费计划，免费版仅检测数据中心 IP（通过 org 字段判断）。')}
                      <a href='https://ipinfo.io/signup' target='_blank' rel='noreferrer' style={{ marginLeft: 4 }}>
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
              {t('⚠️ 已开启屏蔽规则，但未选择 IP 检测服务商，屏蔽将不生效。请选择服务商并配置 API Key。')}
            </Typography.Text>
          )}

          {provider === 'ipinfo' && (
            <Typography.Text
              type='tertiary'
              style={{ marginTop: 8, display: 'block', fontSize: 12 }}
            >
              {t('💡 ipinfo.io 免费版（基础 JSON 端点）通过 ASN/org 字段判断数据中心 IP，不支持 VPN/代理检测。如需完整的 VPN/代理检测，请升级到 ipinfo.io 付费计划，或使用 ip-api.com（免费版支持 proxy/hosting 字段）。')}
            </Typography.Text>
          )}

          {provider === 'ip-api' && (
            <Typography.Text
              type='tertiary'
              style={{ marginTop: 8, display: 'block', fontSize: 12 }}
            >
              {t('💡 ip-api.com 免费版返回 proxy（VPN/代理/Tor）和 hosting（数据中心）字段，满足大多数场景。免费版使用 HTTP 且限速 45次/分，建议低并发场景使用。')}
            </Typography.Text>
          )}
        </Form.Section>

        <Row>
          <Button size='default' onClick={onSubmit}>
            {t('保存签到设置')}
          </Button>
        </Row>
      </Form>
    </Spin>
  );
}
