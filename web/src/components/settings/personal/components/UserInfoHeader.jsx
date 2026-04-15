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
  Avatar,
  Badge,
  Card,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import {
  isRoot,
  isAdmin,
  renderQuota,
  stringToColor,
} from '../../../../helpers';
import {
  normalizeInlineSvgMarkup,
  resolveUserGroupIconSrc,
} from '../../../../helpers/userGroupIcon';
import { Coins, BarChart2 } from 'lucide-react';

const UserInfoHeader = ({ t, userState, status }) => {
  const normalizeGroupText = (value) =>
    String(value || '')
      .trim()
      .toLowerCase();

  const getUsername = () => {
    if (userState.user) {
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

  const currentGroup = userState?.user?.group || t('\u9ed8\u8ba4');
  const userUsableGroups = status?.user_usable_groups || {};
  const currentGroupDisplayName =
    userUsableGroups?.[currentGroup] || currentGroup;
  const groupIcons = useMemo(() => {
    if (
      status?.user_group_icons &&
      typeof status.user_group_icons === 'object'
    ) {
      return status.user_group_icons;
    }
    try {
      const savedStatus = JSON.parse(localStorage.getItem('status') || '{}');
      return savedStatus?.user_group_icons || {};
    } catch (error) {
      return {};
    }
  }, [status]);
  const normalizedGroupIcons = useMemo(() => {
    const nextMap = {};
    Object.entries(groupIcons || {}).forEach(([key, value]) => {
      const normalizedKey = normalizeGroupText(key);
      const trimmedValue = String(value || '').trim();
      if (normalizedKey && trimmedValue) {
        nextMap[normalizedKey] = trimmedValue;
      }
    });
    return nextMap;
  }, [groupIcons]);

  const pickGroupIcon = (candidate) => {
    const directMatch = String(groupIcons?.[candidate] || '').trim();
    if (directMatch) {
      return directMatch;
    }
    return normalizedGroupIcons[normalizeGroupText(candidate)] || '';
  };

  const resolveRawGroupIcon = () => {
    const candidates = [currentGroup, currentGroupDisplayName];

    if (normalizeGroupText(currentGroup) === 'default') {
      candidates.push('普通用户', '默认分组', '默认');
    }

    Object.entries(userUsableGroups || {}).forEach(([groupKey, groupLabel]) => {
      const normalizedKey = normalizeGroupText(groupKey);
      const normalizedLabel = normalizeGroupText(groupLabel);
      const normalizedCurrent = normalizeGroupText(currentGroup);
      const normalizedDisplay = normalizeGroupText(currentGroupDisplayName);
      if (
        normalizedKey === normalizedCurrent ||
        normalizedLabel === normalizedCurrent ||
        normalizedKey === normalizedDisplay ||
        normalizedLabel === normalizedDisplay
      ) {
        candidates.push(groupKey, groupLabel);
      }
    });

    for (const candidate of candidates) {
      const matched = pickGroupIcon(candidate);
      if (matched) {
        return matched;
      }
    }
    return '';
  };

  const rawGroupIcon = resolveRawGroupIcon();
  const normalizedInlineSvg = normalizeInlineSvgMarkup(rawGroupIcon);
  const roleLabel = getRoleLabel();
  const groupIconSrc = resolveUserGroupIconSrc(
    normalizedInlineSvg || rawGroupIcon,
  );
  const shouldShowGroupIcon = !isRoot() && !isAdmin() && Boolean(groupIconSrc);

  return (
    <Card
      className='ps-card !rounded-2xl overflow-hidden'
      bodyStyle={{ background: 'transparent' }}
      cover={
        <div
          className='ps-cover relative h-32'
        >
          <div className='relative z-10 flex h-full flex-col justify-end p-6'>
            <div className='flex items-center'>
              <div className='flex min-w-0 flex-1 items-stretch gap-3 sm:gap-4'>
                <Avatar size='large' color={stringToColor(getUsername())}>
                  {getAvatarText()}
                </Avatar>
                <div className='flex min-w-0 flex-1 flex-col justify-between'>
                  <div className='flex min-w-0 items-center gap-2 text-2xl font-bold text-white sm:text-3xl'>
                    <span className='truncate'>
                      {t('\u7528\u6237\u540d')}
                      {'\uff1a'}
                      {getUsername()}
                    </span>
                    {shouldShowGroupIcon ? (
                      <span className='inline-flex max-h-7 max-w-[96px] flex-shrink-0 items-center overflow-hidden'>
                        <img
                          src={groupIconSrc}
                          alt={currentGroup}
                          className='block h-6 w-auto object-contain'
                          referrerPolicy='no-referrer'
                        />
                      </span>
                    ) : null}
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    {roleLabel ? (
                      <Tag
                        size='large'
                        shape='circle'
                        style={{ color: 'white' }}
                      >
                        {roleLabel}
                      </Tag>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className='flex items-start justify-between gap-6'>
        <Badge
          count={t('\u5f53\u524d\u4f59\u989d')}
          position='rightTop'
          type='danger'
        >
          <div className='text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide'>
            {renderQuota(userState?.user?.quota)}
          </div>
        </Badge>

        <div className='hidden lg:block flex-shrink-0'>
          <div className='ps-stats-row'>
            <div className='ps-stats-row__item'>
              <Coins size={14} />
              <span>{t('\u5386\u53f2\u6d88\u8017')}</span>
              <strong style={{ color: 'var(--ps-text)' }}>{renderQuota(userState?.user?.used_quota)}</strong>
            </div>
            <div className='ps-divider-v' />
            <div className='ps-stats-row__item'>
              <BarChart2 size={14} />
              <span>{t('\u8bf7\u6c42\u6b21\u6570')}</span>
              <strong style={{ color: 'var(--ps-text)' }}>{userState.user?.request_count || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className='lg:hidden mt-2'>
        <div className='ps-stats-row' style={{ gap: 12 }}>
          <div className='ps-stats-row__item' style={{ flex: 1, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Coins size={14} />
              <span>{t('\u5386\u53f2\u6d88\u8017')}</span>
            </div>
            <strong style={{ color: 'var(--ps-text)' }}>{renderQuota(userState?.user?.used_quota)}</strong>
          </div>
          <div className='ps-divider-v' />
          <div className='ps-stats-row__item' style={{ flex: 1, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart2 size={14} />
              <span>{t('\u8bf7\u6c42\u6b21\u6570')}</span>
            </div>
            <strong style={{ color: 'var(--ps-text)' }}>{userState.user?.request_count || 0}</strong>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserInfoHeader;
