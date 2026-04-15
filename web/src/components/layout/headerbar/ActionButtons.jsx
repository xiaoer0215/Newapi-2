import React from 'react';
import NotificationButton from './NotificationButton';
import LanguageSelector from './LanguageSelector';
import UserArea from './UserArea';

const ActionButtons = ({
  unreadCount,
  onNoticeOpen,
  currentLang,
  onLanguageChange,
  userState,
  isLoading,
  isMobile,
  isSelfUseMode,
  logout,
  navigate,
  t,
}) => {
  return (
    <div className='flex items-center gap-4'>
      <div className='flex items-center'>
        <NotificationButton
          unreadCount={unreadCount}
          onNoticeOpen={onNoticeOpen}
          isMobile={isMobile}
          t={t}
        />
        <LanguageSelector
          currentLang={currentLang}
          onLanguageChange={onLanguageChange}
          isMobile={isMobile}
          t={t}
        />
      </div>

      <UserArea
        userState={userState}
        isLoading={isLoading}
        isMobile={isMobile}
        isSelfUseMode={isSelfUseMode}
        logout={logout}
        navigate={navigate}
        t={t}
      />
    </div>
  );
};

export default ActionButtons;
