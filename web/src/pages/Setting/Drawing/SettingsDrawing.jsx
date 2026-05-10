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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Col, Form, Row, Spin, Tag } from '@douyinfe/semi-ui';
import {
  API,
  selectFilter,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

const getInitialInputs = () => ({
  DrawingEnabled: false,
  DrawingTokenGroup: '',
  DrawingTokenModels: [],
  DrawingDefaultModel: '',
  DrawingCDNMode: 'fastest',
  DrawingCDNProviders:
    'skyimg,litterbox_72h,scdn_cn,scdn_edgeone,scdn_anycast,tuchuang_xqd,wzapi_360',
  MjNotifyEnabled: false,
  MjAccountFilterEnabled: false,
  MjForwardUrlEnabled: false,
  MjModeClearEnabled: false,
  MjActionCheckSuccessEnabled: false,
});

const splitModels = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const serializeValue = (value) => {
  if (Array.isArray(value)) {
    return value.join(',');
  }
  if (value === undefined || value === null) {
    return '';
  }
  return value;
};

const DRAWING_CDN_PROVIDERS = [
  { label: 'SKY Image', value: 'skyimg' },
  { label: 'Litterbox 72h', value: 'litterbox_72h' },
  { label: 'SCDN CN优选', value: 'scdn_cn' },
  { label: 'SCDN EdgeOne', value: 'scdn_edgeone' },
  { label: 'SCDN Anycast', value: 'scdn_anycast' },
  { label: '是图床 游客', value: 'tuchuang_xqd' },
  { label: '360图床', value: 'wzapi_360' },
];

const DEFAULT_CDN_PROVIDERS = DRAWING_CDN_PROVIDERS.map((item) => item.value).join(',');

const splitProviderIds = (raw) =>
  String(raw || DEFAULT_CDN_PROVIDERS)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default function SettingsDrawing(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [groupOptions, setGroupOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [inputs, setInputs] = useState(getInitialInputs());
  const [inputsRow, setInputsRow] = useState(getInitialInputs());
  const refForm = useRef();

  const normalizeModelFields = (draftInputs, availableModels) => {
    const selectedModels = splitModels(draftInputs.DrawingTokenModels).filter(
      (model) => availableModels.includes(model),
    );
    const defaultCandidates =
      selectedModels.length > 0 ? selectedModels : availableModels;
    const defaultModel = defaultCandidates.includes(draftInputs.DrawingDefaultModel)
      ? draftInputs.DrawingDefaultModel
      : '';

    return {
      ...draftInputs,
      DrawingTokenModels: selectedModels,
      DrawingDefaultModel: defaultModel,
    };
  };

  const applyInputsToForm = (nextInputs, syncRow = false) => {
    setInputs(nextInputs);
    if (syncRow) {
      setInputsRow(structuredClone(nextInputs));
    }
    refForm.current?.setValues(nextInputs);
  };

  const loadGroups = async () => {
    try {
      setGroupsLoading(true);
      const res = await API.get('/api/group/');
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      const options = (data || [])
        .map((group) => ({
          label: group,
          value: group,
        }))
        .sort((a, b) => a.value.localeCompare(b.value));
      setGroupOptions(options);
    } catch (error) {
      showError(t('加载绘图分组失败'));
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadModelsByGroup = async (group, baseInputs, syncRow = false) => {
    if (!group) {
      setModelOptions([]);
      const nextInputs = {
        ...baseInputs,
        DrawingTokenModels: [],
        DrawingDefaultModel: '',
      };
      applyInputsToForm(nextInputs, syncRow);
      return;
    }

    try {
      setModelsLoading(true);
      const res = await API.get('/api/group/models', {
        params: { group },
      });
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      const availableModels = (data || []).filter(Boolean);
      setModelOptions(
        availableModels.map((model) => ({
          label: model,
          value: model,
        })),
      );
      const nextInputs = normalizeModelFields(baseInputs, availableModels);
      applyInputsToForm(nextInputs, syncRow);
    } catch (error) {
      showError(t('加载绘图模型失败'));
    } finally {
      setModelsLoading(false);
    }
  };

  function onSubmit() {
    const changedKeys = Object.keys(inputs).filter(
      (key) => serializeValue(inputs[key]) !== serializeValue(inputsRow[key]),
    );
    if (!changedKeys.length) {
      return showWarning(t('你似乎并没有修改什么'));
    }

    const requestQueue = changedKeys.map((key) => {
      let value = serializeValue(inputs[key]);
      if (typeof inputs[key] === 'boolean') {
        value = String(inputs[key]);
      }
      return API.put('/api/option/', { key, value });
    });

    setLoading(true);
    Promise.all(requestQueue)
      .then((responses) => {
        const failedResponse = responses.find(
          (response) => response && response.data && !response.data.success,
        );
        if (failedResponse) {
          showError(failedResponse.data.message || t('保存失败，请重试'));
          return;
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

  const defaultModelOptions = useMemo(() => {
    if (inputs.DrawingTokenModels.length > 0) {
      const selectedSet = new Set(inputs.DrawingTokenModels);
      return modelOptions.filter((option) => selectedSet.has(option.value));
    }
    return modelOptions;
  }, [inputs.DrawingTokenModels, modelOptions]);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    const currentInputs = getInitialInputs();
    Object.keys(currentInputs).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(props.options, key)) {
        currentInputs[key] = props.options[key];
      }
    });
    currentInputs.DrawingTokenGroup = props.options.DrawingTokenGroup || '';
    currentInputs.DrawingTokenModels = splitModels(props.options.DrawingTokenModels);
    currentInputs.DrawingDefaultModel = props.options.DrawingDefaultModel || '';
    currentInputs.DrawingCDNMode = props.options.DrawingCDNMode || 'fastest';
    currentInputs.DrawingCDNProviders = splitProviderIds(
      props.options.DrawingCDNProviders,
    );

    localStorage.setItem(
      'mj_notify_enabled',
      String(currentInputs.MjNotifyEnabled),
    );

    if (currentInputs.DrawingTokenGroup) {
      loadModelsByGroup(currentInputs.DrawingTokenGroup, currentInputs, true);
      return;
    }

    setModelOptions([]);
    applyInputsToForm(currentInputs, true);
  }, [props.options]);

  return (
    <Spin spinning={loading || groupsLoading}>
      <Form
        values={inputs}
        getFormApi={(formAPI) => (refForm.current = formAPI)}
        style={{ marginBottom: 15 }}
      >
        <Form.Section text={t('绘图设置')}>
          <div
            style={{
              marginBottom: 20,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--semi-color-fill-0)',
              color: 'var(--semi-color-text-1)',
              lineHeight: 1.7,
              fontSize: 13,
            }}
          >
            {t(
              '启用后，系统会在用户首次调用 /api/user/self/drawing/init 时自动创建一枚生图专用令牌；令牌只负责限制分组与模型，实际扣费仍走用户自己的余额。',
            )}
          </div>

          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field='DrawingEnabled'
                label={t('启用绘图功能')}
                size='default'
                checkedText='开'
                uncheckedText='关'
                onChange={(value) => {
                  setInputs((prev) => ({
                    ...prev,
                    DrawingEnabled: value,
                  }));
                }}
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field='MjNotifyEnabled'
                label={t('允许回调（会泄露服务器 IP 地址）')}
                size='default'
                checkedText='开'
                uncheckedText='关'
                onChange={(value) =>
                  setInputs((prev) => ({
                    ...prev,
                    MjNotifyEnabled: value,
                  }))
                }
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field='MjAccountFilterEnabled'
                label={t('允许 AccountFilter 参数')}
                size='default'
                checkedText='开'
                uncheckedText='关'
                onChange={(value) =>
                  setInputs((prev) => ({
                    ...prev,
                    MjAccountFilterEnabled: value,
                  }))
                }
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field='MjForwardUrlEnabled'
                label={t('开启之后将上游地址替换为服务器地址')}
                size='default'
                checkedText='开'
                uncheckedText='关'
                onChange={(value) =>
                  setInputs((prev) => ({
                    ...prev,
                    MjForwardUrlEnabled: value,
                  }))
                }
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field='MjModeClearEnabled'
                label={
                  <>
                    {t('开启之后会清除用户提示词中的')} <Tag>--fast</Tag>{' '}
                    <Tag>--relax</Tag> {t('以及')} <Tag>--turbo</Tag>{' '}
                    {t('参数')}
                  </>
                }
                size='default'
                checkedText='开'
                uncheckedText='关'
                onChange={(value) =>
                  setInputs((prev) => ({
                    ...prev,
                    MjModeClearEnabled: value,
                  }))
                }
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field='MjActionCheckSuccessEnabled'
                label={t('检测必须等待绘图成功才能进行放大等操作')}
                size='default'
                checkedText='开'
                uncheckedText='关'
                onChange={(value) =>
                  setInputs((prev) => ({
                    ...prev,
                    MjActionCheckSuccessEnabled: value,
                  }))
                }
              />
            </Col>
          </Row>

          <div
            style={{
              margin: '20px 0 14px',
              fontWeight: 600,
              color: 'var(--semi-color-text-0)',
            }}
          >
            {t('生图专用令牌配置')}
          </div>

          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Select
                field='DrawingTokenGroup'
                label={t('绘图专用分组')}
                placeholder={t('请选择绘图分组')}
                optionList={groupOptions}
                filter={selectFilter}
                searchable
                showClear
                loading={groupsLoading}
                onChange={(value) => {
                  const nextInputs = {
                    ...inputs,
                    DrawingTokenGroup: value || '',
                    DrawingTokenModels: [],
                    DrawingDefaultModel: '',
                  };
                  applyInputsToForm(nextInputs, false);
                  loadModelsByGroup(value || '', nextInputs, false);
                }}
              />
            </Col>

            <Col xs={24} sm={12} md={16} lg={16} xl={16}>
              <Form.Select
                field='DrawingTokenModels'
                label={t('允许的绘图模型')}
                placeholder={
                  inputs.DrawingTokenGroup
                    ? t('可多选，留空表示放行当前分组下全部可用绘图模型')
                    : t('请先选择绘图分组')
                }
                optionList={modelOptions}
                filter={selectFilter}
                searchable
                multiple
                showClear
                loading={modelsLoading}
                disabled={!inputs.DrawingTokenGroup}
                onChange={(value) => {
                  const nextModels = Array.isArray(value) ? value : [];
                  const fallbackModels =
                    nextModels.length > 0
                      ? nextModels
                      : modelOptions.map((option) => option.value);
                  const nextDefault = fallbackModels.includes(
                    inputs.DrawingDefaultModel,
                  )
                    ? inputs.DrawingDefaultModel
                    : '';

                  applyInputsToForm(
                    {
                      ...inputs,
                      DrawingTokenModels: nextModels,
                      DrawingDefaultModel: nextDefault,
                    },
                    false,
                  );
                }}
              />
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: 'var(--semi-color-text-2)',
                }}
              >
                {t(
                  '系统会优先识别支持 /v1/images/generations 的模型；如果该分组没有配置端点元数据，则会回退展示该分组下全部可用模型。',
                )}
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Select
                field='DrawingDefaultModel'
                label={t('默认绘图模型')}
                placeholder={
                  defaultModelOptions.length > 0
                    ? t('留空则自动使用第一个可用模型')
                    : t('暂无可用模型')
                }
                optionList={defaultModelOptions}
                filter={selectFilter}
                searchable
                showClear
                loading={modelsLoading}
                disabled={!inputs.DrawingTokenGroup || defaultModelOptions.length === 0}
                onChange={(value) => {
                  setInputs((prev) => ({
                    ...prev,
                    DrawingDefaultModel: value || '',
                  }));
                }}
              />
            </Col>
          </Row>

          <div
            style={{
              margin: '22px 0 14px',
              fontWeight: 600,
              color: 'var(--semi-color-text-0)',
            }}
          >
            {t('生图图床配置')}
          </div>

          <div
            style={{
              marginBottom: 14,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--semi-color-fill-0)',
              color: 'var(--semi-color-text-1)',
              lineHeight: 1.7,
              fontSize: 13,
            }}
          >
            {t(
              '启用多个图床后，最快可用模式会并发上传，谁先成功就使用谁。免费图床可能限流或跨域失败，建议保留多个备用。',
            )}
          </div>

          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Select
                field='DrawingCDNMode'
                label={t('上传策略')}
                optionList={[
                  { label: t('最快可用'), value: 'fastest' },
                  ...DRAWING_CDN_PROVIDERS,
                ]}
                filter={selectFilter}
                searchable
                onChange={(value) =>
                  setInputs((prev) => ({
                    ...prev,
                    DrawingCDNMode: value || 'fastest',
                  }))
                }
              />
            </Col>

            <Col xs={24} sm={12} md={16} lg={16} xl={16}>
              <Form.Select
                field='DrawingCDNProviders'
                label={t('启用图床')}
                placeholder={t('请选择启用的免费图床')}
                optionList={DRAWING_CDN_PROVIDERS}
                filter={selectFilter}
                searchable
                multiple
                showClear
                onChange={(value) =>
                  setInputs((prev) => ({
                    ...prev,
                    DrawingCDNProviders:
                      Array.isArray(value) && value.length > 0
                        ? value
                        : splitProviderIds(DEFAULT_CDN_PROVIDERS),
                  }))
                }
              />
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: 'var(--semi-color-text-2)',
                }}
              >
                {t('保存时会写入 DrawingCDNMode 和 DrawingCDNProviders；用户生成图片后会上传到这里配置的图床。')}
              </div>
            </Col>
          </Row>

          <Row>
            <Button size='default' onClick={onSubmit}>
              {t('保存绘图设置')}
            </Button>
          </Row>
        </Form.Section>
      </Form>
    </Spin>
  );
}
