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
import { useTranslation } from 'react-i18next';
import {
  API,
  showError,
  showSuccess,
  renderQuota,
  renderQuotaWithPrompt,
  getCurrencyConfig,
  normalizeUsername,
  isValidUsername,
  USERNAME_RULE_TEXT,
  isAdmin,
} from '../../../../helpers';
import {
  quotaToDisplayAmount,
  displayAmountToQuota,
} from '../../../../helpers/quota';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';
import {
  Button,
  Modal,
  SideSheet,
  Space,
  Spin,
  Typography,
  Card,
  Tag,
  Form,
  Avatar,
  Row,
  Col,
  InputNumber,
} from '@douyinfe/semi-ui';
import {
  IconUser,
  IconSave,
  IconClose,
  IconLink,
  IconUserGroup,
  IconPlus,
} from '@douyinfe/semi-icons';
import UserBindingManagementModal from './UserBindingManagementModal';

const { Text, Title } = Typography;

const EditUserModal = (props) => {
  const { t } = useTranslation();
  const userId = props.editingUser?.id;
  const isEdit = Boolean(userId);
  const isMobile = useIsMobile();
  const formApiRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [groupOptions, setGroupOptions] = useState([]);
  const [bindingModalVisible, setBindingModalVisible] = useState(false);
  const [addQuotaModalOpen, setAddQuotaModalOpen] = useState(false);
  const [addQuotaLocal, setAddQuotaLocal] = useState('');
  const [addAmountLocal, setAddAmountLocal] = useState('');

  const getInitValues = () => ({
    username: '',
    display_name: '',
    password: '',
    email: '',
    github_id: '',
    oidc_id: '',
    discord_id: '',
    wechat_id: '',
    telegram_id: '',
    linux_do_id: '',
    quota: 0,
    request_rate_limit: 0,
    request_rate_limit_hour: 0,
    request_rate_limit_day: 0,
    group: 'default',
    remark: '',
  });

  const fetchGroups = async () => {
    try {
      const res = await API.get('/api/group/');
      setGroupOptions(
        (res.data.data || []).map((g) => ({ label: g, value: g })),
      );
    } catch (error) {
      showError(error.message);
    }
  };

  const handleCancel = () => props.handleClose();

  const loadUser = async () => {
    setLoading(true);
    try {
      const url = userId ? '/api/user/' + userId : '/api/user/self';
      const res = await API.get(url);
      const { success, message, data } = res.data;
      if (success) {
        formApiRef.current?.setValues({
          ...getInitValues(),
          ...data,
          password: '',
        });
      } else {
        showError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!props.visible) {
      return;
    }
    loadUser();
    if (userId) {
      fetchGroups();
    }
    setBindingModalVisible(false);
  }, [props.visible, userId]);

  const submit = async (values) => {
    const normalizedUsername = normalizeUsername(values.username);
    if (!normalizedUsername) {
      showError(t('请输入用户名'));
      return;
    }
    // 管理员编辑用户信息时不限制用户名规则，但自己编辑自己或者是新增用户（或非管理员操作）时限制
    if (!isAdmin() && !isValidUsername(normalizedUsername)) {
      showError(t(USERNAME_RULE_TEXT));
      return;
    }

    setLoading(true);
    try {
      const payload = { ...values, username: normalizedUsername };
      if (typeof payload.quota === 'string') {
        payload.quota = parseInt(payload.quota) || 0;
      }
      if (userId) {
        payload.id = parseInt(userId);
      }
      const url = userId ? '/api/user/' : '/api/user/self';
      const res = await API.put(url, payload);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('保存成功'));
        props.refresh();
        props.handleClose();
      } else {
        showError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const addLocalQuota = () => {
    const current = parseInt(formApiRef.current?.getValue('quota') || 0);
    const delta = parseInt(addQuotaLocal) || 0;
    const next = current + delta;
    if (next < 0) {
      showError(t('调整后的额度不能小于 0'));
      return false;
    }
    formApiRef.current?.setValue('quota', next);
    return true;
  };

  const quotaPreview = useMemo(() => {
    const current = parseInt(formApiRef.current?.getValue('quota') || 0);
    const delta = parseInt(addQuotaLocal || 0) || 0;
    return {
      current,
      delta,
      total: current + delta,
    };
  }, [addQuotaLocal, addQuotaModalOpen]);

  return (
    <>
      <SideSheet
        placement='right'
        title={
          <Space>
            <Tag color='blue' shape='circle'>
              {t(isEdit ? '编辑' : '个人')}
            </Tag>
            <Title heading={4} className='m-0'>
              {t(isEdit ? '编辑用户' : '个人信息')}
            </Title>
          </Space>
        }
        bodyStyle={{ padding: 0 }}
        visible={props.visible}
        width={isMobile ? '100%' : 600}
        footer={
          <div className='flex justify-end bg-white'>
            <Space>
              <Button
                theme='solid'
                onClick={() => formApiRef.current?.submitForm()}
                icon={<IconSave />}
                loading={loading}
              >
                {t('保存')}
              </Button>
              <Button
                theme='light'
                type='primary'
                onClick={handleCancel}
                icon={<IconClose />}
              >
                {t('取消')}
              </Button>
            </Space>
          </div>
        }
        closeIcon={null}
        onCancel={handleCancel}
      >
        <Spin spinning={loading}>
          <Form
            initValues={getInitValues()}
            getFormApi={(api) => (formApiRef.current = api)}
            onSubmit={submit}
            onSubmitFail={(errs) => {
              const first = Object.values(errs)[0];
              if (first) {
                showError(Array.isArray(first) ? first[0] : first);
              }
              formApiRef.current?.scrollToError();
            }}
          >
            {({ values }) => {
              const hasPersonalRateLimit =
                Number(values.request_rate_limit || 0) > 0 ||
                Number(values.request_rate_limit_hour || 0) > 0 ||
                Number(values.request_rate_limit_day || 0) > 0;

              return (
                <div className='p-2 space-y-3'>
                  <Card className='!rounded-2xl shadow-sm border-0'>
                    <div className='flex items-center mb-2'>
                      <Avatar
                        size='small'
                        color='blue'
                        className='mr-2 shadow-md'
                      >
                        <IconUser size={16} />
                      </Avatar>
                      <div>
                        <Text className='text-lg font-medium'>
                          {t('基础信息')}
                        </Text>
                        <div className='text-xs text-gray-600'>
                          {t('编辑用户的登录信息与基础资料')}
                        </div>
                      </div>
                    </div>

                    <Row gutter={12}>
                      <Col span={24}>
                        <Form.Input
                          field='username'
                          label={t('用户名')}
                          placeholder={t('请输入用户名')}
                          rules={[
                            { required: true, message: t('请输入用户名') },
                          ]}
                          extraText={t(USERNAME_RULE_TEXT)}
                          maxLength={20}
                          showClear
                        />
                      </Col>

                      <Col span={24}>
                        <Form.Input
                          field='password'
                          label={t('密码')}
                          placeholder={t('如需修改密码请在此输入')}
                          mode='password'
                          showClear
                        />
                      </Col>

                      <Col span={24}>
                        <Form.Input
                          field='display_name'
                          label={t('显示名称')}
                          placeholder={t('请输入显示名称')}
                          showClear
                        />
                      </Col>

                      <Col span={24}>
                        <Form.Input
                          field='email'
                          label={t('邮箱')}
                          placeholder={t('请输入邮箱')}
                          showClear
                        />
                      </Col>

                      <Col span={24}>
                        <Form.Input
                          field='remark'
                          label={t('备注')}
                          placeholder={t('请输入备注，便于后台识别')}
                          showClear
                        />
                      </Col>
                    </Row>
                  </Card>

                  {userId && (
                    <Card className='!rounded-2xl shadow-sm border-0'>
                      <div className='flex items-center mb-2'>
                        <Avatar
                          size='small'
                          color='green'
                          className='mr-2 shadow-md'
                        >
                          <IconUserGroup size={16} />
                        </Avatar>
                        <div>
                          <Text className='text-lg font-medium'>
                            {t('分组与额度')}
                          </Text>
                          <div className='text-xs text-gray-600'>
                            {t('管理用户分组、可用额度和个人限速设置')}
                          </div>
                        </div>
                      </div>

                      <Row gutter={12}>
                        <Col span={24}>
                          <Form.Select
                            field='group'
                            label={t('分组')}
                            placeholder={t('请选择分组')}
                            optionList={groupOptions}
                            allowAdditions
                            search
                            rules={[
                              { required: true, message: t('请选择分组') },
                            ]}
                          />
                        </Col>

                        <Col span={10}>
                          <Form.InputNumber
                            field='quota'
                            label={t('额度')}
                            placeholder={t('请输入额度')}
                            step={500000}
                            extraText={renderQuotaWithPrompt(values.quota || 0)}
                            rules={[
                              { required: true, message: t('请输入额度') },
                            ]}
                            style={{ width: '100%' }}
                          />
                        </Col>

                        <Col span={14}>
                          <Form.Slot label={t('快捷调整')}>
                            <Button
                              icon={<IconPlus />}
                              onClick={() => setAddQuotaModalOpen(true)}
                            >
                              {t('增减额度')}
                            </Button>
                          </Form.Slot>
                        </Col>

                        <Col span={24}>
                          <div className='rounded-2xl border border-[var(--semi-color-border)] bg-[var(--semi-color-fill-0)] p-4'>
                            <div className='mb-3 flex flex-wrap items-start justify-between gap-3'>
                              <div>
                                <Text strong>{t('个人限速')}</Text>
                                <div className='mt-1 text-xs leading-5 text-[var(--semi-color-text-2)]'>
                                  {t(
                                    '填写 0 或留空表示不限，用于限制单个用户的请求频率',
                                  )}
                                </div>
                              </div>
                              <Space wrap spacing={6}>
                                <Tag
                                  color={
                                    hasPersonalRateLimit ? 'orange' : 'grey'
                                  }
                                >
                                  {hasPersonalRateLimit
                                    ? t('已开启限速')
                                    : t('未开启限速')}
                                </Tag>
                                {!hasPersonalRateLimit && (
                                  <Tag color='blue'>{t('0 = 不限制')}</Tag>
                                )}
                                {Number(values.request_rate_limit || 0) > 0 && (
                                  <Tag color='red'>
                                    {t('分钟')}:{values.request_rate_limit}
                                  </Tag>
                                )}
                                {Number(values.request_rate_limit_hour || 0) >
                                  0 && (
                                  <Tag color='orange'>
                                    {t('小时')}:{values.request_rate_limit_hour}
                                  </Tag>
                                )}
                                {Number(values.request_rate_limit_day || 0) >
                                  0 && (
                                  <Tag color='yellow'>
                                    {t('每天')}:{values.request_rate_limit_day}
                                  </Tag>
                                )}
                              </Space>
                            </div>

                            <Row gutter={12}>
                              <Col xs={24} sm={24} md={24}>
                                <Form.InputNumber
                                  field='request_rate_limit'
                                  label={t('每分钟限制')}
                                  placeholder={t('0 表示不限制')}
                                  min={0}
                                  step={1}
                                  extraText={t(
                                    '限制当前用户每分钟允许的最大请求次数',
                                  )}
                                  style={{ width: '100%' }}
                                />
                              </Col>

                              <Col xs={24} sm={12} md={12}>
                                <Form.InputNumber
                                  field='request_rate_limit_hour'
                                  label={t('每小时限制')}
                                  placeholder={t('0 表示不限制')}
                                  min={0}
                                  step={1}
                                  extraText={t(
                                    '按 1 小时统计当前用户最大请求次数',
                                  )}
                                  style={{ width: '100%' }}
                                />
                              </Col>

                              <Col xs={24} sm={12} md={12}>
                                <Form.InputNumber
                                  field='request_rate_limit_day'
                                  label={t('每日限制')}
                                  placeholder={t('0 表示不限制')}
                                  min={0}
                                  step={1}
                                  extraText={t(
                                    '按 24 小时统计当前用户最大请求次数',
                                  )}
                                  style={{ width: '100%' }}
                                />
                              </Col>
                            </Row>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  )}

                  {userId && (
                    <Card className='!rounded-2xl shadow-sm border-0'>
                      <div className='flex items-center justify-between gap-3'>
                        <div className='flex items-center min-w-0'>
                          <Avatar
                            size='small'
                            color='purple'
                            className='mr-2 shadow-md'
                          >
                            <IconLink size={16} />
                          </Avatar>
                          <div className='min-w-0'>
                            <Text className='text-lg font-medium'>
                              {t('账号绑定')}
                            </Text>
                            <div className='text-xs text-gray-600'>
                              {t('查看或清理用户已绑定的第三方账号信息')}
                            </div>
                          </div>
                        </div>
                        <Button
                          type='primary'
                          theme='outline'
                          onClick={() => setBindingModalVisible(true)}
                        >
                          {t('管理绑定')}
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              );
            }}
          </Form>
        </Spin>
      </SideSheet>

      <UserBindingManagementModal
        visible={bindingModalVisible}
        onCancel={() => setBindingModalVisible(false)}
        userId={userId}
        isMobile={isMobile}
        formApiRef={formApiRef}
      />

      <Modal
        centered
        visible={addQuotaModalOpen}
        okText={t('应用')}
        cancelText={t('取消')}
        onOk={() => {
          if (!addLocalQuota()) {
            return;
          }
          setAddQuotaModalOpen(false);
          setAddQuotaLocal('');
          setAddAmountLocal('');
        }}
        onCancel={() => {
          setAddQuotaModalOpen(false);
          setAddQuotaLocal('');
          setAddAmountLocal('');
        }}
        closable={null}
        title={
          <div className='flex items-center'>
            <IconPlus className='mr-2' />
            {t('增减额度')}
          </div>
        }
      >
        <div className='mb-4'>
          <Text type='secondary' className='block mb-2'>
            {t('当前额度')}：{renderQuota(quotaPreview.current)}{' '}
            {quotaPreview.delta >= 0 ? '+' : '-'}{' '}
            {renderQuota(Math.abs(quotaPreview.delta))} ={' '}
            {renderQuota(quotaPreview.total)}
          </Text>
        </div>
        {getCurrencyConfig().type !== 'TOKENS' && (
          <div className='mb-3'>
            <div className='mb-1'>
              <Text size='small'>{t('金额')}</Text>
              <Text size='small' type='tertiary'>
                {' '}
                ({t('支持输入负数，减少用户额度')})
              </Text>
            </div>
            <InputNumber
              prefix={getCurrencyConfig().symbol}
              placeholder={t('请输入金额')}
              value={addAmountLocal}
              precision={2}
              onChange={(val) => {
                setAddAmountLocal(val);
                setAddQuotaLocal(
                  val != null && val !== ''
                    ? displayAmountToQuota(Math.abs(val)) * Math.sign(val)
                    : '',
                );
              }}
              style={{ width: '100%' }}
              showClear
            />
          </div>
        )}
        <div>
          <div className='mb-1'>
            <Text size='small'>{t('额度')}</Text>
          </div>
          <InputNumber
            placeholder={t('请输入额度')}
            value={addQuotaLocal}
            onChange={(val) => {
              setAddQuotaLocal(val);
              setAddAmountLocal(
                val != null && val !== ''
                  ? Number(
                      (
                        quotaToDisplayAmount(Math.abs(val)) * Math.sign(val)
                      ).toFixed(2),
                    )
                  : '',
              );
            }}
            style={{ width: '100%' }}
            showClear
            step={500000}
          />
        </div>
      </Modal>
    </>
  );
};

export default EditUserModal;
