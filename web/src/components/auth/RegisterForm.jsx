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

import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Divider, Modal, Toast } from '@douyinfe/semi-ui';
import { API, showError, showInfo, showSuccess, onGitHubOAuthClicked } from '../../helpers';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';
import { useTranslation } from 'react-i18next';
import { AuthPasswordField, AuthTextField } from './AuthFormControls';
import WeChatIcon from '../common/logo/WeChatIcon';
import { AuthCheckbox } from './AuthCheckbox';
import { UserIcon, LockIcon, EmailIcon, CodeIcon } from './AuthIcons';
import { AuthMainButton } from './AuthButton';

const USERNAME_RULE_TEXT = '用户名长度至少6位，只能包含字母、数字、下划线(_)和短横线(-)，不能包含中文或特殊符号。';

function isValidUsername(username) {
  // Min 6 chars, only letters/digits/underscore/hyphen, no Chinese or special punctuation
  return /^[a-zA-Z0-9_-]{6,}$/.test(username);
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

const RegisterForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userState, userDispatch] = useContext(UserContext);
  const [statusState] = useContext(StatusContext);
  const { status = {} } = statusState;

  const [inputs, setInputs] = useState({
    username: '',
    password: '',
    password2: '',
    email: '',
    verification_code: '',
    wechat_verification_code: '',
  });

  const [registerLoading, setRegisterLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [verificationCodeLoading, setVerificationCodeLoading] = useState(false);
  const [wechatCodeSubmitLoading, setWechatCodeSubmitLoading] = useState(false);
  const [showWeChatLoginModal, setShowWeChatLoginModal] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const githubTimeoutRef = useRef(null);
  const [githubButtonDisabled, setGithubButtonDisabled] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const turnstileEnabled = status.turnstile_check;
  const showEmailVerification = status.email_verification;
  const canUsePasswordRegister = status.register_enabled;

  const hasUserAgreement = Boolean(status.user_agreement);
  const hasPrivacyPolicy = Boolean(status.privacy_policy);
  const hasOAuthRegisterOptions = status.wechat_login || status.github_oauth || status.telegram_oauth;

  let affCode = new URLSearchParams(window.location.search).get('aff');
  if (affCode) localStorage.setItem('aff', affCode);

  useEffect(() => {
    let timer;
    if (disableButton) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setDisableButton(false);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [disableButton]);

  useEffect(
    () => () => githubTimeoutRef.current && clearTimeout(githubTimeoutRef.current),
    [],
  );

  function ensureTermsAccepted() {
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showInfo('请先阅读并同意用户协议和隐私政策');
      return false;
    }
    return true;
  }

  function validateEmail(email) {
    const raw = String(email || '').trim();
    if (!raw) return (showInfo('请输入邮箱地址'), false);
    if (!raw.includes('@')) return (showInfo('请输入正确的邮箱地址'), false);
    return true;
  }

  async function handleSubmit() {
    if (showEmailVerification) {
      if (!validateEmail(inputs.email)) return;
      if (!String(inputs.verification_code || '').trim()) return void showInfo('请输入邮箱验证码');
    }
    const normalized = normalizeUsername(inputs.username);
    if (!normalized) return void showInfo('请输入账号');
    if (!isValidUsername(normalized)) return void showInfo(t(USERNAME_RULE_TEXT));
    if (inputs.password.length < 8) return void showInfo('密码长度至少 8 个字符');
    if (inputs.password !== inputs.password2) return void showInfo('两次输入的密码不一致');
    if (!ensureTermsAccepted()) return;

    setRegisterLoading(true);
    try {
      if (!affCode) affCode = localStorage.getItem('aff');
      const res = await API.post(
        `/api/user/register${turnstileEnabled ? `?turnstile=${turnstileToken}` : ''}`,
        { ...inputs, username: normalized, aff_code: affCode },
      );
      const { success, message } = res.data;
      if (success) {
        navigate('/login');
        showSuccess(message || '注册成功，请登录');
      } else {
        showError(message);
      }
    } catch {
      showError('请求失败');
    } finally {
      setRegisterLoading(false);
    }
  }

  async function sendVerificationCode() {
    if (!validateEmail(inputs.email)) return;
    if (turnstileEnabled && !turnstileToken) return void showInfo('请稍后几秒重试，Turnstile 正在检查用户环境');
    setVerificationCodeLoading(true);
    try {
      const res = await API.get(
        `/api/verification?email=${encodeURIComponent(inputs.email)}${turnstileEnabled ? `&turnstile=${turnstileToken}` : ''}`,
      );
      const { success, message } = res.data;
      if (success) {
        Toast.info({
          content: message || '验证码已发送！如未收到，请检查邮件垃圾箱或广告邮件分类。',
          duration: 60,
          showClose: true,
        });
        setDisableButton(true);
      } else showError(message);
    } catch {
      showError('请求失败');
    } finally {
      setVerificationCodeLoading(false);
    }
  }

  const handleGitHubClick = () => {
    if (!ensureTermsAccepted() || githubButtonDisabled) return;
    setGithubLoading(true);
    setGithubButtonDisabled(true);
    if (githubTimeoutRef.current) clearTimeout(githubTimeoutRef.current);
    githubTimeoutRef.current = setTimeout(() => {
      setGithubLoading(false);
      setGithubButtonDisabled(false);
    }, 20000);
    try {
      onGitHubOAuthClicked(status.github_client_id, { shouldLogout: true });
    } finally {
      setTimeout(() => setGithubLoading(false), 3000);
    }
  };

  return (
    <form className='auth-portal-register-form' onSubmit={(e) => e.preventDefault()}>
      {canUsePasswordRegister ? (
        <div className='auth-portal-stack'>
          <div className='auth-portal-field animated-item'>
            <AuthTextField
              autoComplete='username'
              placeholder={t('用户名')}
              value={inputs.username}
              onChange={(value) => setInputs({ ...inputs, username: value })}
              prefixIcon={<UserIcon />}
            />
          </div>

          {showEmailVerification && (
            <div className='auth-portal-field animated-item'>
              <AuthTextField
                autoComplete='email'
                placeholder={t('邮箱地址')}
                value={inputs.email}
                onChange={(value) => setInputs({ ...inputs, email: value })}
                prefixIcon={<EmailIcon />}
              />
            </div>
          )}

          {showEmailVerification && (
            <div className='auth-portal-field animated-item'>
              <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
                <AuthTextField
                  placeholder={t('验证码')}
                  value={inputs.verification_code}
                  onChange={(value) => setInputs({ ...inputs, verification_code: value })}
                  prefixIcon={<CodeIcon />}
                />
                <button
                  className='btn-get-code'
                  type='button'
                  onClick={sendVerificationCode}
                  disabled={disableButton}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
                >
                  {disableButton ? `${countdown}s` : t('获取验证码')}
                </button>
              </div>
            </div>
          )}

          <div className='auth-portal-field animated-item'>
            <AuthPasswordField
              autoComplete='new-password'
              placeholder={t('设置密码')}
              value={inputs.password}
              onChange={(value) => setInputs({ ...inputs, password: value })}
              prefixIcon={<LockIcon />}
            />
          </div>

          <div className='auth-portal-field animated-item'>
            <AuthPasswordField
              autoComplete='new-password'
              placeholder={t('确认密码')}
              value={inputs.password2}
              onChange={(value) => setInputs({ ...inputs, password2: value })}
              prefixIcon={<LockIcon />}
            />
          </div>

          {(hasUserAgreement || hasPrivacyPolicy) && (
            <AuthCheckbox
              id='reg-terms'
              checked={agreedToTerms}
              onChange={(checked) => setAgreedToTerms(checked)}
              className='animated-item'
            >
              <span>
                {'阅读并同意 '}
                {hasUserAgreement && (
                  <a className='link' href='/user-agreement' rel='noopener noreferrer' target='_blank'>
                    服务条款
                  </a>
                )}
                {hasUserAgreement && hasPrivacyPolicy ? ' & ' : null}
                {hasPrivacyPolicy && (
                  <a className='link' href='/privacy-policy' rel='noopener noreferrer' target='_blank'>
                    隐私政策
                  </a>
                )}
              </span>
            </AuthCheckbox>
          )}

          <div className='animated-item'>
            <AuthMainButton onClick={handleSubmit} loading={registerLoading}>
              {t('创 建 账 号')}
            </AuthMainButton>
          </div>

          {hasOAuthRegisterOptions && (
            <>
              <Divider align='center' className='auth-portal-divider animated-item'>
                {t('其他方式注册')}
              </Divider>
              <div className='auth-quick-icons animated-item'>
                {status.wechat_login && (
                  <button
                    className='auth-quick-icon-btn wechat'
                    title='微信'
                    type='button'
                    onClick={() => {
                      if (!ensureTermsAccepted()) return;
                      setShowWeChatLoginModal(true);
                    }}
                  >
                    <WeChatIcon />
                  </button>
                )}
                {status.github_oauth && (
                  <button
                    className='auth-quick-icon-btn github'
                    disabled={githubButtonDisabled || githubLoading}
                    title='GitHub'
                    type='button'
                    onClick={handleGitHubClick}
                  >
                    <svg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                      <path
                        d='M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z'
                        fill='currentColor'
                      />
                    </svg>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className='auth-portal-stack'>
          <div className='auth-portal-note' style={{ textAlign: 'center' }}>
            {t('注册功能暂未开放')}
          </div>
        </div>
      )}

      {showWeChatLoginModal && (
        <Modal
          centered
          keepDOM={false}
          maskClosable
          motion={false}
          okButtonProps={{ loading: wechatCodeSubmitLoading }}
          okText='登录'
          onCancel={() => setShowWeChatLoginModal(false)}
          title='微信扫码登录'
          visible={showWeChatLoginModal}
        >
          <div className='flex flex-col items-center'>
            <img alt='wechat-qrcode' className='mb-4' src={status.wechat_qrcode} />
          </div>
        </Modal>
      )}
    </form>
  );
};

export default RegisterForm;
