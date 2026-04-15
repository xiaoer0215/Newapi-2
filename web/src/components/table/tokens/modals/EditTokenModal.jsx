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

import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  API,
  showError,
  showSuccess,
  timestamp2string,
  renderGroupOption,
  renderQuotaWithPrompt,
  getModelCategories,
  selectFilter,
} from '../../../../helpers';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';
import {
  SideSheet,
  Form,
} from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { StatusContext } from '../../../../context/Status';

const EditTokenModal = (props) => {
  const { t } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const formApiRef = useRef(null);
  const [models, setModels] = useState([]);
  const [groups, setGroups] = useState([]);
  const isEdit = props.editingToken.id !== undefined;

  const getInitValues = () => ({
    name: '',
    remain_quota: 0,
    expired_time: -1,
    unlimited_quota: true,
    model_limits_enabled: false,
    model_limits: [],
    allow_ips: '',
    group: undefined,
    cross_group_retry: false,
    tokenCount: 1,
  });

  const handleCancel = () => {
    props.handleClose();
  };

  const setExpiredTime = (month, day, hour, minute) => {
    let now = new Date();
    let timestamp = now.getTime() / 1000;
    let seconds = month * 30 * 24 * 60 * 60;
    seconds += day * 24 * 60 * 60;
    seconds += hour * 60 * 60;
    seconds += minute * 60;
    if (!formApiRef.current) return;
    if (seconds !== 0) {
      timestamp += seconds;
      formApiRef.current.setValue('expired_time', timestamp2string(timestamp));
    } else {
      formApiRef.current.setValue('expired_time', -1);
    }
  };

  const loadModels = async () => {
    let res = await API.get(`/api/user/models`);
    const { success, message, data } = res.data;
    if (success) {
      const categories = getModelCategories(t);
      let localModelOptions = data.map((model) => {
        let icon = null;
        for (const [key, category] of Object.entries(categories)) {
          if (key !== 'all' && category.filter({ model_name: model })) {
            icon = category.icon;
            break;
          }
        }
        return {
          label: (
            <span className='flex items-center gap-1'>
              {icon}
              {model}
            </span>
          ),
          value: model,
        };
      });
      setModels(localModelOptions);
    } else {
      showError(t(message));
    }
  };

  const loadGroups = async () => {
    let res = await API.get(`/api/user/self/groups`);
    const { success, message, data } = res.data;
    if (success) {
      let localGroupOptions = Object.entries(data).map(([group, info]) => ({
        label: info.desc,
        value: group,
        ratio: info.ratio,
      }));
      if (statusState?.status?.default_use_auto_group) {
        if (localGroupOptions.some((group) => group.value === 'auto')) {
          localGroupOptions.sort((a, b) => (a.value === 'auto' ? -1 : 1));
        }
      }
      setGroups(localGroupOptions);
    } else {
      showError(t(message));
    }
  };

  const loadToken = async () => {
    setLoading(true);
    let res = await API.get(`/api/token/${props.editingToken.id}`);
    const { success, message, data } = res.data;
    if (success) {
      if (data.expired_time !== -1) {
        data.expired_time = timestamp2string(data.expired_time);
      }
      if (data.model_limits !== '') {
        data.model_limits = data.model_limits.split(',');
      } else {
        data.model_limits = [];
      }
      if (formApiRef.current) {
        formApiRef.current.setValues({ ...getInitValues(), ...data });
      }
    } else {
      showError(message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (formApiRef.current) {
      if (!isEdit) {
        formApiRef.current.setValues(getInitValues());
      }
    }
    loadModels();
    loadGroups();
  }, [props.editingToken.id]);

  useEffect(() => {
    if (props.visiable) {
      if (isEdit) {
        loadToken();
      } else {
        formApiRef.current?.setValues(getInitValues());
      }
    } else {
      formApiRef.current?.reset();
    }
  }, [props.visiable, props.editingToken.id]);

  const generateRandomSuffix = () => {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  };

  const submit = async (values) => {
    setLoading(true);
    if (isEdit) {
      let { tokenCount: _tc, ...localInputs } = values;
      localInputs.remain_quota = parseInt(localInputs.remain_quota);
      if (localInputs.expired_time !== -1) {
        let time = Date.parse(localInputs.expired_time);
        if (isNaN(time)) {
          showError(t('过期时间格式错误！'));
          setLoading(false);
          return;
        }
        localInputs.expired_time = Math.ceil(time / 1000);
      }
      localInputs.model_limits = localInputs.model_limits.join(',');
      localInputs.model_limits_enabled = localInputs.model_limits.length > 0;
      let res = await API.put(`/api/token/`, {
        ...localInputs,
        id: parseInt(props.editingToken.id),
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('令牌更新成功！'));
        props.refresh();
        props.handleClose();
      } else {
        showError(t(message));
      }
    } else {
      const count = parseInt(values.tokenCount, 10) || 1;
      let successCount = 0;
      for (let i = 0; i < count; i++) {
        let { tokenCount: _tc, ...localInputs } = values;
        const baseName =
          values.name.trim() === '' ? 'default' : values.name.trim();
        if (i !== 0 || values.name.trim() === '') {
          localInputs.name = `${baseName}-${generateRandomSuffix()}`;
        } else {
          localInputs.name = baseName;
        }
        localInputs.remain_quota = parseInt(localInputs.remain_quota);

        if (localInputs.expired_time !== -1) {
          let time = Date.parse(localInputs.expired_time);
          if (isNaN(time)) {
            showError(t('过期时间格式错误！'));
            setLoading(false);
            break;
          }
          localInputs.expired_time = Math.ceil(time / 1000);
        }
        localInputs.model_limits = localInputs.model_limits.join(',');
        localInputs.model_limits_enabled = localInputs.model_limits.length > 0;
        let res = await API.post(`/api/token/`, localInputs);
        const { success, message } = res.data;
        if (success) {
          successCount++;
        } else {
          showError(t(message));
          break;
        }
      }
      if (successCount > 0) {
        showSuccess(t('令牌创建成功，请在列表页面点击复制获取令牌！'));
        props.refresh();
        props.handleClose();
      }
    }
    setLoading(false);
    formApiRef.current?.setValues(getInitValues());
  };

  return (
    <SideSheet
      className='token-glass-edit-sheet'
      placement={isEdit ? 'right' : 'left'}
      title={null}
      headerStyle={{ display: 'none' }}
      bodyStyle={{ padding: 0, background: 'transparent', display: 'flex', flexDirection: 'column', height: '100%' }}
      style={{
        background: 'rgba(241,245,249,0.97)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
      maskStyle={{
        background: 'rgba(15,23,42,0.30)',
        backdropFilter: 'blur(8px) saturate(180%)',
        WebkitBackdropFilter: 'blur(8px) saturate(180%)',
      }}
      visible={props.visiable}
      maskClosable={true}
      width={isMobile ? '100%' : 520}
      footer={null}
      closeIcon={null}
      onCancel={handleCancel}
    >
      <Form
        key={isEdit ? 'edit' : 'new'}
        initValues={getInitValues()}
        getFormApi={(api) => (formApiRef.current = api)}
        onSubmit={submit}
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {({ values }) => (
          <>
            {/* Drawer Header */}
            <div className='token-glass-edit-header' style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(148,163,184,0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(8px)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: isEdit
                    ? 'linear-gradient(135deg,#F59E0B,#EF4444)'
                    : 'linear-gradient(135deg,#4F46E5,#818CF8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', boxShadow: '0 4px 10px rgba(79,70,229,0.3)',
                }}>
                  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4' />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0, lineHeight: 1.3 }}>
                    {isEdit ? t('更新令牌信息') : t('创建新的令牌')}
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
                    {isEdit ? t('修改令牌的配置信息') : t('配置并创建新令牌')}
                  </p>
                </div>
              </div>
              <button
                className='token-glass-edit-close'
                onClick={handleCancel}
                  style={{ border: 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(148,163,184,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>
                </svg>
              </button>
            </div>

            {/* Drawer Body */}
            <div className='token-glass-edit-body' style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Section: 基本信息 */}
              <div className='edt-card-section'>
                <div className='edt-card-header'>
                  <div className='edt-card-icon' style={{ background: 'linear-gradient(135deg,#4F46E5,#818CF8)' }}>
                    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4'/>
                    </svg>
                  </div>
                  <div>
                    <h3>{t('基本信息')}</h3>
                    <p>{t('设置令牌的基本信息')}</p>
                  </div>
                </div>
                <div className='edt-card-body'>
                  <Form.Input
                    field='name'
                    label={t('名称')}
                    placeholder={t('请输入名称')}
                    rules={[{ required: true, message: t('请输入名称') }]}
                    showClear
                    style={{ width: '100%' }}
                  />

                  {groups.length > 0 ? (
                    <Form.Select
                      field='group'
                      label={
                        <>
                          {t('令牌分组')}
                          {statusState?.status?.token_group_help_link && (
                            <a
                              href={statusState.status.token_group_help_link}
                              target='_blank'
                              rel='noopener noreferrer'
                              style={{ color: '#4F46E5', marginLeft: 8, fontSize: 12 }}
                            >
                              {statusState.status.token_group_help_text || t('如何选择分组?')}
                            </a>
                          )}
                        </>
                      }
                      placeholder={t('请选择令牌分组')}
                      optionList={groups}
                      renderOptionItem={renderGroupOption}
                      rules={[{ required: true, message: t('请选择令牌分组') }]}
                      showClear
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <Form.Select
                      placeholder={t('管理员未设置用户可选分组')}
                      disabled
                      label={t('令牌分组')}
                      style={{ width: '100%' }}
                    />
                  )}

                  {values.group === 'auto' && (
                    <Form.Switch
                      field='cross_group_retry'
                      label={t('跨分组重试')}
                      size='default'
                      extraText={t('开启后，当前分组渠道失败时会按顺序尝试下一个分组的渠道')}
                    />
                  )}

                  <Form.DatePicker
                    field='expired_time'
                    label={t('过期时间')}
                    type='dateTime'
                    placeholder={t('请选择过期时间')}
                    rules={[
                      { required: true, message: t('请选择过期时间') },
                      {
                        validator: (rule, value) => {
                          if (value === -1 || !value) return Promise.resolve();
                          const time = Date.parse(value);
                          if (isNaN(time)) return Promise.reject(t('过期时间格式错误！'));
                          if (time <= Date.now()) return Promise.reject(t('过期时间不能早于当前时间！'));
                          return Promise.resolve();
                        },
                      },
                    ]}
                    showClear
                    style={{ width: '100%' }}
                  />

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('过期时间快捷设置')}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { label: t('永不过期'), args: [0, 0, 0, 0] },
                        { label: t('一个月'), args: [1, 0, 0, 0] },
                        { label: t('一天'), args: [0, 1, 0, 0] },
                        { label: t('一小时'), args: [0, 0, 1, 0] },
                      ].map(({ label, args }) => (
                        <button
                          key={label}
                          type='button'
                          className='edt-btn-tag'
                          onClick={() => setExpiredTime(...args)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!isEdit && (
                    <Form.InputNumber
                      field='tokenCount'
                      label={t('新建数量')}
                      min={1}
                      extraText={t('批量创建时会在名称后自动添加随机后缀')}
                      rules={[{ required: true, message: t('请输入新建数量') }]}
                      style={{ width: '100%' }}
                    />
                  )}
                </div>
              </div>

              {/* Section: 额度设置 */}
              <div className='edt-card-section'>
                <div className='edt-card-header'>
                  <div className='edt-card-icon' style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
                    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                      <rect x='1' y='4' width='22' height='16' rx='2' ry='2'/><line x1='1' y1='10' x2='23' y2='10'/>
                    </svg>
                  </div>
                  <div>
                    <h3>{t('额度设置')}</h3>
                    <p>{t('设置令牌可用额度和数量')}</p>
                  </div>
                </div>
                <div className='edt-card-body'>
                  <Form.AutoComplete
                    field='remain_quota'
                    label={t('额度')}
                    placeholder={t('请输入额度')}
                    type='number'
                    disabled={values.unlimited_quota}
                    extraText={renderQuotaWithPrompt(values.remain_quota)}
                    rules={values.unlimited_quota ? [] : [{ required: true, message: t('请输入额度') }]}
                    data={[
                      { value: 500000, label: '1$' },
                      { value: 5000000, label: '10$' },
                      { value: 25000000, label: '50$' },
                      { value: 50000000, label: '100$' },
                      { value: 250000000, label: '500$' },
                      { value: 500000000, label: '1000$' },
                    ]}
                    style={{ width: '100%' }}
                  />
                  <Form.Switch
                    field='unlimited_quota'
                    label={t('无限额度')}
                    size='default'
                    extraText={t('令牌的额度仅用于限制令牌本身的最大额度使用量，实际的使用受到账户的剩余额度限制')}
                  />
                </div>
              </div>

              {/* Section: 访问限制 */}
              <div className='edt-card-section'>
                <div className='edt-card-header'>
                  <div className='edt-card-icon' style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}>
                    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/><path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/>
                    </svg>
                  </div>
                  <div>
                    <h3>{t('访问限制')}</h3>
                    <p>{t('设置令牌的访问限制')}</p>
                  </div>
                </div>
                <div className='edt-card-body'>
                  <Form.Select
                    field='model_limits'
                    label={t('模型限制列表')}
                    placeholder={t('请选择该令牌支持的模型，留空支持所有模型')}
                    multiple
                    optionList={models}
                    extraText={
                      <span style={{ color: '#E11D48', fontWeight: 600 }}>{t('禁止限制模型')}</span>
                    }
                    filter={selectFilter}
                    autoClearSearchValue={false}
                    searchPosition='dropdown'
                    showClear
                    disabled
                    style={{ width: '100%' }}
                  />
                  <Form.TextArea
                    field='allow_ips'
                    label={t('IP白名单（支持CIDR表达式）')}
                    placeholder={t('允许的IP，一行一个，不填写则不限制')}
                    autosize
                    rows={1}
                    extraText={t('请勿过度信任此功能，IP可能被伪造，请配合nginx和cdn等网关使用')}
                    showClear
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className='token-glass-edit-footer' style={{
              padding: '12px 24px',
              borderTop: '1px solid rgba(148,163,184,0.2)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              background: 'rgba(248,250,252,0.97)',
              backdropFilter: 'blur(8px)',
              flexShrink: 0,
            }}>
              <button
                type='button'
                onClick={handleCancel}
                className='token-glass-btn token-glass-btn--ghost'
                >
                {t('取消')}
              </button>
              <button
                type='button'
                onClick={() => formApiRef.current?.submitForm()}
                disabled={loading}
                className='token-glass-btn token-glass-btn--primary token-glass-btn--submit'
                  style={{ border: 'none' }}
                >
                {loading ? (
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' style={{ animation: 'spin 1s linear infinite' }}><path d='M21 12a9 9 0 1 1-6.219-8.56'/></svg>
                ) : (
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'/><polyline points='17 21 17 13 7 13 7 21'/><polyline points='7 3 7 8 15 8'/></svg>
                )}
                {t('提交')}
              </button>
            </div>
          </>
        )}
      </Form>
    </SideSheet>
  );
};

export default EditTokenModal;
