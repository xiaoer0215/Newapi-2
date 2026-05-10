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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Spin,
  Typography,
} from '@douyinfe/semi-ui';
import {
  API,
  removeTrailingSlash,
  showError,
  showSuccess,
  verifyJSON,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';
import { IconPlus } from '@douyinfe/semi-icons';

const { Text } = Typography;

const createAmountGroupOverride = (discountedPrice = 0, gift = 0, amount = null) => ({
  discountedPrice: Number(discountedPrice || 0),
  gift: Math.round(Number(gift || 0)),
  amount:
    amount === null || amount === undefined || Number(amount) <= 0
      ? null
      : Math.round(Number(amount)),
});

const normalizeAmountGroupOverride = (
  override,
  fallbackDiscountedPrice = 0,
  fallbackGift = 0,
  fallbackAmount = 0,
) => {
  const discountedPrice = Number(override?.discountedPrice ?? fallbackDiscountedPrice);
  const gift = Math.round(Number(override?.gift ?? fallbackGift));
  const overrideAmount = Number(override?.amount);
  return {
    discountedPrice:
      Number.isFinite(discountedPrice) && discountedPrice > 0
        ? Number(discountedPrice.toFixed(2))
        : Number(Number(fallbackDiscountedPrice || 0).toFixed(2)),
    gift: Number.isFinite(gift) && gift >= 0 ? gift : Math.round(Number(fallbackGift || 0)),
    amount:
      Number.isFinite(overrideAmount) && overrideAmount > 0
        ? Math.round(overrideAmount)
        : null,
  };
};

const createAmountRow = (
  amount = 0,
  discount = 1,
  gift = 0,
  groupOverrides = {},
) => ({
  id: `${Date.now()}-${Math.random()}`,
  amount: Number(amount || 0),
  discount: Number(discount || 1),
  discountedPrice:
    Number(amount || 0) > 0
      ? Number((Number(amount || 0) * Number(discount || 1)).toFixed(2))
      : 0,
  gift: Math.round(Number(gift || 0)),
  groupOverrides: Object.fromEntries(
    Object.entries(groupOverrides || {}).map(([groupName, override]) => [
      String(groupName || '').trim(),
      createAmountGroupOverride(
        override?.discountedPrice,
        override?.gift,
        override?.amount,
      ),
    ]),
  ),
});

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

const buildSelectOptions = (options, draftValue) => {
  const trimmedDraft = String(draftValue || '').trim();
  if (!trimmedDraft) {
    return options;
  }
  if (options.some((option) => option.value === trimmedDraft)) {
    return options;
  }
  return [...options, { label: trimmedDraft, value: trimmedDraft }];
};

const extractKnownGroupNames = (groupSource) => {
  const withDefaultGroup = (groups) =>
    Array.from(new Set(['default', ...(groups || [])])).sort((a, b) =>
      a.localeCompare(b),
    );

  if (Array.isArray(groupSource)) {
    return withDefaultGroup(
      groupSource
        .map((groupName) => String(groupName || '').trim())
        .filter(Boolean),
    );
  }

  if (groupSource && typeof groupSource === 'object') {
    return withDefaultGroup(
      Object.keys(groupSource)
        .map((groupName) => String(groupName || '').trim())
        .filter(Boolean),
    );
  }

  return withDefaultGroup(
    Object.keys(safeParse(groupSource || '', {}))
      .map((groupName) => String(groupName || '').trim())
      .filter(Boolean),
  );
};

const buildRowsFromConfig = (
  amountOptionsRaw,
  amountDiscountRaw,
  amountGiftRaw,
  groupAmountOverridesRaw,
  knownGroupsSource = [],
) => {
  const amountOptions = safeParse(amountOptionsRaw, []);
  const amountDiscount = safeParse(amountDiscountRaw, {});
  const amountGift = safeParse(amountGiftRaw, {});
  const groupAmountOverrides = safeParse(groupAmountOverridesRaw, {});
  const knownGroupSet = new Set(extractKnownGroupNames(knownGroupsSource));

  const amountSet = new Set();
  amountOptions.forEach((item) => amountSet.add(Number(item)));
  Object.keys(amountDiscount || {}).forEach((item) =>
    amountSet.add(Number(item)),
  );
  Object.keys(amountGift || {}).forEach((item) => amountSet.add(Number(item)));
  const overridesByAmount = {};
  Object.entries(groupAmountOverrides || {}).forEach(([groupName, amountMap]) => {
    if (!groupName || typeof amountMap !== 'object' || amountMap === null) {
      return;
    }
    const trimmedGroupName = String(groupName || '').trim();
    if (
      !trimmedGroupName ||
      trimmedGroupName === 'default' ||
      (knownGroupSet.size > 0 && !knownGroupSet.has(trimmedGroupName))
    ) {
      return;
    }
    Object.entries(amountMap).forEach(([amountKey, override]) => {
      const amount = Number(amountKey);
      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }
      amountSet.add(amount);
      if (!overridesByAmount[amount]) {
        overridesByAmount[amount] = {};
      }
      overridesByAmount[amount][trimmedGroupName] = createAmountGroupOverride(
        override?.discounted_price,
        override?.gift,
        override?.amount,
      );
    });
  });

  const rows = Array.from(amountSet)
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((a, b) => a - b)
    .map((amount) =>
      createAmountRow(
        amount,
        Number(amountDiscount?.[amount] || 1),
        Number(amountGift?.[amount] || 0),
        overridesByAmount[amount] || {},
      ),
    );

  return rows;
};

