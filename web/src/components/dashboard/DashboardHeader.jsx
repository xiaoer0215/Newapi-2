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

import React, { useMemo } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import UserGroupIcon from '../common/UserGroupIcon';
import { resolveUserGroupIconValue } from '../../helpers/userGroupIcon';

const DashboardHeader = ({
  getGreeting,
  greetingVisible,
  showSearchModal,
  refresh,
  loading,
  t,
  userState,
  status,
}) => {
  const cachedStatus = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('status') || '{}');
    } catch (_) {
      return {};
    }
  }, [status]);

  const currentGroup = userState?.user?.group || 'default';
  const userUsableGroups = {
    ...(status?.user_usable_groups || {}),
    ...(cachedStatus?.user_usable_groups || {}),
  };
  const currentGroupDisplayName = userUsableGroups?.[currentGroup] || currentGroup;
  const groupIcons = {
    ...(status?.user_group_icons || {}),
    ...(cachedStatus?.user_group_icons || {}),
  };
  const rawGroupIcon = resolveUserGroupIconValue({
    currentGroup,
    currentGroupDisplayName,
    groupIcons,
    userUsableGroups,
  });

  return (
    <section className='dashboard-sketch-welcome' style={{ opacity: greetingVisible ? 1 : 0 }}>
      <div className='dashboard-sketch-welcome-text'>
        <h2>
          <span className='dashboard-sketch-wave'>👋</span>
          <span>{getGreeting}</span>
          {rawGroupIcon ? (
            <UserGroupIcon
              value={rawGroupIcon}
              alt={currentGroup || 'group-icon'}
              wrapperClassName='inline-flex max-h-7 max-w-[96px] flex-shrink-0 items-center overflow-hidden'
              imgClassName='block h-6 w-auto object-contain'
              svgClassName='block h-6 w-auto [&>svg]:block [&>svg]:h-6 [&>svg]:w-auto'
            />
          ) : null}
        </h2>
        <p>{t('欢迎使用控制台，今天也保持稳定、高效、可观测。')}</p>
      </div>

      <div className='dashboard-sketch-welcome-actions'>
        <button type='button' className='dashboard-sketch-action-btn' onClick={showSearchModal} aria-label={t('搜索')}>
          <Search size={16} />
        </button>
        <button type='button' className='dashboard-sketch-action-btn primary' onClick={refresh} disabled={loading} aria-label={t('刷新')}>
          <RefreshCw size={16} className={loading ? 'dashboard-sketch-spin' : ''} />
        </button>
      </div>

      <svg className='dashboard-sketch-banner-bg' viewBox='0 0 520 130' preserveAspectRatio='none' aria-hidden='true'>
        <defs>
          <linearGradient id='dashboardCubeTop' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0' stopColor='#f8fbff' />
            <stop offset='1' stopColor='#bac8ff' />
          </linearGradient>
          <linearGradient id='dashboardCubeLeft' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0' stopColor='#6c8cff' />
            <stop offset='1' stopColor='#4f6fff' />
          </linearGradient>
          <linearGradient id='dashboardCubeRight' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0' stopColor='#9db4ff' />
            <stop offset='1' stopColor='#6c8cff' />
          </linearGradient>
        </defs>
        <path d='M120 132C220 62 328 112 520 24' fill='none' stroke='#dbe5ff' strokeWidth='2' opacity='.7' />
        <path d='M172 132C272 82 362 130 520 54' fill='none' stroke='#e4ebff' strokeWidth='1.2' opacity='.85' />
        <g transform='translate(330 25) scale(1.35)' opacity='.92'>
          <polygon points='20,0 42,11 20,22 -2,11' fill='url(#dashboardCubeTop)' />
          <polygon points='-2,11 20,22 20,45 -2,34' fill='url(#dashboardCubeLeft)' />
          <polygon points='20,22 42,11 42,34 20,45' fill='url(#dashboardCubeRight)' />
        </g>
        <g transform='translate(248 66) scale(.78)' opacity='.52'>
          <polygon points='20,0 42,11 20,22 -2,11' fill='url(#dashboardCubeTop)' />
          <polygon points='-2,11 20,22 20,45 -2,34' fill='url(#dashboardCubeLeft)' />
          <polygon points='20,22 42,11 42,34 20,45' fill='url(#dashboardCubeRight)' />
        </g>
        <circle cx='455' cy='82' r='18' fill='#6c8cff' opacity='.16' />
        <circle cx='416' cy='35' r='7' fill='#8b5cf6' opacity='.22' />
      </svg>
    </section>
  );
};

export default DashboardHeader;
