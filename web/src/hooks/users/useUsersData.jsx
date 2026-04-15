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

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { API, showError, showSuccess } from '../../helpers';
import { ITEMS_PER_PAGE } from '../../constants';
import { useTableCompactMode } from '../common/useTableCompactMode';

const getUsersQueryState = (search = '') => {
  const searchParams = new URLSearchParams(search || '');
  return {
    searchKeyword:
      searchParams.get('keyword') || searchParams.get('searchKeyword') || '',
    searchGroup: searchParams.get('group') || '',
    onlyLimited: searchParams.get('only_limited') === '1',
  };
};

export const useUsersData = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [compactMode, setCompactMode] = useTableCompactMode('users');

  // State management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [searching, setSearching] = useState(false);
  const [groupOptions, setGroupOptions] = useState([]);
  const [userCount, setUserCount] = useState(0);

  // Modal states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState({
    id: undefined,
  });

  // Form initial values
  const [formInitValues, setFormInitValues] = useState(() =>
    typeof window === 'undefined'
      ? {
          searchKeyword: '',
          searchGroup: '',
          onlyLimited: false,
        }
      : getUsersQueryState(window.location.search),
  );

  // Form API reference
  const [formApi, setFormApi] = useState(null);

  // Get form values helper function
  const getFormValues = () => {
    const formValues = formApi ? formApi.getValues() : formInitValues;
    return {
      searchKeyword: formValues.searchKeyword || '',
      searchGroup: formValues.searchGroup || '',
      onlyLimited: Boolean(formValues.onlyLimited),
    };
  };

  // Set user format with key field
  const setUserFormat = (users) => {
    for (let i = 0; i < users.length; i++) {
      users[i].key = users[i].id;
    }
    setUsers(users);
  };

  // Load users data
  const loadUsers = async (startIdx, pageSize, onlyLimitedOverride = null) => {
    setLoading(true);
    try {
      const { onlyLimited } =
        onlyLimitedOverride === null
          ? getFormValues()
          : { onlyLimited: Boolean(onlyLimitedOverride) };
      const res = await API.get(
        `/api/user/?p=${startIdx}&page_size=${pageSize}&only_limited=${onlyLimited ? 1 : 0}`,
      );
      const { success, message, data } = res.data;
      if (success) {
        const newPageData = data.items;
        setActivePage(data.page);
        setUserCount(data.total);
        setUserFormat(newPageData);
      } else {
        showError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Search users with keyword and group
  const searchUsers = async (
    startIdx,
    pageSize,
    searchKeyword = null,
    searchGroup = null,
    onlyLimited = null,
  ) => {
    // If no parameters passed, get values from form
    if (
      searchKeyword === null ||
      searchGroup === null ||
      onlyLimited === null
    ) {
      const formValues = getFormValues();
      searchKeyword = formValues.searchKeyword;
      searchGroup = formValues.searchGroup;
      onlyLimited = formValues.onlyLimited;
    }

    if (searchKeyword === '' && searchGroup === '') {
      await loadUsers(startIdx, pageSize, onlyLimited);
      return;
    }
    setLoading(true);
    setSearching(true);
    try {
      const res = await API.get(
        `/api/user/search?keyword=${searchKeyword}&group=${searchGroup}&only_limited=${onlyLimited ? 1 : 0}&p=${startIdx}&page_size=${pageSize}`,
      );
      const { success, message, data } = res.data;
      if (success) {
        const newPageData = data.items;
        setActivePage(data.page);
        setUserCount(data.total);
        setUserFormat(newPageData);
      } else {
        showError(message);
      }
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  // Manage user operations (promote, demote, enable, disable, delete)
  const manageUser = async (userId, action, record) => {
    // Trigger loading state to force table re-render
    setLoading(true);

    const res = await API.post('/api/user/manage', {
      id: userId,
      action,
    });

    const { success, message } = res.data;
    if (success) {
      showSuccess(t('操作成功完成！'));
      const user = res.data.data;

      // Create a new array and new object to ensure React detects changes
      const newUsers = users.map((u) => {
        if (u.id === userId) {
          if (action === 'delete') {
            return { ...u, DeletedAt: new Date() };
          }
          return { ...u, status: user.status, role: user.role };
        }
        return u;
      });

      setUsers(newUsers);
    } else {
      showError(message);
    }

    setLoading(false);
  };

  const resetUserPasskey = async (user) => {
    if (!user) {
      return;
    }
    try {
      const res = await API.delete(`/api/user/${user.id}/reset_passkey`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('Passkey 已重置'));
      } else {
        showError(message || t('操作失败，请重试'));
      }
    } catch (error) {
      showError(t('操作失败，请重试'));
    }
  };

  const resetUserTwoFA = async (user) => {
    if (!user) {
      return;
    }
    try {
      const res = await API.delete(`/api/user/${user.id}/2fa`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('二步验证已重置'));
      } else {
        showError(message || t('操作失败，请重试'));
      }
    } catch (error) {
      showError(t('操作失败，请重试'));
    }
  };

  // Handle page change
  const handlePageChange = (page) => {
    setActivePage(page);
    const { searchKeyword, searchGroup, onlyLimited } = getFormValues();
    if (searchKeyword === '' && searchGroup === '') {
      loadUsers(page, pageSize).then();
    } else {
      searchUsers(
        page,
        pageSize,
        searchKeyword,
        searchGroup,
        onlyLimited,
      ).then();
    }
  };

  // Handle page size change
  const handlePageSizeChange = async (size) => {
    localStorage.setItem('page-size', size + '');
    setPageSize(size);
    setActivePage(1);
    const { searchKeyword, searchGroup, onlyLimited } = getFormValues();
    const task =
      searchKeyword === '' && searchGroup === ''
        ? loadUsers(1, size)
        : searchUsers(1, size, searchKeyword, searchGroup, onlyLimited);
    task.catch((reason) => {
      showError(reason);
    });
  };

  // Handle table row styling for disabled/deleted users
  const handleRow = (record, index) => {
    if (record.DeletedAt !== null || record.status !== 1) {
      return {
        style: {
          background: 'var(--semi-color-disabled-border)',
        },
      };
    } else if (
      (record.request_rate_limit || 0) > 0 ||
      (record.request_rate_limit_hour || 0) > 0 ||
      (record.request_rate_limit_day || 0) > 0
    ) {
      return {
        style: {
          background: '#fff7f7',
        },
      };
    } else {
      return {};
    }
  };

  // Refresh data
  const refresh = async (page = activePage) => {
    const { searchKeyword, searchGroup, onlyLimited } = getFormValues();
    if (searchKeyword === '' && searchGroup === '') {
      await loadUsers(page, pageSize);
    } else {
      await searchUsers(
        page,
        pageSize,
        searchKeyword,
        searchGroup,
        onlyLimited,
      );
    }
  };

  // Fetch groups data
  const fetchGroups = async () => {
    try {
      let res = await API.get(`/api/group/`);
      if (res === undefined) {
        return;
      }
      setGroupOptions(
        res.data.data.map((group) => ({
          label: group,
          value: group,
        })),
      );
    } catch (error) {
      showError(error.message);
    }
  };

  // Modal control functions
  const closeAddUser = () => {
    setShowAddUser(false);
  };

  const closeEditUser = () => {
    setShowEditUser(false);
    setEditingUser({
      id: undefined,
    });
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchGroups().then();
  }, []);

  useEffect(() => {
    if (formApi) {
      formApi.setValues(formInitValues);
    }
  }, [formApi, formInitValues]);

  useEffect(() => {
    const nextFormValues = getUsersQueryState(location.search);
    setFormInitValues(nextFormValues);

    const task =
      nextFormValues.searchKeyword === '' && nextFormValues.searchGroup === ''
        ? loadUsers(1, pageSize, nextFormValues.onlyLimited)
        : searchUsers(
            1,
            pageSize,
            nextFormValues.searchKeyword,
            nextFormValues.searchGroup,
            nextFormValues.onlyLimited,
          );

    task.catch((reason) => {
      showError(reason);
    });
  }, [location.search]);

  return {
    // Data state
    users,
    loading,
    activePage,
    pageSize,
    userCount,
    searching,
    groupOptions,

    // Modal state
    showAddUser,
    showEditUser,
    editingUser,
    setShowAddUser,
    setShowEditUser,
    setEditingUser,

    // Form state
    formInitValues,
    formApi,
    setFormApi,

    // UI state
    compactMode,
    setCompactMode,

    // Actions
    loadUsers,
    searchUsers,
    manageUser,
    resetUserPasskey,
    resetUserTwoFA,
    handlePageChange,
    handlePageSizeChange,
    handleRow,
    refresh,
    closeAddUser,
    closeEditUser,
    getFormValues,

    // Translation
    t,
  };
};
