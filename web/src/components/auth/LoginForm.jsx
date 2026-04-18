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

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';
import {
  API,
  showError,
  showInfo,
  showSuccess,
  updateAPI,
  getSystemName,
  getOAuthProviderIcon,
  setUserData,
  onGitHubOAuthClicked,
  onDiscordOAuthClicked,
  onOIDCClicked,
  onLinuxDOOAuthClicked,
  onQQOAuthClicked,
  onCustomOAuthClicked,
  prepareCredentialRequestOptions,
  buildAssertionResult,
  isPasskeySupported,
} from '../../helpers';
import Turnstile from 'react-turnstile';
import { Divider, Input, Modal } from '@douyinfe/semi-ui';
import { AuthCheckbox } from './AuthCheckbox';
import { AuthButton, AuthPasswordField, AuthTextField } from './AuthFormControls';
import { UserIcon, LockIcon } from './AuthIcons';
import TelegramLoginButton from 'react-telegram-login';
import OIDCIcon from '../common/logo/OIDCIcon';
import WeChatIcon from '../common/logo/WeChatIcon';
import LinuxDoIcon from '../common/logo/LinuxDoIcon';
import TwoFAVerification from './TwoFAVerification';
import { useTranslation } from 'react-i18next';
import { SiDiscord } from 'react-icons/si';
import { FaQq, FaGithub } from 'react-icons/fa';
import { ArrowRight, KeyRound } from 'lucide-react';

