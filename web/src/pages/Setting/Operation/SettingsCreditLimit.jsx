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
import { Button, Col, Form, Row, Spin } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';

export default function SettingsCreditLimit(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    QuotaForNewUser: '',
    PreConsumedQuota: '',
    QuotaForInviter: '',
    QuotaForInvitee: '',
    InvitationRegisterReward: '',
    InvitationFirstTopupThreshold: '',
    InvitationFirstTopupReward: '',
    InvitationRewardRule: '',
    'quota_setting.enable_free_model_pre_consume': true,
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      let value = '';
      if (typeof inputs[item.key] === 'boolean') {
        value = String(inputs[item.key]);
      } else {
        value = inputs[item.key];
      }
      return API.put('/api/option/', {
        key: item.key,
        value,
      });
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

  const quotaDisplayType =
    props.options?.['general_setting.quota_display_type'] || 'USD';
  const rewardSuffix =
    quotaDisplayType === 'TOKENS'
      ? 'Token'
      : quotaDisplayType === 'CNY'
        ? '¥'
        : quotaDisplayType === 'CUSTOM'
          ? props.options?.['general_setting.custom_currency_symbol'] || '¤'
          : '$';
  return (
    <>
      <Spin spinning={loading}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('额度设置')}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  label={t('新用户初始额度')}
                  field={'QuotaForNewUser'}
                  step={1}
                  min={0}
                  suffix={'Token'}
                  placeholder={''}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      QuotaForNewUser: String(value),
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  label={t('新用户使用邀请码奖励额度')}
                  field={'QuotaForInvitee'}
                  step={1}
                  min={0}
                  suffix={'Token'}
                  extraText={t('填写后，用户通过邀请码注册时会直接发到主额度')}
                  placeholder={''}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      QuotaForInvitee: String(value ?? ''),
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  label={t('请求预扣费额度')}
                  field={'PreConsumedQuota'}
                  step={1}
                  min={0}
                  suffix={'Token'}
                  extraText={t('请求结束后多退少补')}
                  placeholder={''}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      PreConsumedQuota: String(value),
                    })
                  }
                />
              </Col>
            </Row>
            <Row>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  label={t('首次邀请奖励金额')}
                  field={'InvitationRegisterReward'}
                  step={0.01}
                  min={0}
                  suffix={rewardSuffix}
                  extraText={t('审核通过后发放到邀请余额，前台审核中不显示金额')}
                  placeholder={t('例如：10')}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      InvitationRegisterReward: String(value ?? ''),
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  label={t('首充门槛金额')}
                  field={'InvitationFirstTopupThreshold'}
                  step={0.01}
                  min={0}
                  suffix={rewardSuffix}
                  extraText={t('达到这个金额后，首充奖励会进入审核中')}
                  placeholder={t('例如：10')}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      InvitationFirstTopupThreshold: String(value ?? ''),
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  label={t('首充奖励金额')}
                  field={'InvitationFirstTopupReward'}
                  step={0.01}
                  min={0}
                  suffix={rewardSuffix}
                  extraText={t('审核通过后发放到邀请余额，用户再手动划转到主余额')}
                  placeholder={t('例如：10')}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      InvitationFirstTopupReward: String(value ?? ''),
                    })
                  }
                />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24}>
                <Form.TextArea
                  label={t('邀请规则说明')}
                  field={'InvitationRewardRule'}
                  placeholder={t(
                    '这里填写前台弹窗展示的邀请规则与审核说明，支持纯文本或 HTML',
                  )}
                  autosize={{ minRows: 4, maxRows: 8 }}
                  extraText={t(
                    '建议写明首邀奖励、首充门槛、审核方式与风控规则，前台点击按钮后以弹窗展示',
                  )}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      InvitationRewardRule: value,
                    })
                  }
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.Switch
                  label={t('对免费模型启用预消耗')}
                  field={'quota_setting.enable_free_model_pre_consume'}
                  extraText={t(
                    '开启后，对免费模型（倍率为0，或者价格为0）的模型也会预消耗额度',
                  )}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      'quota_setting.enable_free_model_pre_consume': value,
                    })
                  }
                />
              </Col>
            </Row>

            <Row>
              <Button size='default' onClick={onSubmit}>
                {t('保存额度设置')}
              </Button>
            </Row>
          </Form.Section>
        </Form>
      </Spin>
    </>
  );
}
