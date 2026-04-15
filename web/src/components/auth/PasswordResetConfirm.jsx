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

import React, { useEffect, useState } from 'react';
import { API, copy, showError, showNotice } from '../../helpers';
import { useSearchParams, Link } from 'react-router-dom';
import { Banner, Button } from '@douyinfe/semi-ui';
import { IconCopy, IconLock, IconMail } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { AuthButton, AuthTextField } from './AuthFormControls';

const PasswordResetConfirm = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [newPassword, setNewPassword] = useState('');
  const [searchParams] = useSearchParams();
  const isValidResetLink = Boolean(email && token);

  useEffect(() => {
    setToken(searchParams.get('token') || '');
    setEmail(searchParams.get('email') || '');
  }, [searchParams]);

  useEffect(() => {
    let countdownInterval = null;
    if (disableButton && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown((current) => current - 1);
      }, 1000);
    } else if (countdown === 0) {
      setDisableButton(false);
      setCountdown(30);
    }
    return () => clearInterval(countdownInterval);
  }, [disableButton, countdown]);

  const handleSubmit = async () => {
    if (!email || !token) {
      showError(t('无效的重置链接，请重新发起密码重置请求'));
      return;
    }
    setDisableButton(true);
    setLoading(true);
    try {
      const res = await API.post('/api/user/reset', {
        email,
        token,
      });
      const { success, message, data } = res.data;
      if (success) {
        setNewPassword(data);
        await copy(data);
        showNotice(`${t('密码已重置并已复制到剪贴板：')} ${data}`);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('请求失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!newPassword) return;
    await copy(newPassword);
    showNotice(`${t('密码已重置并已复制到剪贴板：')} ${newPassword}`);
  };

  return (
    <div className='auth-portal-page'>
      <div className='auth-portal-noise' />
      <div className='auth-portal-aurora'>
        <div className='auth-portal-aurora-1' />
        <div className='auth-portal-aurora-2' />
        <div className='auth-portal-aurora-3' />
      </div>
      <div className='auth-portal-shell'>
        <div className='auth-portal-card'>
          <div className='auth-portal-header' style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 className='auth-portal-title'>{t('密码重置确认')}</h1>
            <p className='auth-portal-subtitle'>{t('确认重置后，系统会生成一个新密码并复制到剪贴板。')}</p>
          </div>
          <div className='auth-portal-stack'>
            {!isValidResetLink ? (
              <Banner
                className='auth-portal-banner'
                closeIcon={null}
                description={t('无效的重置链接，请重新发起密码重置请求')}
                type='danger'
              />
            ) : null}
            <div className='auth-portal-note'>
              {t('请确认当前重置链接属于您本人，并在生成新密码后及时完成登录和修改密码。')}
            </div>
            <div className='auth-portal-field'>
              <AuthTextField
                className='auth-portal-input'
                disabled
                placeholder={email ? '' : t('等待获取邮箱信息...')}
                prefixIcon={<IconMail />}
                value={email}
              />
            </div>
            {newPassword ? (
              <div className='auth-portal-field'>
                <div className='auth-portal-success-box'>
                  <AuthTextField
                    className='auth-portal-input'
                    disabled
                    prefixIcon={<IconLock />}
                    value={newPassword}
                  />
                  <Button
                    className='auth-portal-copy-btn'
                    icon={<IconCopy />}
                    theme='light'
                    type='tertiary'
                    onClick={handleCopy}
                  >
                    {t('复制')}
                  </Button>
                </div>
              </div>
            ) : null}
            <AuthButton
              className='auth-portal-primary-btn'
              disabled={disableButton || Boolean(newPassword) || !isValidResetLink}
              loading={loading}
              onClick={handleSubmit}
            >
              {newPassword
                ? t('密码重置完成')
                : disableButton
                  ? `${t('继续')} (${countdown})`
                  : t('密码重置完成')}
            </AuthButton>
          </div>
          <div className='auth-portal-footer-row' style={{ marginTop: 16, textAlign: 'center' }}>
            <Link className='auth-portal-footer-link' to='/login'>
              {t('返回登录')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetConfirm;
