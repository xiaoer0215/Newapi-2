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
import {
  Card,
  Tag,
} from '@douyinfe/semi-ui';
import {
  isRoot,
  isAdmin,
  renderQuota,
} from '../../../../helpers';
import { ShieldCheck } from 'lucide-react';
import UserGroupIcon from '../../../common/UserGroupIcon';
import { resolveUserGroupIconValue } from '../../../../helpers/userGroupIcon';

const UserInfoHeader = ({ t, userState, status }) => {
  const getUsername = () => {
    if (userState?.user) {
      return userState.user.username;
    }
    return 'null';
  };

  const getAvatarText = () => {
    const username = getUsername();
    if (username && username.length > 0) {
      return username.slice(0, 2).toUpperCase();
    }
    return 'NA';
  };

  const getRoleLabel = () => {
    if (isRoot()) {
      return t('\u8d85\u7ea7\u7ba1\u7406\u5458');
    }
    if (isAdmin()) {
      return t('\u7ba1\u7406\u5458');
    }
    return '';
  };

  const cachedStatus = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('status') || '{}');
    } catch (error) {
      return {};
    }
  }, [status]);
  const currentGroup = userState?.user?.group || 'default';
  const userUsableGroups = {
    ...(status?.user_usable_groups || {}),
    ...(cachedStatus?.user_usable_groups || {}),
  };
  const currentGroupDisplayName =
    userUsableGroups?.[currentGroup] || currentGroup;
  const roleLabel = getRoleLabel();
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
    <Card
      className='ps-card ps-profile-modern-card'
      bodyStyle={{ background: 'transparent' }}
    >
      <div className='ps-profile-modern'>
        <div className='ps-profile-art' aria-hidden='true'>
          <svg viewBox='0 0 360 180' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <defs>
              <pattern
                id='ps-profile-grid'
                width='22'
                height='22'
                patternUnits='userSpaceOnUse'
              >
                <path d='M22 0H0V22' stroke='#93C5FD' strokeOpacity='.24' />
              </pattern>
            </defs>
            <rect width='360' height='180' fill='url(#ps-profile-grid)' />
            <circle cx='300' cy='34' r='58' fill='#DBEAFE' />
            <circle cx='314' cy='44' r='34' fill='#BFDBFE' />
            <path
              d='M122 138C157 94 202 78 250 92C291 104 311 92 342 54'
              stroke='#60A5FA'
              strokeWidth='10'
              strokeLinecap='round'
              strokeOpacity='.26'
            />
            <path
              d='M150 151C183 119 211 111 247 121C285 132 311 119 344 91'
              stroke='#14B8A6'
              strokeWidth='7'
              strokeLinecap='round'
              strokeOpacity='.20'
            />
            <rect
              x='234'
              y='104'
              width='84'
              height='44'
              rx='14'
              fill='#FFFFFF'
              fillOpacity='.62'
              stroke='#BFDBFE'
            />
            <path d='M252 126H300' stroke='#2563EB' strokeWidth='5' strokeLinecap='round' strokeOpacity='.36' />
            <path d='M252 140H286' stroke='#0F766E' strokeWidth='5' strokeLinecap='round' strokeOpacity='.24' />
          </svg>
        </div>
        <div className='ps-profile-main'>
          <div className='ps-profile-avatar'>{getAvatarText()}</div>
          <div className='ps-profile-copy'>
            <div className='ps-profile-kicker'>{t('\u4e2a\u4eba\u8bbe\u7f6e')}</div>
            <div className='ps-profile-name-row'>
              <div className='ps-profile-name' title={getUsername()}>
                {getUsername()}
              </div>
              {rawGroupIcon ? (
                <UserGroupIcon
                  value={rawGroupIcon}
                  alt={currentGroup || 'group-icon'}
                  wrapperClassName='ps-profile-name-icon'
                  imgClassName='ps-profile-name-icon-img'
                  svgClassName='ps-profile-name-icon-svg'
                />
              ) : null}
            </div>
            <div className='ps-profile-tags'>
              {roleLabel ? (
                <Tag
                  size='large'
                  shape='square'
                  color='white'
                  className='ps-profile-role-tag'
                >
                  <span className='ps-profile-tag-icon'>
                    <ShieldCheck size={13} />
                  </span>
                  <span>{roleLabel}</span>
                </Tag>
              ) : null}
              <Tag
                size='large'
                shape='square'
                color='blue'
                className='ps-profile-group-tag'
              >
                <span>{currentGroupDisplayName}</span>
              </Tag>
            </div>
          </div>
        </div>

        <div className='ps-profile-balance'>
          <span>{t('\u5f53\u524d\u4f59\u989d')}</span>
          <strong>{renderQuota(userState?.user?.quota ?? 0)}</strong>
        </div>

        <div className='ps-profile-stat-list'>
          <div className='ps-profile-stat'>
            <span>{t('\u5f53\u524d\u5206\u7ec4')}</span>
            <strong>{currentGroupDisplayName}</strong>
          </div>
          <div className='ps-profile-stat'>
            <span>{t('\u5386\u53f2\u6d88\u8017')}</span>
            <strong>{renderQuota(userState?.user?.used_quota ?? 0)}</strong>
          </div>
          <div className='ps-profile-stat'>
            <span>{t('\u8bf7\u6c42\u6b21\u6570')}</span>
            <strong>{userState?.user?.request_count || 0}</strong>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserInfoHeader;
