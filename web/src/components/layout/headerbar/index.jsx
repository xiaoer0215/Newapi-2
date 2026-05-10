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

import React from 'react';
import { useHeaderBar } from '../../../hooks/common/useHeaderBar';
import { useNotifications } from '../../../hooks/common/useNotifications';
import { useNavigation } from '../../../hooks/common/useNavigation';
import NoticeModal from '../NoticeModal';
import MobileMenuButton from './MobileMenuButton';
import HeaderLogo from './HeaderLogo';
import Navigation from './Navigation';
import ActionButtons from './ActionButtons';

const HeaderBar = ({ onMobileMenuToggle, drawerOpen }) => {
  const {
    userState,
    statusState,
    isMobile,
    collapsed,
    logoLoaded,
    currentLang,
    isLoading,
    systemName,
    logo,
    isNewYear,
    isSelfUseMode,
    docsLink,
    isDemoSiteMode,
    isConsoleRoute,
    headerNavModules,
    pricingRequireAuth,
    logout,
    handleLanguageChange,
    handleMobileMenuToggle,
    navigate,
    t,
  } = useHeaderBar({ onMobileMenuToggle, drawerOpen });

  const {
    noticeVisible,
    unreadCount,
    latestAnnouncementKey,
    isLatestAnnouncementUnread,
    handleNoticeOpen,
    handleNoticeClose,
    handleLatestAnnouncementClose,
    getUnreadKeys,
  } = useNotifications(statusState);

  const { mainNavLinks } = useNavigation(t, docsLink, headerNavModules);
  const autoOpenedConsoleNoticeRef = React.useRef('');
  const hasSystemAnnouncements =
    (statusState?.status?.announcements || []).length > 0;
  const isExactConsoleRoute = window.location.pathname === '/console';

  React.useEffect(() => {
    if (
      isExactConsoleRoute &&
      hasSystemAnnouncements &&
      latestAnnouncementKey &&
      isLatestAnnouncementUnread &&
      !noticeVisible &&
      autoOpenedConsoleNoticeRef.current !== latestAnnouncementKey
    ) {
      autoOpenedConsoleNoticeRef.current = latestAnnouncementKey;
      handleNoticeOpen();
    }
  }, [
    isExactConsoleRoute,
    hasSystemAnnouncements,
    latestAnnouncementKey,
    isLatestAnnouncementUnread,
    noticeVisible,
    handleNoticeOpen,
  ]);

  return (
    <header
      className='app-topbar-v2 text-semi-color-text-0 sticky top-0 z-50'
      style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <NoticeModal
        visible={noticeVisible}
        onClose={
          isConsoleRoute
            ? handleLatestAnnouncementClose
            : handleNoticeClose
        }
        isMobile={isMobile}
        defaultTab={isConsoleRoute ? 'system' : unreadCount > 0 ? 'system' : 'inApp'}
        unreadKeys={getUnreadKeys()}
        claudeStyle={isConsoleRoute}
      />

      <div className='app-topbar-shell-v2 w-full px-4 md:px-6'>
        <div
          className='app-topbar-inner-v2 items-center'
          style={{
            height: '60px',
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr) auto',
            transform: 'translateY(0)',
          }}
        >
          <div className='flex items-center'>
            <MobileMenuButton
              isConsoleRoute={isConsoleRoute}
              isMobile={isMobile}
              drawerOpen={drawerOpen}
              collapsed={collapsed}
              onToggle={handleMobileMenuToggle}
              t={t}
            />

            <HeaderLogo
              isMobile={isMobile}
              isConsoleRoute={isConsoleRoute}
              logo={logo}
              logoLoaded={logoLoaded}
              isLoading={isLoading}
              systemName={systemName}
              isSelfUseMode={isSelfUseMode}
              isDemoSiteMode={isDemoSiteMode}
              t={t}
            />
          </div>

          <Navigation
            mainNavLinks={mainNavLinks}
            isMobile={isMobile}
            isLoading={isLoading}
            userState={userState}
            pricingRequireAuth={pricingRequireAuth}
          />

          <ActionButtons
            isNewYear={isNewYear}
            unreadCount={unreadCount}
            onNoticeOpen={handleNoticeOpen}
            currentLang={currentLang}
            onLanguageChange={handleLanguageChange}
            userState={userState}
            isLoading={isLoading}
            isMobile={isMobile}
            isSelfUseMode={isSelfUseMode}
            logout={logout}
            navigate={navigate}
            t={t}
          />
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;