const normalizeRow = (row) => {
  const amount = Number(row.amount || 0);
  const gift = Math.round(Number(row.gift || 0));
  let discount = Number(row.discount || 1);
  let discountedPrice = Number(row.discountedPrice || 0);

  if (!Number.isFinite(discount) || discount <= 0) {
    discount = amount > 0 && discountedPrice > 0 ? discountedPrice / amount : 1;
  }
  if (!Number.isFinite(discount) || discount <= 0) {
    discount = 1;
  }

  if (!Number.isFinite(discountedPrice) || discountedPrice <= 0) {
    discountedPrice = amount > 0 ? amount * discount : 0;
  }

  if (amount > 0 && discountedPrice > 0) {
    discount = Number((discountedPrice / amount).toFixed(4));
  }

  const groupOverrides = Object.fromEntries(
    Object.entries(row.groupOverrides || {})
      .map(([groupName, override]) => {
        const trimmedGroupName = String(groupName || '').trim();
        if (!trimmedGroupName || trimmedGroupName === 'default') {
          return null;
        }
        return [
          trimmedGroupName,
          normalizeAmountGroupOverride(override, discountedPrice, gift, amount),
        ];
      })
      .filter(Boolean),
  );

  return {
    ...row,
    amount,
    discount,
    discountedPrice: Number(discountedPrice.toFixed(2)),
    gift,
    groupOverrides,
  };
};

const serializeRows = (rows) => {
  const normalizedRows = rows
    .map((row) => normalizeRow(row))
    .filter((row) => Number(row.amount || 0) > 0)
    .sort((a, b) => a.amount - b.amount);

  const amountOptions = normalizedRows.map((row) => Number(row.amount));
  const amountDiscount = {};
  const amountGift = {};
  const groupAmountOverrides = {};

  normalizedRows.forEach((row) => {
    const discount = Number(row.discount || 1);
    if (discount > 0 && Math.abs(discount - 1) > 0.0001) {
      amountDiscount[row.amount] = Number(discount.toFixed(4));
    }
    if (Number(row.gift || 0) > 0) {
      amountGift[row.amount] = Math.round(Number(row.gift));
    }

    Object.entries(row.groupOverrides || {}).forEach(([groupName, override]) => {
      if (!groupName) {
        return;
      }
      if (!groupAmountOverrides[groupName]) {
        groupAmountOverrides[groupName] = {};
      }
      groupAmountOverrides[groupName][row.amount] = {
        discounted_price: Number(
          Number(override.discountedPrice || row.discountedPrice || 0).toFixed(2),
        ),
        gift: Math.round(Number(override.gift || 0)),
        ...(Number(override.amount || 0) > 0
          ? { amount: Math.round(Number(override.amount)) }
          : {}),
      };
    });
  });

  return {
    amountOptions,
    amountDiscount,
    amountGift,
    groupAmountOverrides,
  };
};

const normalizeRatioValue = (value, fallback = 1) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }
  return Number(parsedValue.toFixed(4));
};

const normalizeMinTopupValue = (value) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return '';
  }
  return Math.round(parsedValue);
};

const createGroupRatioRow = (
  group = '',
  payRatio = 1,
  creditRatio = 1,
  minTopup = '',
) => ({
  id: `${Date.now()}-${Math.random()}`,
  group: String(group || ''),
  payRatio: normalizeRatioValue(payRatio, 1),
  creditRatio: normalizeRatioValue(creditRatio, 1),
  minTopup: normalizeMinTopupValue(minTopup),
});

const normalizeGroupRatioRow = (row) => ({
  ...row,
  group: String(row.group || '').trim(),
  payRatio: normalizeRatioValue(row.payRatio, 1),
  creditRatio: normalizeRatioValue(row.creditRatio, 1),
  minTopup: normalizeMinTopupValue(row.minTopup),
});

const buildGroupRatioRows = (
  topupGroupRatioRaw,
  topupGroupCreditRatioRaw,
  groupMinTopupRaw,
  knownGroupsSource,
) => {
  const topupGroupRatio = safeParse(topupGroupRatioRaw, {});
  const topupGroupCreditRatio = safeParse(topupGroupCreditRatioRaw, {});
  const groupMinTopup = safeParse(groupMinTopupRaw, {});
  const systemGroupSet = new Set(extractKnownGroupNames(knownGroupsSource));

  const groupSet = new Set([
    ...Object.keys(topupGroupRatio || {}),
    ...Object.keys(topupGroupCreditRatio || {}),
    ...Object.keys(groupMinTopup || {}),
  ]);

  const rows = Array.from(groupSet)
    .filter((group) => {
      if (!group) {
        return false;
      }
      if (systemGroupSet.size === 0) {
        return true;
      }
      return systemGroupSet.has(group);
    })
    .sort((a, b) => a.localeCompare(b))
    .map((group) =>
      createGroupRatioRow(
        group,
        topupGroupRatio?.[group] ?? 1,
        topupGroupCreditRatio?.[group] ?? 1,
        groupMinTopup?.[group] ?? '',
      ),
    );

  return rows;
};

const serializeGroupRatioRows = (rows) => {
  const topupGroupRatio = {};
  const topupGroupCreditRatio = {};
  const groupMinTopup = {};
  const duplicateGroups = new Set();
  const seenGroups = new Set();
  let hasEmptyGroup = false;

  rows
    .map((row) => normalizeGroupRatioRow(row))
    .sort((a, b) => a.group.localeCompare(b.group))
    .forEach((row) => {
      if (!row.group) {
        hasEmptyGroup = true;
        return;
      }
      if (seenGroups.has(row.group)) {
        duplicateGroups.add(row.group);
      }
      seenGroups.add(row.group);
      topupGroupRatio[row.group] = row.payRatio;
      topupGroupCreditRatio[row.group] = row.creditRatio;
      if (Number(row.minTopup || 0) > 0) {
        groupMinTopup[row.group] = Math.round(Number(row.minTopup));
      }
    });

  return {
    TopupGroupRatio: JSON.stringify(topupGroupRatio, null, 2),
    TopupGroupCreditRatio: JSON.stringify(topupGroupCreditRatio, null, 2),
    GroupMinTopup: JSON.stringify(groupMinTopup, null, 2),
    duplicateGroups: Array.from(duplicateGroups),
    hasEmptyGroup,
  };
};

