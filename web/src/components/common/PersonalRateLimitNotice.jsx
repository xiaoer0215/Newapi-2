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

import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API, setUserData } from '../../helpers';
import { UserContext } from '../../context/User';

const getRateLimitItems = (user, t) => {
  if (!user) return [];

  const items = [];
  if (Number(user.request_rate_limit || 0) > 0) {
    items.push({
      key: 'minute',
      label: t('\u5206\u949f'),
      value: Number(user.request_rate_limit),
    });
  }
  if (Number(user.request_rate_limit_hour || 0) > 0) {
    items.push({
      key: 'hour',
      label: t('\u5c0f\u65f6'),
      value: Number(user.request_rate_limit_hour),
    });
  }
  if (Number(user.request_rate_limit_day || 0) > 0) {
    items.push({
      key: 'day',
      label: t('\u5929'),
      value: Number(user.request_rate_limit_day),
    });
  }
  return items;
};

const PersonalRateLimitNotice = ({ className = '' }) => {
  const { t } = useTranslation();
  const [userState, userDispatch] = useContext(UserContext);
  const refreshedRef = useRef(false);
  const user = userState?.user;

  const hasRateLimitFields = useMemo(() => {
    if (!user) return false;
    return [
      'request_rate_limit',
      'request_rate_limit_hour',
      'request_rate_limit_day',
    ].some((field) => Object.prototype.hasOwnProperty.call(user, field));
  }, [user]);

  const rateLimitItems = useMemo(() => getRateLimitItems(user, t), [user, t]);

  useEffect(() => {
    if (!user?.id || hasRateLimitFields || refreshedRef.current) {
      return;
    }

    refreshedRef.current = true;
    API.get('/api/user/self', { skipErrorHandler: true })
      .then((res) => {
        if (!res?.data?.success || !res?.data?.data) {
          return;
        }
        userDispatch({ type: 'login', payload: res.data.data });
        setUserData(res.data.data);
      })
      .catch(() => {});
  }, [hasRateLimitFields, user?.id, userDispatch]);

  if (!user?.id || rateLimitItems.length === 0) {
    return null;
  }

  const summary = rateLimitItems
    .map((item) => `${item.label} ${item.value}${t('\u6b21')}`)
    .join(' / ');

  return (
    <div
      className={`personal-rate-limit-alert ${className}`.trim()}
      role='alert'
    >
      <div className='personal-rate-limit-alert__icon'>
        <ShieldAlert size={18} />
      </div>
      <div className='personal-rate-limit-alert__content'>
        <div className='personal-rate-limit-alert__title'>
          {t('\u4f60\u5df2\u89e6\u53d1\u4e2a\u4eba\u98ce\u63a7\u9650\u901f')}
        </div>
        <div className='personal-rate-limit-alert__desc'>
          {t('\u5f53\u524d\u9650\u901f')} {summary}
          {'\uff0c'}
          {t('\u5982\u6709\u7591\u95ee\u8bf7\u8054\u7cfb\u5ba2\u670d')}
        </div>
        <div className='personal-rate-limit-alert__tags'>
          {rateLimitItems.map((item) => (
            <span key={item.key} className='personal-rate-limit-alert__tag'>
              {item.label}: {item.value}
              {t('\u6b21')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PersonalRateLimitNotice;