const LoginForm = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [inputs, setInputs] = useState({
    username: '',
    password: '',
    wechat_verification_code: '',
  });
  const { username, password } = inputs;
  const [searchParams] = useSearchParams();
  const [, userDispatch] = useContext(UserContext);
  const [statusState] = useContext(StatusContext);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [showWeChatLoginModal, setShowWeChatLoginModal] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [qqLoading, setQQLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [oidcLoading, setOidcLoading] = useState(false);
  const [linuxdoLoading, setLinuxdoLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [wechatCodeSubmitLoading, setWechatCodeSubmitLoading] = useState(false);
  const [showTwoFA, setShowTwoFA] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasUserAgreement, setHasUserAgreement] = useState(false);
  const [hasPrivacyPolicy, setHasPrivacyPolicy] = useState(false);
  const [githubButtonDisabled, setGithubButtonDisabled] = useState(false);
  const [customOAuthLoading, setCustomOAuthLoading] = useState({});
  const githubTimeoutRef = useRef(null);
  const expiredHandledRef = useRef(false);

  const status = useMemo(() => {
    if (statusState?.status) return statusState.status;
    const savedStatus = localStorage.getItem('status');
    if (!savedStatus) return {};
    try {
      return JSON.parse(savedStatus) || {};
    } catch (err) {
      return {};
    }
  }, [statusState?.status]);

  const hasCustomOAuthProviders = (status.custom_oauth_providers || []).length > 0;
  const hasOAuthLoginOptions = Boolean(
    status.github_oauth ||
    status.qq_oauth ||
    status.discord_oauth ||
    status.oidc_enabled ||
    status.wechat_login ||
    status.linuxdo_oauth ||
    status.telegram_oauth ||
    hasCustomOAuthProviders,
  );
  const hasOtherLoginOptions = hasOAuthLoginOptions || status.passkey_login;

  useEffect(() => {
    if (status?.turnstile_check) {
      setTurnstileEnabled(true);
      setTurnstileSiteKey(status.turnstile_site_key);
    }
    setHasUserAgreement(status?.user_agreement_enabled || false);
    setHasPrivacyPolicy(status?.privacy_policy_enabled || false);
  }, [status]);

  useEffect(() => {
    isPasskeySupported()
      .then(setPasskeySupported)
      .catch(() => setPasskeySupported(false));
    return () => {
      if (githubTimeoutRef.current) clearTimeout(githubTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (searchParams.get('expired')) {
      if (expiredHandledRef.current) {
        return;
      }
      expiredHandledRef.current = true;
      localStorage.removeItem('user');
      API.get('/api/user/logout', {
        skipErrorHandler: true,
        disableDuplicate: true,
      }).catch(() => {});
      showError(t('未登录或登录已过期，请重新登录'));
    }
  }, [searchParams, t]);

  const getPostLoginRedirect = () => {
    const redirect = searchParams.get('redirect');
    if (!redirect || !redirect.startsWith('/')) {
      return '/console';
    }
    return redirect;
  };

  const ensureTermsAccepted = () => {
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showInfo(t('请先阅读并同意用户协议和隐私政策'));
      return false;
    }
    return true;
  };

  const completeLogin = (data, redirectTo = getPostLoginRedirect()) => {
    userDispatch({ type: 'login', payload: data });
    localStorage.setItem('user', JSON.stringify(data));
    setUserData(data);
    updateAPI();
    showSuccess(t('登录成功！'));
    navigate(redirectTo, { replace: true });
  };

  const handle2FASuccess = (data) => {
    setUserData(data);
    updateAPI();
    userDispatch({ type: 'login', payload: data });
    navigate(getPostLoginRedirect(), { replace: true });
  };

  const handleChange = (name, value) => {
    setInputs((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!ensureTermsAccepted()) return;
    if (turnstileEnabled && turnstileToken === '') {
      showInfo(t('请稍后几秒重试，Turnstile 正在检查用户环境！'));
      return;
    }
    if (!username) {
      showError(t('请输入您的用户名或邮箱地址'));
      return;
    }
    if (!password) {
      showError(t('请输入您的密码'));
      return;
    }
    setLoginLoading(true);
    try {
      const res = await API.post(`/api/user/login?turnstile=${turnstileToken}`, { username, password });
      const { success, message, data } = res.data;
      if (success) {
        if (data?.require_2fa) {
          setShowTwoFA(true);
          return;
        }
        completeLogin(data);
        if (username === 'root' && password === '123456') {
          Modal.error({
            title: t('您正在使用默认密码！'),
            content: t('请立即修改默认密码！'),
            centered: true,
          });
        }
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('登录失败，请重试'));
    } finally {
      setLoginLoading(false);
    }
  };

  const onWeChatLoginClicked = () => {
    if (!ensureTermsAccepted()) return;
    setWechatLoading(true);
    setShowWeChatLoginModal(true);
    setWechatLoading(false);
  };

  const onSubmitWeChatVerificationCode = async () => {
    if (turnstileEnabled && turnstileToken === '') {
      showInfo(t('请稍后几秒重试，Turnstile 正在检查用户环境！'));
      return;
    }
    setWechatCodeSubmitLoading(true);
    try {
      const res = await API.get(`/api/oauth/wechat?code=${inputs.wechat_verification_code}`);
      const { success, message, data } = res.data;
      if (success) {
        completeLogin(data, '/');
        setShowWeChatLoginModal(false);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('登录失败，请重试'));
    } finally {
      setWechatCodeSubmitLoading(false);
    }
  };

  const onTelegramLoginClicked = async (response) => {
    if (!ensureTermsAccepted()) return;
    const fields = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date', 'hash', 'lang'];
    const params = {};
    fields.forEach((field) => {
      if (response[field]) params[field] = response[field];
    });
    try {
      const res = await API.get('/api/oauth/telegram/login', { params });
      const { success, message, data } = res.data;
      if (success) {
        completeLogin(data, '/');
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('登录失败，请重试'));
    }
  };

  const handleGitHubClick = () => {
    if (!ensureTermsAccepted() || githubButtonDisabled) return;
    setGithubLoading(true);
    setGithubButtonDisabled(true);
    if (githubTimeoutRef.current) clearTimeout(githubTimeoutRef.current);
    githubTimeoutRef.current = setTimeout(() => {
      setGithubLoading(false);
      setGithubButtonDisabled(true);
    }, 20000);
    try {
      onGitHubOAuthClicked(status.github_client_id, { shouldLogout: true });
    } finally {
      setTimeout(() => setGithubLoading(false), 3000);
    }
  };

  const handleDiscordClick = () => {
    if (!ensureTermsAccepted()) return;
    setDiscordLoading(true);
    try {
      onDiscordOAuthClicked(status.discord_client_id, { shouldLogout: true });
    } finally {
      setTimeout(() => setDiscordLoading(false), 3000);
    }
  };

  const handleQQClick = () => {
    if (!ensureTermsAccepted()) return;
    setQQLoading(true);
    try {
      onQQOAuthClicked(status.qq_client_id, status.qq_oauth_base_url, { shouldLogout: true });
    } finally {
      setTimeout(() => setQQLoading(false), 3000);
    }
  };

  const handleOIDCClick = () => {
    if (!ensureTermsAccepted()) return;
    setOidcLoading(true);
    try {
      onOIDCClicked(status.oidc_authorization_endpoint, status.oidc_client_id, false, { shouldLogout: true });
    } finally {
      setTimeout(() => setOidcLoading(false), 3000);
    }
  };

  const handleLinuxDOClick = () => {
    if (!ensureTermsAccepted()) return;
    setLinuxdoLoading(true);
    try {
      onLinuxDOOAuthClicked(status.linuxdo_client_id, { shouldLogout: true });
    } finally {
      setTimeout(() => setLinuxdoLoading(false), 3000);
    }
  };

  const handleCustomOAuthClick = (provider) => {
    if (!ensureTermsAccepted()) return;
    setCustomOAuthLoading((prev) => ({ ...prev, [provider.slug]: true }));
    try {
      onCustomOAuthClicked(provider, { shouldLogout: true });
    } finally {
      setTimeout(() => {
        setCustomOAuthLoading((prev) => ({ ...prev, [provider.slug]: false }));
      }, 3000);
    }
  };

  const handlePasskeyClick = async () => {
    if (!ensureTermsAccepted()) return;
    if (!status.passkey_login) return;
    if (!passkeySupported || !window.PublicKeyCredential) {
      showInfo(t('当前设备不支持 Passkey'));
      return;
    }
    setPasskeyLoading(true);
    try {
      const beginRes = await API.post('/api/user/passkey/login/begin');
      if (!beginRes.data?.success) {
        showError(beginRes.data?.message || t('登录失败，请重试'));
        return;
      }
      const publicKey = prepareCredentialRequestOptions(beginRes.data?.data?.options);
      const credential = await navigator.credentials.get({ publicKey });
      if (!credential) {
        showError(t('登录失败，请重试'));
        return;
      }
      const finishRes = await API.post('/api/user/passkey/login/finish', buildAssertionResult(credential));
      if (finishRes.data?.success) {
        completeLogin(finishRes.data.data);
      } else {
        showError(finishRes.data?.message || t('登录失败，请重试'));
      }
    } catch (error) {
      if (error?.name === 'NotAllowedError') {
        showInfo(t('已取消 Passkey 注册'));
      } else {
        showError(error?.message || t('登录失败，请重试'));
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  if (showTwoFA) {
    return (
      <TwoFAVerification isModal onBack={() => setShowTwoFA(false)} onSuccess={handle2FASuccess} />
    );
  }

  return (
    <>
      <form className='auth-portal-login-form' onSubmit={(e) => e.preventDefault()}>
        <div className='auth-portal-stack'>
          <div className='auth-portal-field animated-item'>
            <AuthTextField
              autoComplete='username'
              placeholder={t('用户名/邮箱')}
              value={username}
              onChange={(value) => handleChange('username', value)}
              prefixIcon={<UserIcon />}
            />
          </div>

          <div className='auth-portal-field animated-item'>
            <AuthPasswordField
              autoComplete='current-password'
              placeholder={t('密码')}
              value={password}
              onChange={(value) => handleChange('password', value)}
              onEnterPress={handleSubmit}
              prefixIcon={<LockIcon />}
            />
          </div>

          <div className='auth-actions-row animated-item'>
            {(hasUserAgreement || hasPrivacyPolicy) ? (
              <AuthCheckbox id='login-terms' checked={agreedToTerms} onChange={(checked) => setAgreedToTerms(checked)}>
                <span>
                  {t('阅读并同意')}{' '}
                  {hasUserAgreement ? (
                    <a className='link' href='/user-agreement' rel='noopener noreferrer' target='_blank'>
                      {t('服务条款')}
                    </a>
                  ) : null}
                  {hasUserAgreement && hasPrivacyPolicy ? ' & ' : null}
                  {hasPrivacyPolicy ? (
                    <a className='link' href='/privacy-policy' rel='noopener noreferrer' target='_blank'>
                      {t('隐私政策')}
                    </a>
                  ) : null}
                </span>
              </AuthCheckbox>
            ) : (
              <span />
            )}
            <Link className='auth-forgot-link' to='/reset'>
              {t('忘记密码？')}
            </Link>
          </div>

          <div className='animated-item'>
            <AuthButton
              className='auth-portal-primary-btn'
              loading={loginLoading}
              rightIcon={<ArrowRight size={18} strokeWidth={2} />}
              onClick={handleSubmit}
            >
              {t('登 录')}
            </AuthButton>
          </div>

          {hasOtherLoginOptions && (
            <>
              <Divider align='center' className='auth-portal-divider animated-item'>
                {t('其他方式登录')}
              </Divider>

              <div className='auth-quick-icons animated-item'>
                {status.wechat_login && (
                  <button
                    className='auth-quick-icon-btn wechat'
                    disabled={wechatLoading}
                    title={t('微信登录')}
                    type='button'
                    onClick={onWeChatLoginClicked}
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
                    <FaGithub style={{ width: 22, height: 22 }} />
                  </button>
                )}

                {status.qq_oauth && (
                  <button
                    className='auth-quick-icon-btn qq'
                    disabled={qqLoading}
                    title='QQ'
                    type='button'
                    onClick={handleQQClick}
                  >
                    <FaQq style={{ width: 22, height: 22 }} />
                  </button>
                )}

                {status.discord_oauth && (
                  <button
                    className='auth-quick-icon-btn discord'
                    disabled={discordLoading}
                    title='Discord'
                    type='button'
                    onClick={handleDiscordClick}
                  >
                    <SiDiscord style={{ width: 22, height: 22 }} />
                  </button>
                )}

                {status.oidc_enabled && (
                  <button
                    className='auth-quick-icon-btn'
                    disabled={oidcLoading}
                    title='OIDC'
                    type='button'
                    onClick={handleOIDCClick}
                  >
                    <OIDCIcon style={{ width: 22, height: 22 }} />
                  </button>
                )}

                {status.linuxdo_oauth && (
                  <button
                    className='auth-quick-icon-btn'
                    disabled={linuxdoLoading}
                    title='LinuxDO'
                    type='button'
                    onClick={handleLinuxDOClick}
                  >
                    <LinuxDoIcon style={{ width: 22, height: 22 }} />
                  </button>
                )}

                {status.custom_oauth_providers?.map((provider) => (
                  <button
                    key={provider.slug}
                    className='auth-quick-icon-btn'
                    disabled={customOAuthLoading[provider.slug]}
                    title={provider.name}
                    type='button'
                    onClick={() => handleCustomOAuthClick(provider)}
                  >
                    {getOAuthProviderIcon(provider.icon || '', 22)}
                  </button>
                ))}

                {status.passkey_login && passkeySupported && (
                  <button
                    className='auth-quick-icon-btn passkey'
                    disabled={passkeyLoading}
                    title='Passkey'
                    type='button'
                    onClick={handlePasskeyClick}
                  >
                    <KeyRound size={22} strokeWidth={2.2} />
                  </button>
                )}
              </div>

              {status.telegram_oauth && (
                <div className='auth-portal-telegram animated-item'>
                  <TelegramLoginButton botName={status.telegram_bot_name} dataOnauth={onTelegramLoginClicked} />
                </div>
              )}
            </>
          )}

          {turnstileEnabled && (
            <div className='auth-portal-turnstile-wrap animated-item'>
              <Turnstile sitekey={turnstileSiteKey} onVerify={(token) => setTurnstileToken(token)} />
            </div>
          )}
        </div>
      </form>

      {showWeChatLoginModal && (
        <Modal
          centered
          keepDOM={false}
          maskClosable
          motion={false}
          okButtonProps={{ loading: wechatCodeSubmitLoading }}
          okText={t('登录')}
          onCancel={() => setShowWeChatLoginModal(false)}
          onOk={onSubmitWeChatVerificationCode}
          title={t('微信扫码登录')}
          visible={showWeChatLoginModal}
        >
          <div className='flex flex-col items-center'>
            <img alt='wechat-qrcode' className='mb-4' src={status.wechat_qrcode} />
          </div>
          <div className='text-center mb-4'>
            <p>{t('微信扫码关注公众号，输入「验证码」获取验证码（三分钟内有效）')}</p>
          </div>
          <div className='auth-portal-field'>
            <div className='auth-portal-field-label'>{t('验证码')}</div>
            <Input
              className='auth-portal-input'
              placeholder={t('请输入验证码')}
              value={inputs.wechat_verification_code}
              onChange={(value) => handleChange('wechat_verification_code', value)}
            />
          </div>
        </Modal>
      )}
    </>
  );
};

export default LoginForm;
