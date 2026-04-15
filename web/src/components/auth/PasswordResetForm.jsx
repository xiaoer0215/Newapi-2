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
import {
  API,
  showError,
  showInfo,
  showSuccess,
} from '../../helpers';
import Turnstile from 'react-turnstile';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconMail } from '@douyinfe/semi-icons';
import { AuthButton, AuthTextField } from './AuthFormControls';
import { normalizeEmailDeliveryMessage } from './emailErrors';

const PasswordResetForm = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    let status = localStorage.getItem('status');
    if (status) {
      status = JSON.parse(status);
      if (status.turnstile_check) {
        setTurnstileEnabled(true);
        setTurnstileSiteKey(status.turnstile_site_key);
      }
    }
  }, []);

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
    if (!email) {
      showError(t('请输入您的邮箱地址'));
      return;
    }
    if (turnstileEnabled && turnstileToken === '') {
      showInfo(t('请稍后几秒重试，Turnstile 正在检查用户环境！'));
      return;
    }
    setDisableButton(true);
    setLoading(true);
    try {
      const res = await API.get(
        `/api/reset_password?email=${email}&turnstile=${turnstileToken}`,
      );
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('重置邮件发送成功，请检查邮箱！'));
        setEmail('');
      } else {
        showError(normalizeEmailDeliveryMessage(message, t));
      }
    } catch (error) {
      showError(t('请求失败'));
    } finally {
      setLoading(false);
    }
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
            <h1 className='auth-portal-title'>{t('密码重置')}</h1>
            <p className='auth-portal-subtitle'>{t('输入邮箱地址，我们会向您发送密码重置链接。')}</p>
          </div>
          <div className='auth-portal-stack'>
            <div className='auth-portal-field'>
              <AuthTextField
                className='auth-portal-input'
                placeholder={t('请输入您的邮箱地址')}
                prefixIcon={<IconMail />}
                value={email}
                onChange={setEmail}
              />
            </div>
            <div className='auth-portal-note'>
              {t('提交后请检查邮箱收件箱和垃圾邮件目录。')}
            </div>
            <AuthButton
              className='auth-portal-primary-btn'
              disabled={disableButton}
              loading={loading}
              onClick={handleSubmit}
            >
              {disableButton ? `${t('继续')} (${countdown})` : t('继续')}
            </AuthButton>
          </div>
          <div className='auth-portal-footer-row' style={{ marginTop: 20, textAlign: 'center' }}>
            <span>{t('返回登录')} </span>
            <Link className='auth-portal-footer-link' to='/login'>
              {t('登录')}
            </Link>
          </div>
          {turnstileEnabled && (
            <div className='auth-portal-turnstile-wrap'>
              <Turnstile sitekey={turnstileSiteKey} onVerify={(token) => setTurnstileToken(token)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordResetForm;