export default function SettingsPaymentGateway(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [siteGroupNames, setSiteGroupNames] = useState([]);
  const [inputs, setInputs] = useState({
    PayAddress: '',
    EpayId: '',
    EpayKey: '',
    Price: 7.3,
    MinTopUp: 1,
    TopupGroupRatio: '',
    TopupGroupCreditRatio: '',
    GroupMinTopup: '',
    CustomCallbackAddress: '',
    PayMethods: '',
    AmountOptions: '',
    AmountDiscount: '',
    AmountGift: '',
    GroupAmountOverrides: '',
    AmountCustomDiscount: '0',
  });
  const [originInputs, setOriginInputs] = useState({});
  const [amountRows, setAmountRows] = useState([]);
  const [amountGroupDrafts, setAmountGroupDrafts] = useState({});
  const [groupRatioRows, setGroupRatioRows] = useState([]);
  const [expandedGroupPreviewRows, setExpandedGroupPreviewRows] = useState([]);
  const formApiRef = useRef(null);

  const knownGroupNames = useMemo(() => {
    if (siteGroupNames.length > 0) {
      return extractKnownGroupNames(siteGroupNames);
    }
    return extractKnownGroupNames(props.options?.GroupRatio || '');
  }, [siteGroupNames, props.options?.GroupRatio]);

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      try {
        const res = await API.get('/api/group/');
        const { success, message, data } = res.data;
        if (!success) {
          showError(message || t('获取组列表失败'));
          return;
        }
        if (cancelled) {
          return;
        }
        setSiteGroupNames(extractKnownGroupNames(data || []));
      } catch (error) {
        if (!cancelled) {
          showError(t('获取组列表失败'));
        }
      }
    };

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [props.options?.GroupRatio, t]);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      const currentInputs = {
        PayAddress: props.options.PayAddress || '',
        EpayId: props.options.EpayId || '',
        EpayKey: props.options.EpayKey || '',
        Price:
          props.options.Price !== undefined
            ? parseFloat(props.options.Price)
            : 7.3,
        MinTopUp:
          props.options.MinTopUp !== undefined
            ? parseFloat(props.options.MinTopUp)
            : 1,
        TopupGroupRatio: props.options.TopupGroupRatio || '',
        TopupGroupCreditRatio: props.options.TopupGroupCreditRatio || '',
        GroupMinTopup: props.options['payment_setting.group_min_topup'] || '',
        CustomCallbackAddress: props.options.CustomCallbackAddress || '',
        PayMethods: props.options.PayMethods || '',
        AmountOptions: props.options.AmountOptions || '',
        AmountDiscount: props.options.AmountDiscount || '',
        AmountGift: props.options.AmountGift || '',
        GroupAmountOverrides: props.options.GroupAmountOverrides || '',
        AmountCustomDiscount: '0',
      };

      setInputs(currentInputs);
      setOriginInputs({ ...currentInputs });
      setAmountRows(
        buildRowsFromConfig(
          currentInputs.AmountOptions,
          currentInputs.AmountDiscount,
          currentInputs.AmountGift,
          currentInputs.GroupAmountOverrides,
          knownGroupNames,
        ),
      );
      setAmountGroupDrafts({});
      setGroupRatioRows(
        buildGroupRatioRows(
          currentInputs.TopupGroupRatio,
          currentInputs.TopupGroupCreditRatio,
          currentInputs.GroupMinTopup,
          knownGroupNames,
        ),
      );
      setExpandedGroupPreviewRows([]);
      formApiRef.current.setValues(currentInputs);
    }
  }, [props.options]);

  useEffect(() => {
    const knownGroupSet = new Set(knownGroupNames);
    if (knownGroupSet.size === 0) {
      return;
    }

    setGroupRatioRows((prev) => {
      const nextRows = prev.filter((row) => {
        const trimmedGroup = String(row.group || '').trim();
        if (!trimmedGroup) {
          return true;
        }
        return knownGroupSet.has(trimmedGroup);
      });
      return nextRows.length === prev.length ? prev : nextRows;
    });

    setAmountRows((prev) => {
      let changed = false;
      const nextRows = prev.map((row) => {
        const nextOverrides = Object.fromEntries(
          Object.entries(row.groupOverrides || {}).filter(([groupName]) =>
            knownGroupSet.has(String(groupName || '').trim()),
          ),
        );
        if (Object.keys(nextOverrides).length === Object.keys(row.groupOverrides || {}).length) {
          return row;
        }
        changed = true;
        return normalizeRow({
          ...row,
          groupOverrides: nextOverrides,
        });
      });
      return changed ? nextRows : prev;
    });
  }, [knownGroupNames]);

  const handleFormChange = (values) => {
    setInputs((prev) => ({ ...prev, ...values }));
  };

  const updateAmountRow = (id, patch) => {
    setAmountRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const nextRow = { ...row, ...patch };
        return normalizeRow(nextRow);
      }),
    );
  };

  const handleRowAmountChange = (id, value) => {
    setAmountRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const amount = Number(value || 0);
        const discount = Number(row.discount || 1);
        return normalizeRow({
          ...row,
          amount,
          discountedPrice: amount > 0 ? amount * discount : 0,
        });
      }),
    );
  };

  const handleRowDiscountChange = (id, value) => {
    setAmountRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const discount = Number(value || 1);
        return normalizeRow({
          ...row,
          discount,
          discountedPrice: Number(row.amount || 0) * discount,
        });
      }),
    );
  };

  const handleRowDiscountedPriceChange = (id, value) => {
    setAmountRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const discountedPrice = Number(value || 0);
        const amount = Number(row.amount || 0);
        return normalizeRow({
          ...row,
          discountedPrice,
          discount: amount > 0 ? discountedPrice / amount : 1,
        });
      }),
    );
  };

  const addAmountRow = () => {
    setAmountRows((prev) => [...prev, createAmountRow(0, 1, 0)]);
  };

  const removeAmountRow = (id) => {
    setAmountRows((prev) => prev.filter((row) => row.id !== id));
  };

  const updateAmountGroupOverride = (id, groupName, patch) => {
    const trimmedGroupName = String(groupName || '').trim();
    if (!trimmedGroupName || trimmedGroupName === 'default') {
      return;
    }
    setAmountRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const normalizedRow = normalizeRow(row);
        const currentOverride = normalizedRow.groupOverrides?.[trimmedGroupName];
        return normalizeRow({
          ...normalizedRow,
          groupOverrides: {
            ...(normalizedRow.groupOverrides || {}),
            [trimmedGroupName]: {
              ...normalizeAmountGroupOverride(
                currentOverride,
                normalizedRow.discountedPrice,
                normalizedRow.gift,
                normalizedRow.amount,
              ),
              ...patch,
            },
          },
        });
      }),
    );
  };

  const addAmountGroupOverride = (id, groupName) => {
    const trimmedGroupName = String(groupName || '').trim();
    if (!trimmedGroupName || trimmedGroupName === 'default') {
      return;
    }
    const existingRow = amountRows.find((row) => row.id === id);
    if (existingRow?.groupOverrides?.[trimmedGroupName]) {
      showError(t('这个分组已经在当前档位配置过了'));
      return;
    }
    setAmountRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const normalizedRow = normalizeRow(row);
        return normalizeRow({
          ...normalizedRow,
          groupOverrides: {
            ...(normalizedRow.groupOverrides || {}),
            [trimmedGroupName]: createAmountGroupOverride(
              normalizedRow.discountedPrice,
              0,
              null,
            ),
          },
        });
      }),
    );
    setAmountGroupDrafts((prev) => ({ ...prev, [id]: '' }));
  };

  const removeAmountGroupOverride = (id, groupName) => {
    const trimmedGroupName = String(groupName || '').trim();
    if (!trimmedGroupName) {
      return;
    }
    setAmountRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const nextOverrides = { ...(row.groupOverrides || {}) };
        delete nextOverrides[trimmedGroupName];
        return normalizeRow({
          ...row,
          groupOverrides: nextOverrides,
        });
      }),
    );
  };

  const amountPreviewRows = useMemo(
    () =>
      amountRows.map((row) => {
        const normalizedRow = normalizeRow(row);
        return {
          ...normalizedRow,
          credited:
            Number(normalizedRow.amount || 0) + Number(normalizedRow.gift || 0),
        };
      }),
    [amountRows],
  );

  const knownGroupOptions = useMemo(
    () => knownGroupNames.map((groupName) => ({ label: groupName, value: groupName })),
    [knownGroupNames],
  );
  const knownTopupSpecialGroupOptions = useMemo(
    () =>
      knownGroupNames
        .filter((groupName) => groupName !== 'default')
        .map((groupName) => ({ label: groupName, value: groupName })),
    [knownGroupNames],
  );

  const groupRatioState = useMemo(
    () => serializeGroupRatioRows(groupRatioRows),
    [groupRatioRows],
  );

  const groupRatioPreviewBase = useMemo(
    () =>
      amountPreviewRows.find((row) => Number(row.amount || 0) > 0) || {
        amount: 10,
        credited: 10,
      },
    [amountPreviewRows],
  );

  const amountPreviewList = useMemo(
    () =>
      amountPreviewRows
        .filter((row) => Number(row.amount || 0) > 0)
        .sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0))
        .slice(0, 8),
    [amountPreviewRows],
  );

  const priceUnit = useMemo(() => {
    const parsedPrice = Number(inputs.Price);
    return Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 1;
  }, [inputs.Price]);

  const updateGroupRatioRow = (id, patch) => {
    setGroupRatioRows((prev) =>
      prev.map((row) =>
        row.id === id ? normalizeGroupRatioRow({ ...row, ...patch }) : row,
      ),
    );
  };

  const addGroupRatioRow = () => {
    setGroupRatioRows((prev) => [...prev, createGroupRatioRow('', 1, 1, '')]);
  };

  const removeGroupRatioRow = (id) => {
    setGroupRatioRows((prev) => prev.filter((row) => row.id !== id));
    setExpandedGroupPreviewRows((prev) => prev.filter((rowId) => rowId !== id));
  };

  const submitPayAddress = async () => {
    if (props.options.ServerAddress === '') {
      showError(t('请先填写服务器地址'));
      return;
    }

    if (groupRatioState.hasEmptyGroup) {
      showError(t('充值分组配置里存在空白分组名，请先补全或删除'));
      return;
    }

    if (groupRatioState.duplicateGroups.length > 0) {
      showError(
        t('充值分组配置里存在重复分组：') +
          groupRatioState.duplicateGroups.join(', '),
      );
      return;
    }

    const nextInputs = {
      ...inputs,
      TopupGroupRatio: groupRatioState.TopupGroupRatio,
      TopupGroupCreditRatio: groupRatioState.TopupGroupCreditRatio,
      GroupMinTopup: groupRatioState.GroupMinTopup,
    };

    if (originInputs.TopupGroupRatio !== nextInputs.TopupGroupRatio) {
      if (!verifyJSON(nextInputs.TopupGroupRatio)) {
        showError(t('充值分组倍率不是合法的 JSON 字符串'));
        return;
      }
    }

    if (
      originInputs.TopupGroupCreditRatio !== nextInputs.TopupGroupCreditRatio &&
      !verifyJSON(nextInputs.TopupGroupCreditRatio)
    ) {
      showError(t('充值到账分组倍率不是合法的 JSON 字符串'));
      return;
    }

    if (originInputs.PayMethods !== inputs.PayMethods) {
      if (!verifyJSON(inputs.PayMethods)) {
        showError(t('充值方式设置不是合法的 JSON 字符串'));
        return;
      }
    }

    const serializedRows = serializeRows(amountRows);
    nextInputs.AmountOptions = JSON.stringify(serializedRows.amountOptions, null, 2);
    nextInputs.AmountDiscount = JSON.stringify(
      serializedRows.amountDiscount,
      null,
      2,
    );
    nextInputs.AmountGift = JSON.stringify(serializedRows.amountGift, null, 2);
    nextInputs.GroupAmountOverrides = JSON.stringify(
      serializedRows.groupAmountOverrides,
      null,
      2,
    );
    nextInputs.AmountCustomDiscount = '0';

    setLoading(true);
    try {
      const options = [
        { key: 'PayAddress', value: removeTrailingSlash(inputs.PayAddress) },
        {
          key: 'payment_setting.amount_options',
          value: JSON.stringify(serializedRows.amountOptions),
        },
        {
          key: 'payment_setting.amount_discount',
          value: JSON.stringify(serializedRows.amountDiscount),
        },
        {
          key: 'payment_setting.amount_gift',
          value: JSON.stringify(serializedRows.amountGift),
        },
        {
          key: 'payment_setting.group_amount_overrides',
          value: JSON.stringify(serializedRows.groupAmountOverrides),
        },
        {
          key: 'payment_setting.custom_discount',
          value: '0',
        },
      ];

      if (inputs.EpayId !== '') {
        options.push({ key: 'EpayId', value: inputs.EpayId });
      }
      if (inputs.EpayKey !== undefined && inputs.EpayKey !== '') {
        options.push({ key: 'EpayKey', value: inputs.EpayKey });
      }
      if (inputs.Price !== '') {
        options.push({ key: 'Price', value: inputs.Price.toString() });
      }
      if (inputs.MinTopUp !== '') {
        options.push({ key: 'MinTopUp', value: inputs.MinTopUp.toString() });
      }
      if (inputs.CustomCallbackAddress !== undefined) {
        options.push({
          key: 'CustomCallbackAddress',
          value: inputs.CustomCallbackAddress,
        });
      }
      if (originInputs.TopupGroupRatio !== nextInputs.TopupGroupRatio) {
        options.push({
          key: 'TopupGroupRatio',
          value: nextInputs.TopupGroupRatio,
        });
      }
      if (
        originInputs.TopupGroupCreditRatio !== nextInputs.TopupGroupCreditRatio
      ) {
        options.push({
          key: 'TopupGroupCreditRatio',
          value: nextInputs.TopupGroupCreditRatio,
        });
      }
      if (originInputs.GroupMinTopup !== nextInputs.GroupMinTopup) {
        options.push({
          key: 'payment_setting.group_min_topup',
          value: nextInputs.GroupMinTopup,
        });
      }
      if (originInputs.PayMethods !== inputs.PayMethods) {
        options.push({ key: 'PayMethods', value: inputs.PayMethods });
      }

      const results = await Promise.all(
        options.map((opt) =>
          API.put('/api/option/', { key: opt.key, value: opt.value }),
        ),
      );

      const errorResults = results.filter((res) => !res.data.success);
      if (errorResults.length > 0) {
        errorResults.forEach((res) => showError(res.data.message));
      } else {
        showSuccess(t('更新成功'));
        setInputs(nextInputs);
        setOriginInputs({ ...nextInputs });
        formApiRef.current?.setValues(nextInputs);
        props.refresh && props.refresh();
      }
    } catch (_) {
      showError(t('更新失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={handleFormChange}
        getFormApi={(api) => (formApiRef.current = api)}
      >
        <Form.Section text={t('支付设置')}>
          <Text>
            {t(
              '当前在线支付仍按已有网关配置生效，下面的可视化档位会同步到钱包充值页面与到账展示。',
            )}
          </Text>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} md={8}>
              <Form.Input
                field='PayAddress'
                label={t('支付地址')}
                placeholder={t('例如：https://yourdomain.com')}
              />
            </Col>
            <Col xs={24} md={8}>
              <Form.Input
                field='EpayId'
                label={t('易支付商户 ID')}
                placeholder={t('例如：1001')}
              />
            </Col>
            <Col xs={24} md={8}>
              <Form.Input
                field='EpayKey'
                label={t('易支付商户密钥')}
                placeholder={t('敏感信息不会回显到前端')}
                type='password'
              />
            </Col>
          </Row>

          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} md={8}>
              <Form.Input
                field='CustomCallbackAddress'
                label={t('回调地址')}
                placeholder={t('例如：https://yourdomain.com')}
              />
            </Col>
            <Col xs={24} md={8}>
              <Form.InputNumber
                field='Price'
                precision={2}
                label={t('充值价格（x 元 = 1 美元）')}
                placeholder={t('例如：7.3')}
              />
            </Col>
            <Col xs={24} md={8}>
              <Form.InputNumber
                field='MinTopUp'
                label={t('默认最低充值数量')}
                placeholder={t('例如：1')}
                extraText={t('未单独配置分组最低充值数量时，将使用这里的默认值。')}
              />
            </Col>
          </Row>

          <Divider margin='20px' />
          <div className='mb-3 flex flex-wrap items-start justify-between gap-3'>
            <div>
              <Typography.Title heading={6} style={{ marginBottom: 4 }}>
                {t('充值分组可视化配置')}
              </Typography.Title>
              <Text type='tertiary'>
                {t(
                  '支付倍率现在只作用于自定义充值数量；下方固定档位的折后价和赠送金额完全独立，不会再叠加支付倍率。余额换算倍率仍只用于切换分组或兑换卡密后的余额换算。',
                )}
              </Text>
            </div>
            <Button icon={<IconPlus />} theme='outline' onClick={addGroupRatioRow}>
              {t('添加规则')}
            </Button>
          </div>

          <div className='mb-3 text-xs text-semi-color-text-2'>
            <Text type='tertiary'>
              {t('当前示例档位：充值 {{amount}}，原到账 {{credited}}', {
                amount: Number(groupRatioPreviewBase.amount || 0).toFixed(0),
                credited: Number(
                  groupRatioPreviewBase.credited ||
                    groupRatioPreviewBase.amount ||
                    0,
                ).toFixed(0),
              })}
            </Text>
          </div>

          {groupRatioRows.length === 0 ? (
            <div className='py-2 text-xs text-semi-color-text-2'>
              <Text type='tertiary'>
                {t('暂无规则，点击上方按钮后再选择用户组。')}
              </Text>
            </div>
          ) : (
            <div>
              {groupRatioRows.map((row, index) => {
                const previewCredit = Math.max(
                  Number(groupRatioPreviewBase.amount || 0),
                  Math.round(
                    Number(
                      groupRatioPreviewBase.credited ||
                        groupRatioPreviewBase.amount ||
                        0,
                    ) * Number(row.creditRatio || 1),
                  ),
                );
                const isPreviewExpanded = expandedGroupPreviewRows.includes(row.id);

                return (
                  <div
                    key={row.id}
                    className={
                      index === 0
                        ? 'py-3'
                        : 'border-t border-[var(--semi-color-border)] py-3'
                    }
                  >
                    <Row gutter={12}>
                      <Col xs={24} md={5}>
                        <div className='mb-1 text-xs text-semi-color-text-2'>
                          {t('用户组')}
                        </div>
                        <Select
                          filter
                          allowCreate
                          showClear
                          value={row.group || undefined}
                          optionList={
                            row.group &&
                            !knownGroupOptions.some(
                              (option) => option.value === row.group,
                            )
                              ? [
                                  ...knownGroupOptions,
                                  { label: row.group, value: row.group },
                                ]
                              : knownGroupOptions
                          }
                          placeholder={t('选择用户组')}
                          onChange={(value) =>
                            updateGroupRatioRow(row.id, { group: value || '' })
                          }
                        />
                      </Col>
                      <Col xs={12} md={3}>
                        <div className='mb-1 text-xs text-semi-color-text-2'>
                          {t('支付倍率')}
                        </div>
                        <InputNumber
                          value={row.payRatio}
                          min={0.0001}
                          precision={4}
                          step={0.1}
                          style={{ width: '100%' }}
                          onChange={(value) =>
                            updateGroupRatioRow(row.id, {
                              payRatio: Number(value || 1),
                            })
                          }
                        />
                      </Col>
                      <Col xs={12} md={4}>
                        <div className='mb-1 text-xs text-semi-color-text-2'>
                          {t('余额换算倍率')}
                        </div>
                        <InputNumber
                          value={row.creditRatio}
                          min={0.0001}
                          precision={4}
                          step={0.1}
                          style={{ width: '100%' }}
                          onChange={(value) =>
                            updateGroupRatioRow(row.id, {
                              creditRatio: Number(value || 1),
                            })
                          }
                        />
                      </Col>
                      <Col xs={12} md={4}>
                        <div className='mb-1 text-xs text-semi-color-text-2'>
                          {t('最低充值数量')}
                        </div>
                        <InputNumber
                          value={row.minTopup}
                          min={0}
                          precision={0}
                          placeholder={String(inputs.MinTopUp || 1)}
                          style={{ width: '100%' }}
                          onChange={(value) =>
                            updateGroupRatioRow(row.id, {
                              minTopup: normalizeMinTopupValue(value),
                            })
                          }
                        />
                      </Col>
                      <Col xs={24} md={4}>
                        <div className='mb-1 text-xs text-semi-color-text-2'>
                          {t('换算预览')}
                        </div>
                        <div className='px-1 py-2'>
                          <Text strong>{previewCredit.toFixed(0)}</Text>
                          <div className='mt-1 text-xs text-semi-color-text-2'>
                            {`${row.payRatio.toFixed(4)}x / ${row.creditRatio.toFixed(
                              4,
                            )}x / min ${Number(
                              row.minTopup || inputs.MinTopUp || 1,
                            ).toFixed(0)}`}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} md={4}>
                        <div className='flex h-full flex-wrap items-end justify-end gap-2 md:pt-6'>
                          {amountPreviewList.length > 0 && (
                            <Button
                              theme='borderless'
                              onClick={() =>
                                setExpandedGroupPreviewRows((prev) =>
                                  prev.includes(row.id)
                                    ? prev.filter((item) => item !== row.id)
                                    : [...prev, row.id],
                                )
                              }
                            >
                              {isPreviewExpanded
                                ? t('隐藏档位预览')
                                : t('查看档位预览')}
                            </Button>
                          )}
                          <Button
                            theme='borderless'
                            type='danger'
                            onClick={() => removeGroupRatioRow(row.id)}
                          >
                            {t('删除')}
                          </Button>
                        </div>
                      </Col>
                    </Row>

                    {isPreviewExpanded && amountPreviewList.length > 0 && (
                      <div className='mt-2 border-l-2 border-[var(--semi-color-border)] pl-3'>
                        <div className='mb-2 text-xs text-semi-color-text-2'>
                          {t('当前分组档位预览')}
                        </div>
                        <div className='flex flex-wrap gap-x-4 gap-y-2 text-xs text-semi-color-text-1'>
                          {amountPreviewList.map((amountRow) => {
                            const currentGroupOverride =
                              amountRow.groupOverrides?.[row.group] || null;
                            const previewAmount = Number(
                              currentGroupOverride?.amount || amountRow.amount || 0,
                            );
                            const previewGift = Number(
                              currentGroupOverride?.gift ?? amountRow.gift ?? 0,
                            );
                            const previewDiscountedPrice = Number(
                              currentGroupOverride?.discountedPrice || 0,
                            );
                            const baseDiscountedPrice =
                              previewDiscountedPrice > 0
                                ? previewDiscountedPrice
                                : Number(amountRow.discountedPrice || 0) > 0
                                  ? Number(amountRow.discountedPrice || 0)
                                  : previewAmount;
                            const creditedText = `${Number(
                              previewAmount + previewGift,
                            ).toFixed(0)}${
                              previewGift > 0
                                ? ` (${t('赠送')} ${Number(
                                    previewGift,
                                  ).toFixed(0)})`
                                : ''
                            }`;
                            return (
                              <div key={`${row.id}-${amountRow.id}`}>
                                {t('充值 {{amount}}', {
                                  amount: previewAmount.toFixed(0),
                                })}
                                {` / ${t('实付')} ${baseDiscountedPrice.toFixed(2)} / ${t(
                                  '到账',
                                )} ${creditedText}`}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {(groupRatioState.hasEmptyGroup ||
            groupRatioState.duplicateGroups.length > 0) && (
            <div style={{ marginTop: 12 }}>
              {groupRatioState.hasEmptyGroup && (
                <Text type='danger'>{t('存在空白分组名，请先补全或删除。')}</Text>
              )}
              {groupRatioState.duplicateGroups.length > 0 && (
                <div>
                  <Text type='danger'>
                    {t('存在重复分组：') +
                      groupRatioState.duplicateGroups.join(', ')}
                  </Text>
                </div>
              )}
            </div>
          )}

          <Form.TextArea
            field='PayMethods'
            label={t('充值方式设置')}
            placeholder={t('请输入 JSON 文本')}
            autosize
          />

          <Divider margin='20px' />
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div>
              <Typography.Title heading={6} style={{ marginBottom: 4 }}>
                {t('充值档位可视化配置')}
              </Typography.Title>
              <Text type='tertiary'>
                {t(
                  '这里按档位配置默认折后价、默认赠送金额，以及指定分组自己的折后价和赠送金额。固定档位价格独立生效，不会再被上面的支付倍率二次打折。',
                )}
              </Text>
            </div>
            <Button theme='outline' onClick={addAmountRow}>
              {t('新增档位')}
            </Button>
          </div>

          {amountPreviewRows.length === 0 ? (
            <div className='py-2 text-xs text-semi-color-text-2'>
              <Text type='tertiary'>
                {t('这里不会默认展开任何档位。只有你手动新增的充值档位，才会显示在下面。')}
              </Text>
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
              {amountPreviewRows.map((row) => {
                const configuredGroupNames = Object.keys(row.groupOverrides || {}).sort(
                  (a, b) => a.localeCompare(b),
                );
                const rowGroupSelectOptions = buildSelectOptions(
                  knownTopupSpecialGroupOptions,
                  amountGroupDrafts[row.id],
                );

                return (
                  <div
                    key={row.id}
                    className='rounded-xl border border-[var(--semi-color-border)] px-4 py-3'
                  >
                    <div className='mb-3 flex items-center justify-between gap-3'>
                      <Text strong>
                        {t('充值档位')} {Number(row.amount || 0).toFixed(0)}
                      </Text>
                      <Button
                        theme='borderless'
                        type='danger'
                        onClick={() => removeAmountRow(row.id)}
                      >
                        {t('删除')}
                      </Button>
                    </div>

                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(96px,112px)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(96px,112px)_minmax(152px,180px)]'>
                      <div className='min-w-0'>
                        <div className='mb-1 whitespace-nowrap text-xs text-semi-color-text-2'>
                          {t('充值数量')}
                        </div>
                        <InputNumber
                          value={row.amount}
                          min={0}
                          precision={0}
                          style={{ width: '100%' }}
                          onChange={(value) => handleRowAmountChange(row.id, value)}
                        />
                      </div>
                      <div className='min-w-0'>
                        <div className='mb-1 whitespace-nowrap text-xs text-semi-color-text-2'>
                          {t('default 折后价')}
                        </div>
                        <InputNumber
                          value={row.discountedPrice}
                          min={0}
                          precision={2}
                          step={1}
                          style={{ width: '100%' }}
                          onChange={(value) =>
                            handleRowDiscountedPriceChange(row.id, value)
                          }
                        />
                      </div>
                      <div className='min-w-0'>
                        <div className='mb-1 whitespace-nowrap text-xs text-semi-color-text-2'>
                          {t('default 赠送金额')}
                        </div>
                        <InputNumber
                          value={row.gift}
                          min={0}
                          precision={0}
                          style={{ width: '100%' }}
                          onChange={(value) =>
                            updateAmountRow(row.id, {
                              gift: Math.round(Number(value || 0)),
                            })
                          }
                        />
                      </div>
                      <div className='min-w-0'>
                        <div className='mb-1 whitespace-nowrap text-xs text-semi-color-text-2'>
                          {t('默认折扣')}
                        </div>
                        <InputNumber
                          value={row.discount}
                          min={0.0001}
                          precision={4}
                          step={0.05}
                          style={{ width: '100%' }}
                          onChange={(value) => handleRowDiscountChange(row.id, value)}
                        />
                      </div>
                      <div className='min-w-0'>
                        <div className='mb-1 whitespace-nowrap text-xs text-semi-color-text-2'>
                          {t('default 预览')}
                        </div>
                        <div className='flex h-[32px] min-w-0 items-center gap-2 overflow-hidden rounded-lg bg-semi-color-fill-0 px-3 text-[11px] text-semi-color-text-1'>
                          <div className='truncate whitespace-nowrap'>
                            {t('到账')} {Number(row.credited).toFixed(0)}
                          </div>
                          <div className='text-semi-color-text-3'>/</div>
                          <div className='truncate whitespace-nowrap'>
                            {t('实付')} {Number(row.discountedPrice || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className='mt-3 border-t border-[var(--semi-color-border)] pt-3'>
                      <div className='mb-2 grid grid-cols-1 gap-3 xl:grid-cols-[96px_minmax(0,1fr)_auto] xl:items-center'>
                        <div className='whitespace-nowrap text-xs text-semi-color-text-2'>
                          {t('特殊分组价格')}
                        </div>
                        <div className='flex min-w-0 flex-wrap items-center gap-2 xl:flex-nowrap'>
                          <Select
                            style={{ width: '100%', minWidth: 0, maxWidth: 260 }}
                            filter
                            allowCreate
                            showClear
                            placeholder={t('选择一个特殊分组')}
                            optionList={rowGroupSelectOptions}
                            value={amountGroupDrafts[row.id] || undefined}
                            onChange={(value) =>
                              setAmountGroupDrafts((prev) => ({
                                ...prev,
                                [row.id]: value || '',
                              }))
                            }
                          />
                          <Button
                            theme='outline'
                            onClick={() =>
                              addAmountGroupOverride(row.id, amountGroupDrafts[row.id])
                            }
                            disabled={!String(amountGroupDrafts[row.id] || '').trim()}
                          >
                            {t('新增分组配置')}
                          </Button>
                        </div>
                      </div>

                      {configuredGroupNames.length === 0 ? (
                        <div className='text-xs text-semi-color-text-2'>
                          {t('当前这个档位还没有单独配置的分组价格。')}
                        </div>
                      ) : (
                        <div className='grid grid-cols-1 gap-2'>
                          {configuredGroupNames.map((groupName) => {
                            const groupOverride = normalizeAmountGroupOverride(
                              row.groupOverrides?.[groupName],
                              row.discountedPrice,
                              row.gift,
                              row.amount,
                            );
                            const effectiveGroupAmount = Number(
                              groupOverride.amount || row.amount || 0,
                            );
                            const groupCreditPreview =
                              effectiveGroupAmount + Number(groupOverride.gift || 0);
                            return (
                              <div
                                key={`${row.id}-${groupName}`}
                                className='rounded-lg border border-[var(--semi-color-border)] px-3 py-3'
                              >
                                <div className='grid grid-cols-1 gap-3 xl:grid-cols-[96px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(152px,180px)_auto] xl:items-end'>
                                  <div className='min-w-0'>
                                    <div className='mb-1 whitespace-nowrap text-xs text-semi-color-text-2'>
                                      {t('分组')}
                                    </div>
                                    <div className='flex h-[32px] items-center whitespace-nowrap px-1 text-sm font-semibold text-semi-color-text-0'>
                                      {groupName}
                                    </div>
                                  </div>
                                  <div className='min-w-0'>
                                    <div className='mb-1 whitespace-nowrap text-xs text-semi-color-text-2'>
                                      {t('{{group}} 充值数量', { group: groupName })}
                                    </div>
                                    <InputNumber
                                      value={groupOverride.amount}
                                      min={0}
                                      precision={0}
                                      placeholder={String(row.amount || 0)}
                                      style={{ width: '100%' }}
                                      onChange={(value) =>
                                        updateAmountGroupOverride(row.id, groupName, {
                                          amount:
                                            Number(value || 0) > 0
                                              ? Math.round(Number(value || 0))
                                              : null,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className='min-w-0'>
                                    <div className='mb-1 whitespace-nowrap text-xs text-semi-color-text-2'>
                                      {t('{{group}} 折后价', { group: groupName })}
                                    </div>
                                    <InputNumber
                                      value={groupOverride.discountedPrice}
                                      min={0}
                                      precision={2}
                                      step={1}
                                      style={{ width: '100%' }}
                                      onChange={(value) =>
                                        updateAmountGroupOverride(row.id, groupName, {
                                          discountedPrice: Number(value || 0),
                                        })
                                      }
                                    />
                                  </div>
                                  <div className='min-w-0'>
                                    <div className='mb-1 whitespace-nowrap text-xs text-semi-color-text-2'>
                                      {t('{{group}} 赠送金额', { group: groupName })}
                                    </div>
                                    <InputNumber
                                      value={groupOverride.gift}
                                      min={0}
                                      precision={0}
                                      style={{ width: '100%' }}
                                      onChange={(value) =>
                                        updateAmountGroupOverride(row.id, groupName, {
                                          gift: Math.round(Number(value || 0)),
                                        })
                                      }
                                    />
                                  </div>
                                  <div className='min-w-0'>
                                    <div className='mb-1 whitespace-nowrap text-xs text-semi-color-text-2'>
                                      {t('{{group}} 预览', { group: groupName })}
                                    </div>
                                    <div className='flex h-[32px] min-w-0 items-center gap-2 overflow-hidden rounded-lg bg-semi-color-fill-0 px-3 text-[11px] text-semi-color-text-1'>
                                      <div className='truncate whitespace-nowrap'>
                                        {t('到账')} {groupCreditPreview.toFixed(0)}
                                      </div>
                                      <div className='text-semi-color-text-3'>/</div>
                                      <div className='truncate whitespace-nowrap'>
                                        {t('数量')} {effectiveGroupAmount.toFixed(0)}
                                      </div>
                                      <div className='text-semi-color-text-3'>/</div>
                                      <div className='truncate whitespace-nowrap'>
                                        {t('实付')} {Number(groupOverride.discountedPrice || 0).toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className='flex items-end xl:justify-end'>
                                    <Button
                                      theme='borderless'
                                      type='danger'
                                      onClick={() =>
                                        removeAmountGroupOverride(row.id, groupName)
                                      }
                                    >
                                      {t('删除')}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <Button onClick={submitPayAddress}>{t('更新支付设置')}</Button>
          </div>
        </Form.Section>
      </Form>
    </Spin>
  );
}
