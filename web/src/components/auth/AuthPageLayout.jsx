import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPageLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isLogin = location.pathname === '/login';

  const handleTabClick = (path, e) => {
    e.preventDefault();
    navigate(path, { replace: true });
  };

  return (
    <div className='auth-portal-page'>
      <div className='auth-portal-noise' aria-hidden='true' />
      <div className='auth-portal-aurora' aria-hidden='true'>
        <div className='auth-portal-aurora-1' />
        <div className='auth-portal-aurora-2' />
        <div className='auth-portal-aurora-3' />
      </div>

      <div className='auth-portal-shell'>
        <div className='auth-portal-card'>
          <div className='auth-portal-header'>
            <h1 className='auth-portal-title'>
              {isLogin ? t('欢迎回来') : t('注册新账号')}
            </h1>
            <p className='auth-portal-subtitle'>
              {isLogin ? t('请登录您的系统控制台账号') : t('创建您的系统控制台账号')}
            </p>
          </div>

          <div className='auth-portal-tabs' data-active={isLogin ? 'login' : 'register'}>
            <div className='auth-portal-tab-indicator' />
            <Link
              to='/login'
              className={`auth-portal-tab ${isLogin ? 'active' : ''}`}
              onClick={(e) => handleTabClick('/login', e)}
            >
              {t('登 录')}
            </Link>
            <Link
              to='/register'
              className={`auth-portal-tab ${!isLogin ? 'active' : ''}`}
              onClick={(e) => handleTabClick('/register', e)}
            >
              {t('注 册')}
            </Link>
          </div>

          <div className='auth-views-container'>
            <div className={`auth-view-wrapper ${isLogin ? 'auth-view-login-active active' : 'auth-view-login-inactive'}`}>
              <LoginForm />
            </div>
            <div className={`auth-view-wrapper ${!isLogin ? 'auth-view-register-active active' : 'auth-view-register-inactive'}`}>
              <RegisterForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPageLayout;
