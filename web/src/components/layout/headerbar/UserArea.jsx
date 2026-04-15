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

import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button, Dropdown, Typography } from '@douyinfe/semi-ui';
import { ChevronDown } from 'lucide-react';
import {
  IconExit,
  IconUserSetting,
  IconCreditCard,
  IconKey,
} from '@douyinfe/semi-icons';
import { stringToColor } from '../../../helpers';
import SkeletonWrapper from '../components/SkeletonWrapper';

const UserArea = ({
  userState,
  isLoading,
  isMobile,
  isSelfUseMode,
  logout,
  navigate,
  t,
}) => {
  const dropdownRef = useRef(null);
  if (isLoading) {
    return (
      <SkeletonWrapper
        loading={true}
        type='userArea'
        width={50}
        isMobile={isMobile}
      />
    );
  }

  if (userState.user) {
    return (
      <div className='relative' ref={dropdownRef}>
        <Dropdown
          position='bottomRight'
          getPopupContainer={() => dropdownRef.current}
          render={
            <Dropdown.Menu className='!bg-semi-color-bg-overlay !border-semi-color-border !shadow-lg !rounded-lg'>
              <Dropdown.Item
                onClick={() => {
                  navigate('/console/personal');
                }}
                className='!px-3 !py-1.5 !text-sm !text-semi-color-text-0 hover:!bg-semi-color-fill-1'
              >
                <div className='flex items-center gap-2'>
                  <IconUserSetting
                    size='small'
                    className='text-gray-500'
                  />
                  <span>{t('个人设置')}</span>
                </div>
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => {
                  navigate('/console/token');
                }}
                className='!px-3 !py-1.5 !text-sm !text-semi-color-text-0 hover:!bg-semi-color-fill-1'
              >
                <div className='flex items-center gap-2'>
                  <IconKey
                    size='small'
                    className='text-gray-500'
                  />
                  <span>{t('令牌管理')}</span>
                </div>
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => {
                  navigate('/console/topup');
                }}
                className='!px-3 !py-1.5 !text-sm !text-semi-color-text-0 hover:!bg-semi-color-fill-1'
              >
                <div className='flex items-center gap-2'>
                  <IconCreditCard
                    size='small'
                    className='text-gray-500'
                  />
                  <span>{t('钱包管理')}</span>
                </div>
              </Dropdown.Item>
              <Dropdown.Item
                onClick={logout}
                className='!px-3 !py-1.5 !text-sm !text-semi-color-text-0 hover:!bg-semi-color-fill-1'
              >
                <div className='flex items-center gap-2'>
                  <IconExit
                    size='small'
                    className='text-gray-500'
                  />
                  <span>{t('退出')}</span>
                </div>
              </Dropdown.Item>
            </Dropdown.Menu>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px 4px 4px', borderRadius: '20px', background: 'rgba(255,255,255,0.5)', cursor: 'pointer' }} className='hover:bg-semi-color-fill-1 transition-colors'>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: stringToColor(userState.user.username) || 'linear-gradient(135deg, #c084fc, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
              {userState.user.username[0].toUpperCase()}
            </div>
            <span style={{ fontSize: '13px', color: 'var(--semi-color-text-2)' }} className='hidden md:inline'>{userState.user.username}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--semi-color-text-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className=''><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </Dropdown>
      </div>
    );
  } else {
    const showRegisterButton = !isSelfUseMode;

    const commonSizingAndLayoutClass =
      'flex items-center justify-center !py-[10px] !px-1.5';

    const loginButtonSpecificStyling =
      '!bg-semi-color-fill-0 hover:!bg-semi-color-fill-1 transition-colors';
    let loginButtonClasses = `${commonSizingAndLayoutClass} ${loginButtonSpecificStyling}`;

    let registerButtonClasses = `${commonSizingAndLayoutClass}`;

    const loginButtonTextSpanClass =
      '!text-xs !text-semi-color-text-1 !p-1.5';
    const registerButtonTextSpanClass = '!text-xs !text-white !p-1.5';

    if (showRegisterButton) {
      if (isMobile) {
        loginButtonClasses += ' !rounded-full';
      } else {
        loginButtonClasses += ' !rounded-l-full !rounded-r-none';
      }
      registerButtonClasses += ' !rounded-r-full !rounded-l-none';
    } else {
      loginButtonClasses += ' !rounded-full';
    }

    return (
      <div className='flex items-center'>
        <Link to='/login' className='flex'>
          <Button
            theme='borderless'
            type='tertiary'
            className={loginButtonClasses}
          >
            <span className={loginButtonTextSpanClass}>{t('登录')}</span>
          </Button>
        </Link>
        {showRegisterButton && (
          <div className='hidden md:block'>
            <Link to='/register' className='flex -ml-px'>
              <Button
                theme='solid'
                type='primary'
                className={registerButtonClasses}
              >
                <span className={registerButtonTextSpanClass}>{t('注册')}</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }
};

export default UserArea;
