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

import HeaderBar from './headerbar';
import { Layout } from '@douyinfe/semi-ui';
import SiderBar from './SiderBar';
import App from '../../App';
import FooterBar from './Footer';
import UserGroupWelcomeOverlay from './UserGroupWelcomeOverlay';
import HomeNoticeModal from './HomeNoticeModal';
import { ToastContainer } from 'react-toastify';
import React, { useContext, useEffect, useState } from 'react';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { useSidebarCollapsed } from '../../hooks/common/useSidebarCollapsed';
import { useTranslation } from 'react-i18next';
import {
  API,
  applySiteBranding,
  showError,
  setStatusData,
} from '../../helpers';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';
import { useLocation } from 'react-router-dom';
import { normalizeLanguage } from '../../i18n/language';
const { Sider, Content, Header } = Layout;

const PageLayout = () => {
  const [userState, userDispatch] = useContext(UserContext);
  const [statusState, statusDispatch] = useContext(StatusContext);
  const isMobile = useIsMobile();
  const [collapsed, , setCollapsed] = useSidebarCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { i18n } = useTranslation();
  const location = useLocation();

  const cardProPages = [
    '/console/channel',
    '/console/log',
    '/console/redemption',
    '/console/user',
    '/console/token',
    '/console/midjourney',
    '/console/task',
    '/console/models',
    '/pricing',
    '/console/playground',
    '/console/drawing',
  ];

  const shouldHideFooter = cardProPages.includes(location.pathname);

  const shouldInnerPadding =
    location.pathname.includes('/console') &&
    !location.pathname.startsWith('/console/chat') &&
    location.pathname !== '/console/playground' &&
    location.pathname !== '/console/drawing';

  const isConsoleRoute = location.pathname.startsWith('/console');
  const isDrawingPage = location.pathname === '/console/drawing';
  const flatConsolePagePaths = [
    '/console',
    '/console/token',
    '/console/log',
    '/console/channel',
    '/console/subscription',
    '/console/redemption',
    '/console/user',
    '/console/setting',
    '/console/group_monitor',
    '/console/topup',
    '/console/member_upgrade',
    '/console/affiliate',
    '/console/personal',
    '/console/drawing',
  ];
  const isFlatConsolePage = flatConsolePagePaths.includes(location.pathname);
  const shouldLowerFlatConsoleContent = isFlatConsolePage && !isDrawingPage;
  const showSider = isConsoleRoute && (!isMobile || drawerOpen);

  useEffect(() => {
    if (isMobile && drawerOpen && collapsed) {
      setCollapsed(false);
    }
  }, [isMobile, drawerOpen, collapsed, setCollapsed]);

  const loadUser = () => {
    let user = localStorage.getItem('user');
    if (user) {
      let data = JSON.parse(user);
      userDispatch({ type: 'login', payload: data });
    }
  };

  const loadStatus = async () => {
    try {
      const res = await API.get('/api/status');
      const { success, data } = res.data;
      if (success) {
        statusDispatch({ type: 'set', payload: data });
        setStatusData(data);
      } else {
        showError('Unable to connect to server');
      }
    } catch (error) {
      showError('Failed to load status');
    }
  };

  useEffect(() => {
    loadUser();
    loadStatus().catch(console.error);
    applySiteBranding();
  }, []);

  useEffect(() => {
    let preferredLang;

    if (userState?.user?.setting) {
      try {
        const settings = JSON.parse(userState.user.setting);
        preferredLang = normalizeLanguage(settings.language);
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (!preferredLang) {
      const savedLang = localStorage.getItem('i18nextLng');
      if (savedLang) {
        preferredLang = normalizeLanguage(savedLang);
      }
    }

    if (preferredLang) {
      localStorage.setItem('i18nextLng', preferredLang);
      if (preferredLang !== i18n.language) {
        i18n.changeLanguage(preferredLang);
      }
    }
  }, [i18n, userState?.user?.setting]);

  const isPlayground = location.pathname === '/console/playground';

  // 首页有自定义HTML时，隐藏系统导航栏和Footer
  const isHomePage = location.pathname === '/';
  const hasCustomHomepage = !!window.__HOME_PAGE_CONTENT__?.trim();
  const shouldHideChrome = isHomePage && hasCustomHomepage;
  const contentPadding = shouldInnerPadding
    ? isMobile
      ? `calc(var(--header-height, 60px) + ${shouldLowerFlatConsoleContent ? 10 : 2}px) 5px 5px`
      : `calc(var(--header-height, 60px) + ${shouldLowerFlatConsoleContent ? 12 : 2}px) 24px 24px`
    : shouldHideChrome
      ? '0'
      : 'calc(var(--header-height, 60px) + 2px) 0 0';

  return (
    <Layout
      className='app-layout'
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: isMobile && !isPlayground ? 'visible' : 'hidden',
      }}
    >
      {!shouldHideChrome && (
        <Header
          style={{
            padding: 0,
            height: 'auto',
            lineHeight: 'normal',
            position: 'fixed',
            width: '100%',
            top: 0,
            zIndex: 100,
          }}
        >
          <HeaderBar
            onMobileMenuToggle={() => setDrawerOpen((prev) => !prev)}
            drawerOpen={drawerOpen}
          />
        </Header>
      )}
      <Layout
        style={{
          overflow: isMobile && !isPlayground ? 'visible' : 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {showSider && (
          <>
            {/* 手机端遮罩层 */}
            {isMobile && drawerOpen && (
              <div
                className='app-mobile-sider-mask'
                onClick={() => setDrawerOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(255, 255, 255, 0.34)',
                  backdropFilter: 'blur(10px) saturate(125%)',
                  WebkitBackdropFilter: 'blur(10px) saturate(125%)',
                  zIndex: 98,
                }}
              />
            )}
            <Sider
              className='app-sider'
              style={{
                position: 'fixed',
                left: 0,
                top: 'var(--header-height, 60px)',
                height: 'calc(100dvh - var(--header-height, 60px))',
                zIndex: 99,
                border: 'none',
                paddingRight: '0',
                width: 'var(--sidebar-current-width)',
                background: '#fff',
                borderRight: '1px solid #e5e7eb',
                boxShadow: 'none',
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'none',
              }}
            >
              <SiderBar
                onNavigate={() => {
                  if (isMobile) setDrawerOpen(false);
                }}
              />
            </Sider>
          </>
        )}
        <Layout
          style={{
            marginLeft: isMobile
              ? '0'
              : showSider
                ? 'var(--sidebar-current-width)'
                : '0',
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Content
            className={isFlatConsolePage ? 'flat-console-content' : undefined}
            data-console-page={isFlatConsolePage ? location.pathname : undefined}
            style={{
              flex: '1 0 auto',
              overflowY: isMobile && !isPlayground ? 'visible' : 'hidden',
              WebkitOverflowScrolling: 'touch',
              padding: isDrawingPage
                ? 'calc(var(--header-height, 60px) + 2px) 0 0'
                : contentPadding,
              position: 'relative',
              background: '#f1f5f9',
            }}
          >
            <App />
          </Content>
          {!shouldHideFooter && !shouldHideChrome && (
            <Layout.Footer
              style={{
                flex: '0 0 auto',
                width: '100%',
              }}
            >
              <FooterBar />
            </Layout.Footer>
          )}
        </Layout>
      </Layout>
      <UserGroupWelcomeOverlay
        isConsoleRoute={isConsoleRoute}
        user={userState?.user}
        status={statusState?.status}
      />
      <HomeNoticeModal />
      <ToastContainer />
    </Layout>
  );
};

export default PageLayout;
