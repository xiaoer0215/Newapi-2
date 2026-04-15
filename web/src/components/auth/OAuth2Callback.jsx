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

import React, { useContext, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  API,
  showError,
  showInfo,
  showSuccess,
  updateAPI,
  setUserData,
} from '../../helpers';
import { UserContext } from '../../context/User';
import Loading from '../common/ui/Loading';

const OAuth2Callback = (props) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [, userDispatch] = useContext(UserContext);
  const navigate = useNavigate();

  const hasExecuted = useRef(false);
  const MAX_RETRIES = 3;

  const sendCode = async (code, state, retry = 0) => {
    try {
      const { data: resData } = await API.get(
        `/api/oauth/${props.type}?code=${code}&state=${state}`,
      );

      const { success, message, data } = resData;

      if (!success) {
        showError(message || t('\u6388\u6743\u5931\u8d25'));
        return;
      }

      if (message === 'bind') {
        showSuccess(t('\u7ed1\u5b9a\u6210\u529f'));
        navigate('/console/personal');
        return;
      }

      userDispatch({ type: 'login', payload: data });
      setUserData(data);
      updateAPI();

      if (data?.require_account_setup) {
        showInfo(
          t(
            '\u0051\u0051\u0020\u767b\u5f55\u6210\u529f\uff0c\u8bf7\u5148\u8bbe\u7f6e\u8d26\u53f7\u540d\u548c\u5bc6\u7801',
          ),
        );
        navigate('/console/personal?setup_account=1&bind_source=qq', {
          replace: true,
        });
        return;
      }

      showSuccess(t('\u767b\u5f55\u6210\u529f'));
      navigate('/console/token');
    } catch (error) {
      if (retry < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, (retry + 1) * 2000));
        return sendCode(code, state, retry + 1);
      }

      showError(error.message || t('\u6388\u6743\u5931\u8d25'));
      navigate('/console/personal');
    }
  };

  useEffect(() => {
    if (hasExecuted.current) {
      return;
    }
    hasExecuted.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      showError(t('\u672a\u83b7\u53d6\u5230\u6388\u6743\u7801'));
      navigate('/console/personal');
      return;
    }

    sendCode(code, state);
  }, []);

  return <Loading />;
};

export default OAuth2Callback;
