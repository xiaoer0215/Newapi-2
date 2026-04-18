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

import React, { useEffect, useState, useContext, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  API,
  showError,
  showInfo,
  showSuccess,
  renderQuota,
  renderQuotaWithAmount,
  copy,
  getQuotaPerUnit,
} from '../../helpers';
import { Modal, Toast } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';

import RechargeCard from './RechargeCard';
import InvitationCard from './InvitationCard';
import TransferModal from './modals/TransferModal';
import PaymentConfirmModal from './modals/PaymentConfirmModal';
import TopupHistoryModal from './modals/TopupHistoryModal';

const MSG_REQUEST_FAILED = '\u8bf7\u6c42\u5931\u8d25';
const MSG_TOPUP_LINK_MISSING =
  '\u8d85\u7ea7\u7ba1\u7406\u5458\u672a\u8bbe\u7f6e\u5145\u503c\u94fe\u63a5\uff01';
const MSG_STRIPE_DISABLED =
  '\u7ba1\u7406\u5458\u672a\u5f00\u542f Stripe \u5145\u503c\uff01';
const MSG_ONLINE_DISABLED =
  '\u7ba1\u7406\u5458\u672a\u5f00\u542f\u5728\u7ebf\u5145\u503c\uff01';
const MSG_GET_AMOUNT_FAILED = '\u83b7\u53d6\u91d1\u989d\u5931\u8d25';
const MSG_PAYMENT_FAILED = '\u652f\u4ed8\u5931\u8d25';
const MSG_PAYMENT_REQUEST_FAILED = '\u652f\u4ed8\u8bf7\u6c42\u5931\u8d25';
const MSG_CREEM_DISABLED =
  '\u7ba1\u7406\u5458\u672a\u5f00\u542f Creem \u5145\u503c\uff01';
const MSG_SELECT_PRODUCT = '\u8bf7\u9009\u62e9\u4ea7\u54c1';
const MSG_UPDATE_SUCCESS = '\u66f4\u65b0\u6210\u529f';
const MSG_UPDATE_FAILED = '\u66f4\u65b0\u5931\u8d25';
const MSG_TRANSFER_MIN = '\u5212\u8f6c\u91d1\u989d\u6700\u4f4e\u4e3a';
const MSG_AFF_LINK_COPIED =
  '\u9080\u8bf7\u94fe\u63a5\u5df2\u590d\u5236\u5230\u526a\u5207\u677f';
const MSG_CREEM_CONFIRM_TITLE = '\u786e\u5b9a\u8981\u5145\u503c\uff1f';
const MSG_REDEEM_SUCCESS_QUOTA = '\u6210\u529f\u5151\u6362\u989d\u5ea6\uff1a';
const MSG_PRODUCT_CONFIG_INVALID =
  '\u4ea7\u54c1\u914d\u7f6e\u9519\u8bef\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458';
const MSG_TOPUP_QUOTA = '\u5145\u503c\u989d\u5ea6';

const TopUp = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [userState, userDispatch] = useContext(UserContext);
  const [statusState] = useContext(StatusContext);

  const [redemptionCode, setRedemptionCode] = useState('');
  const [amount, setAmount] = useState(0.0);
  const [minTopUp, setMinTopUp] = useState(statusState?.status?.min_topup || 1);
  const [topUpCount, setTopUpCount] = useState(
    statusState?.status?.min_topup || 1,
  );
  const [topUpLink, setTopUpLink] = useState(
    statusState?.status?.top_up_link || '',
  );
  const [enableOnlineTopUp, setEnableOnlineTopUp] = useState(
    statusState?.status?.enable_online_topup || false,
  );
  const [priceRatio, setPriceRatio] = useState(statusState?.status?.price || 1);

  const [enableStripeTopUp, setEnableStripeTopUp] = useState(
    statusState?.status?.enable_stripe_topup || false,
  );
  const [statusLoading, setStatusLoading] = useState(true);

  // Creem state
  const [creemProducts, setCreemProducts] = useState([]);
  const [enableCreemTopUp, setEnableCreemTopUp] = useState(false);
  const [creemOpen, setCreemOpen] = useState(false);
  const [selectedCreemProduct, setSelectedCreemProduct] = useState(null);

  // Waffo state
  const [enableWaffoTopUp, setEnableWaffoTopUp] = useState(false);
  const [waffoPayMethods, setWaffoPayMethods] = useState([]);
  const [waffoMinTopUp, setWaffoMinTopUp] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [payWay, setPayWay] = useState('');
  const [amountLoading, setAmountLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [payMethods, setPayMethods] = useState([]);

  const affFetchedRef = useRef(false);

  // Invitation state
  const [affLink, setAffLink] = useState('');
  const [openTransfer, setOpenTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState(0);

  // History modal state
  const [openHistory, setOpenHistory] = useState(false);

  // Subscription data
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [billingPreference, setBillingPreference] =
    useState('subscription_first');
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [allSubscriptions, setAllSubscriptions] = useState([]);

  // Preset recharge options
  const [presetAmounts, setPresetAmounts] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Recharge configuration
  const [topupInfo, setTopupInfo] = useState({
    amount_options: [],
    discount: {},
    gift: {},
    custom_discount: 0,
    auto_delivery_products: null,
  });

  const topUp = async () => {
    if (redemptionCode === '') {
      showInfo(t('请输入兑换码'));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.post('/api/user/topup', {
        key: redemptionCode,
      });
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(t('兑换成功'));
        Modal.success({
          title: t('兑换成功'),
          content: t(MSG_REDEEM_SUCCESS_QUOTA) + renderQuota(data),
          centered: true,
        });
        if (userState.user) {
          const updatedUser = {
            ...userState.user,
            quota: userState.user.quota + data,
          };
          userDispatch({ type: 'login', payload: updatedUser });
        }
        setRedemptionCode('');
      } else {
        showError(message);
      }
    } catch (err) {
      showError(t(MSG_REQUEST_FAILED));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTopUpLink = () => {
    if (!topUpLink) {
      showError(t(MSG_TOPUP_LINK_MISSING));
      return;
    }
    window.open(topUpLink, '_blank');
  };

  const preTopUp = async (payment) => {
    if (payment === 'stripe') {
      if (!enableStripeTopUp) {
        showError(t(MSG_STRIPE_DISABLED));
        return;
      }
    } else {
      if (!enableOnlineTopUp) {
        showError(t(MSG_ONLINE_DISABLED));
        return;
      }
    }

    setPayWay(payment);
    setPaymentLoading(true);
    try {
      if (payment === 'stripe') {
        await getStripeAmount();
      } else {
        await getAmount();
      }

      if (topUpCount < minTopUp) {
        showError(t('充值数量不能小于 ') + minTopUp);
        return;
      }
      setOpen(true);
    } catch (error) {
      showError(t(MSG_GET_AMOUNT_FAILED));
    } finally {
      setPaymentLoading(false);
    }
  };

  const onlineTopUp = async () => {
    if (payWay === 'stripe') {
      // Stripe payment flow
      if (amount === 0) {
        await getStripeAmount();
      }
    } else {
      // Standard payment flow
      if (amount === 0) {
        await getAmount();
      }
    }

    if (topUpCount < minTopUp) {
      showError(t('充值数量不能小于 ') + minTopUp);
      return;
    }
    setConfirmLoading(true);
    try {
      let res;
      if (payWay === 'stripe') {
        // Stripe payment request
        res = await API.post('/api/user/stripe/pay', {
          amount: parseInt(topUpCount),
          payment_method: 'stripe',
        });
      } else {
        // Standard payment request
        res = await API.post('/api/user/pay', {
          amount: parseInt(topUpCount),
          payment_method: payWay,
        });
      }

      if (res !== undefined) {
        const { message, data } = res.data;
        if (message === 'success') {
          if (payWay === 'stripe') {
            // Stripe payment callback
            window.open(data.pay_link, '_blank');
          } else {
            // Submit the standard payment form
            let params = data;
            let url = res.data.url;
            let form = document.createElement('form');
            form.action = url;
            form.method = 'POST';
            let isSafari =
              navigator.userAgent.indexOf('Safari') > -1 &&
              navigator.userAgent.indexOf('Chrome') < 1;
            if (!isSafari) {
              form.target = '_blank';
            }
            for (let key in params) {
              let input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = params[key];
              form.appendChild(input);
            }
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
          }
        } else {
          const errorMsg =
            typeof data === 'string' ? data : message || t(MSG_PAYMENT_FAILED);
          showError(errorMsg);
        }
      } else {
        showError(res);
      }
    } catch (err) {
      showError(t(MSG_PAYMENT_REQUEST_FAILED));
    } finally {
      setOpen(false);
      setConfirmLoading(false);
    }
  };

  const creemPreTopUp = async (product) => {
    if (!enableCreemTopUp) {
      showError(t(MSG_CREEM_DISABLED));
      return;
    }
    setSelectedCreemProduct(product);
    setCreemOpen(true);
  };

  const onlineCreemTopUp = async () => {
    if (!selectedCreemProduct) {
      showError(t(MSG_SELECT_PRODUCT));
      return;
    }
    // Validate product has required fields
    if (!selectedCreemProduct.productId) {
      showError(t(MSG_PRODUCT_CONFIG_INVALID));
      return;
    }
    setConfirmLoading(true);
    try {
      const res = await API.post('/api/user/creem/pay', {
        product_id: selectedCreemProduct.productId,
        payment_method: 'creem',
      });
      if (res !== undefined) {
        const { message, data } = res.data;
        if (message === 'success') {
          processCreemCallback(data);
        } else {
          const errorMsg =
            typeof data === 'string' ? data : message || t(MSG_PAYMENT_FAILED);
          showError(errorMsg);
        }
      } else {
        showError(res);
      }
    } catch (err) {
      showError(t(MSG_PAYMENT_REQUEST_FAILED));
    } finally {
      setCreemOpen(false);
      setConfirmLoading(false);
    }
  };

  const waffoTopUp = async (payMethodIndex) => {
    try {
      if (topUpCount < waffoMinTopUp) {
        showError(t('充值数量不能小于 ') + waffoMinTopUp);
        return;
      }
      setPaymentLoading(true);
      const requestBody = {
        amount: parseInt(topUpCount),
      };
      if (payMethodIndex != null) {
        requestBody.pay_method_index = payMethodIndex;
      }
      const res = await API.post('/api/user/waffo/pay', requestBody);
      if (res !== undefined) {
        const { message, data } = res.data;
        if (message === 'success' && data?.payment_url) {
          window.open(data.payment_url, '_blank');
        } else {
          showError(data || t(MSG_PAYMENT_REQUEST_FAILED));
        }
      } else {
        showError(res);
      }
    } catch (e) {
      showError(t(MSG_PAYMENT_REQUEST_FAILED));
    } finally {
      setPaymentLoading(false);
    }
  };

  const processCreemCallback = (data) => {
    // Keep the checkout handoff consistent with Stripe.
    window.open(data.checkout_url, '_blank');
  };

  const getUserQuota = async () => {
    let res = await API.get(`/api/user/self`);
    const { success, message, data } = res.data;
    if (success) {
      userDispatch({ type: 'login', payload: data });
    } else {
      showError(message);
    }
  };

  const getSubscriptionPlans = async () => {
    setSubscriptionLoading(true);
    try {
      const res = await API.get('/api/subscription/plans');
      if (res.data?.success) {
        setSubscriptionPlans(res.data.data || []);
      }
    } catch (e) {
      setSubscriptionPlans([]);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const getSubscriptionSelf = async () => {
    try {
      const res = await API.get('/api/subscription/self');
      if (res.data?.success) {
        setBillingPreference(
          res.data.data?.billing_preference || 'subscription_first',
        );
        // Active subscriptions
        const activeSubs = res.data.data?.subscriptions || [];
        setActiveSubscriptions(activeSubs);
        // All subscriptions (including expired)
        const allSubs = res.data.data?.all_subscriptions || [];
        setAllSubscriptions(allSubs);
      }
    } catch (e) {
      // ignore
    }
  };

  const updateBillingPreference = async (pref) => {
    const previousPref = billingPreference;
    setBillingPreference(pref);
    try {
      const res = await API.put('/api/subscription/self/preference', {
        billing_preference: pref,
      });
      if (res.data?.success) {
        showSuccess(t(MSG_UPDATE_SUCCESS));
        const normalizedPref =
          res.data?.data?.billing_preference || pref || previousPref;
        setBillingPreference(normalizedPref);
      } else {
        showError(res.data?.message || t(MSG_UPDATE_FAILED));
        setBillingPreference(previousPref);
      }
    } catch (e) {
      showError(t(MSG_REQUEST_FAILED));
      setBillingPreference(previousPref);
    }
  };

  // Load recharge configuration
  const getTopupInfo = async () => {
    try {
      const res = await API.get('/api/user/topup/info');
      const { message, data, success } = res.data;
      if (success) {
        setTopupInfo({
          amount_options: data.amount_options || [],
          discount: data.discount || {},
          gift: data.gift || {},
          custom_discount: data.custom_discount || 0,
          auto_delivery_products: data.auto_delivery_products || null,
        });

        // Normalize payment methods
        let payMethods = data.pay_methods || [];
        try {
          if (typeof payMethods === 'string') {
            payMethods = JSON.parse(payMethods);
          }
          if (payMethods && payMethods.length > 0) {
            // Require both name and type.
            payMethods = payMethods.filter((method) => {
              return method.name && method.type;
            });
            // Fill a default color when one is missing.
            payMethods = payMethods.map((method) => {
              // Normalize the minimum top-up value.
              const normalizedMinTopup = Number(method.min_topup);
              method.min_topup = Number.isFinite(normalizedMinTopup)
                ? normalizedMinTopup
                : 0;

              // Prefer the backend-provided Stripe minimum top-up.
              if (
                method.type === 'stripe' &&
                (!method.min_topup || method.min_topup <= 0)
              ) {
                const stripeMin = Number(data.stripe_min_topup);
                if (Number.isFinite(stripeMin)) {
                  method.min_topup = stripeMin;
                }
              }

              if (!method.color) {
                if (method.type === 'alipay') {
                  method.color = 'rgba(var(--semi-blue-5), 1)';
                } else if (method.type === 'wxpay') {
                  method.color = 'rgba(var(--semi-green-5), 1)';
                } else if (method.type === 'stripe') {
                  method.color = 'rgba(var(--semi-purple-5), 1)';
                } else {
                  method.color = 'rgba(var(--semi-primary-5), 1)';
                }
              }
              return method;
            });
          } else {
            payMethods = [];
          }

          // Stripe fallback insertion is handled by the backend now.

          setPayMethods(payMethods);
          const enableStripeTopUp = data.enable_stripe_topup || false;
          const enableOnlineTopUp = data.enable_online_topup || false;
          const enableCreemTopUp = data.enable_creem_topup || false;
          const minTopUpValue = enableOnlineTopUp
            ? data.min_topup
            : enableStripeTopUp
              ? data.stripe_min_topup
              : data.enable_waffo_topup
                ? data.waffo_min_topup
                : 1;
          setEnableOnlineTopUp(enableOnlineTopUp);
          setEnableStripeTopUp(enableStripeTopUp);
          setEnableCreemTopUp(enableCreemTopUp);
          const enableWaffoTopUp = data.enable_waffo_topup || false;
          setEnableWaffoTopUp(enableWaffoTopUp);
          setWaffoPayMethods(data.waffo_pay_methods || []);
          setWaffoMinTopUp(data.waffo_min_topup || 1);
          setMinTopUp(minTopUpValue);
          setTopUpCount(minTopUpValue);

          // Load Creem products.
          try {
            const products = JSON.parse(data.creem_products || '[]');
            setCreemProducts(products);
          } catch (e) {
            setCreemProducts([]);
          }

          // Generate presets from the minimum top-up when none are configured.
          if (!data.amount_options || data.amount_options.length === 0) {
            setPresetAmounts(generatePresetAmounts(minTopUpValue));
          }

          // Initialize the displayed payment amount.
          getAmount(minTopUpValue);
        } catch (e) {
          setPayMethods([]);
        }

        // Replace generated presets with configured amount options when available.
        if (data.amount_options && data.amount_options.length > 0) {
          const customPresets = data.amount_options.map((amount) => ({
            value: amount,
            discount: data.discount[amount] || 1.0,
            gift: data.gift?.[amount] || 0,
            credit_amount: amount + (data.gift?.[amount] || 0),
          }));
          setPresetAmounts(customPresets);
        }
      } else {
        showError(data || t('获取充值配置失败'));
      }
    } catch (error) {
      showError(t('获取充值配置异常'));
    } finally {
      setStatusLoading(false);
    }
  };

  // Load invitation link
  const getAffLink = async () => {
    const res = await API.get('/api/user/aff');
    const { success, message, data } = res.data;
    if (success) {
      let link = `${window.location.origin}/register?aff=${data}`;
      setAffLink(link);
    } else {
      showError(message);
    }
  };

  // Transfer invitation quota
  const transfer = async () => {
    if (transferAmount < getQuotaPerUnit()) {
      showError(t(MSG_TRANSFER_MIN) + ' ' + renderQuota(getQuotaPerUnit()));
      return;
    }
    const res = await API.post(`/api/user/aff_transfer`, {
      quota: transferAmount,
    });
    const { success, message } = res.data;
    if (success) {
      showSuccess(message);
      setOpenTransfer(false);
      getUserQuota().then();
    } else {
      showError(message);
    }
  };

  // Copy invitation link
  const handleAffLinkClick = async () => {
    await copy(affLink);
    showSuccess(t(MSG_AFF_LINK_COPIED));
  };

  // 支付回跳后自动提示、刷新余额并打开账单
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    const payStatus = nextParams.get('pay');
    const shouldShowHistory = nextParams.get('show_history') === 'true';
    let shouldReplace = false;
    let shouldRefresh = false;

    if (payStatus === 'success') {
      showSuccess(t('支付成功，余额已刷新'));
      nextParams.delete('pay');
      shouldReplace = true;
      shouldRefresh = true;
    } else if (payStatus === 'pending') {
      showInfo(t('支付结果处理中，请稍后查看充值账单'));
      nextParams.delete('pay');
      shouldReplace = true;
      shouldRefresh = true;
    } else if (payStatus === 'fail') {
      showError(t('支付回调失败，请在充值账单中核对订单状态'));
      nextParams.delete('pay');
      shouldReplace = true;
      shouldRefresh = true;
    }

    if (shouldShowHistory) {
      setOpenHistory(true);
      nextParams.delete('show_history');
      shouldReplace = true;
      shouldRefresh = true;
    }

    if (shouldReplace) {
      setSearchParams(nextParams, { replace: true });
    }
    if (shouldRefresh) {
      getUserQuota().then();
      getSubscriptionSelf().then();
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    // Always refresh user data so quota values stay current.
    getUserQuota().then();
    setTransferAmount(getQuotaPerUnit());
  }, []);

  useEffect(() => {
    if (affFetchedRef.current) return;
    affFetchedRef.current = true;
    getAffLink().then();
  }, []);

  // Load recharge data after the status payload is available.
  useEffect(() => {
    getTopupInfo().then();
    getSubscriptionPlans().then();
    getSubscriptionSelf().then();
  }, []);

  useEffect(() => {
    if (statusState?.status) {
      // const minTopUpValue = statusState.status.min_topup || 1;
      // setMinTopUp(minTopUpValue);
      // setTopUpCount(minTopUpValue);
      setTopUpLink(statusState.status.top_up_link || '');
      setPriceRatio(statusState.status.price || 1);

      setStatusLoading(false);
    }
  }, [statusState?.status]);

  const renderAmount = () => {
    return `¥${Number(amount || 0).toFixed(2)}`;
  };

  const getAmount = async (value) => {
    if (value === undefined) {
      value = topUpCount;
    }
    setAmountLoading(true);
    try {
      const res = await API.post('/api/user/amount', {
        amount: parseFloat(value),
      });
      if (res !== undefined) {
        const { message, data } = res.data;
        if (message === 'success') {
          setAmount(parseFloat(data));
        } else {
          setAmount(0);
          Toast.error({ content: '错误：' + data, id: 'getAmount' });
        }
      } else {
        showError(res);
      }
    } catch (err) {
      // amount fetch failed silently
    }
    setAmountLoading(false);
  };

  const getStripeAmount = async (value) => {
    if (value === undefined) {
      value = topUpCount;
    }
    setAmountLoading(true);
    try {
      const res = await API.post('/api/user/stripe/amount', {
        amount: parseFloat(value),
      });
      if (res !== undefined) {
        const { message, data } = res.data;
        if (message === 'success') {
          setAmount(parseFloat(data));
        } else {
          setAmount(0);
          Toast.error({ content: '错误：' + data, id: 'getAmount' });
        }
      } else {
        showError(res);
      }
    } catch (err) {
      // amount fetch failed silently
    } finally {
      setAmountLoading(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleTransferCancel = () => {
    setOpenTransfer(false);
  };

  const handleOpenHistory = () => {
    setOpenHistory(true);
  };

  const handleHistoryCancel = () => {
    setOpenHistory(false);
  };

  const handleCreemCancel = () => {
    setCreemOpen(false);
    setSelectedCreemProduct(null);
  };

  // Select a preset amount
  const selectPresetAmount = (preset) => {
    setTopUpCount(preset.value);
    setSelectedPreset(preset.value);
    getAmount(preset.value);
  };

  // Format large numbers for display
  const formatLargeNumber = (num) => {
    return num.toString();
  };

  // Build preset amounts from the minimum top-up value.
  const generatePresetAmounts = (minAmount) => {
    const multipliers = [1, 5, 10, 30, 50, 100, 300, 500];
    return multipliers.map((multiplier) => ({
      value: minAmount * multiplier,
    }));
  };

  const currentGiftAmount = Number(topupInfo?.gift?.[topUpCount] || 0);
  const currentCreditAmount = Number(topUpCount || 0) + currentGiftAmount;

  // Effective discount: preset-specific first, then custom_discount for non-preset amounts
  const isPresetAmount = (topupInfo?.amount_options || []).includes(Number(topUpCount));
  const presetDiscount = topupInfo?.discount?.[topUpCount];
  const customDiscount = topupInfo?.custom_discount;
  const effectiveDiscount = presetDiscount != null
    ? presetDiscount
    : (!isPresetAmount && customDiscount > 0 && customDiscount < 1)
      ? customDiscount
      : 1.0;

  return (
    <div className='w-full max-w-[1560px] mx-auto relative min-h-screen lg:min-h-0 mt-[60px] px-2 sm:px-4 lg:px-5'>
      {/* Transfer modal */}
      <TransferModal
        t={t}
        openTransfer={openTransfer}
        transfer={transfer}
        handleTransferCancel={handleTransferCancel}
        userState={userState}
        renderQuota={renderQuota}
        getQuotaPerUnit={getQuotaPerUnit}
        transferAmount={transferAmount}
        setTransferAmount={setTransferAmount}
      />

      {/* Payment confirmation modal */}
      <PaymentConfirmModal
        t={t}
        open={open}
        onlineTopUp={onlineTopUp}
        handleCancel={handleCancel}
        confirmLoading={confirmLoading}
        topUpCount={topUpCount}
        renderQuotaWithAmount={renderQuotaWithAmount}
        amountLoading={amountLoading}
        renderAmount={renderAmount}
        payWay={payWay}
        payMethods={payMethods}
        amountNumber={amount}
        discountRate={effectiveDiscount}
        giftAmount={currentGiftAmount}
        creditAmount={currentCreditAmount}
      />

      {/* Top-up history modal */}
      <TopupHistoryModal
        visible={openHistory}
        onCancel={handleHistoryCancel}
        t={t}
      />

      {/* Creem confirmation modal */}
      <Modal
        title={t(MSG_CREEM_CONFIRM_TITLE)}
        visible={creemOpen}
        onOk={onlineCreemTopUp}
        onCancel={handleCreemCancel}
        maskClosable={false}
        size='small'
        centered
        confirmLoading={confirmLoading}
      >
        {selectedCreemProduct && (
          <>
            <p>
              {t('产品名称')}：{selectedCreemProduct.name}
            </p>
            <p>
              {t('价格')}：{selectedCreemProduct.currency === 'EUR' ? '€' : '$'}
              {selectedCreemProduct.price}
            </p>
            <p>
              {t(MSG_TOPUP_QUOTA)}：{selectedCreemProduct.quota}
            </p>
            <p>{t('是否确认充值？')}</p>
          </>
        )}
      </Modal>

      {/* Main content */}
      <div className='topup-layout-grid gap-4 xl:gap-5 xl:items-start'>
        <div className='min-w-0'>
          <RechargeCard
            t={t}
            enableOnlineTopUp={enableOnlineTopUp}
            enableStripeTopUp={enableStripeTopUp}
            enableCreemTopUp={enableCreemTopUp}
            creemProducts={creemProducts}
            creemPreTopUp={creemPreTopUp}
            enableWaffoTopUp={enableWaffoTopUp}
            waffoTopUp={waffoTopUp}
            waffoPayMethods={waffoPayMethods}
            presetAmounts={presetAmounts}
            selectedPreset={selectedPreset}
            selectPresetAmount={selectPresetAmount}
            formatLargeNumber={formatLargeNumber}
            priceRatio={priceRatio}
            topUpCount={topUpCount}
            minTopUp={minTopUp}
            renderQuotaWithAmount={renderQuotaWithAmount}
            getAmount={getAmount}
            setTopUpCount={setTopUpCount}
            setSelectedPreset={setSelectedPreset}
            renderAmount={renderAmount}
            amountLoading={amountLoading}
            payMethods={payMethods}
            preTopUp={preTopUp}
            paymentLoading={paymentLoading}
            payWay={payWay}
            redemptionCode={redemptionCode}
            setRedemptionCode={setRedemptionCode}
            topUp={topUp}
            isSubmitting={isSubmitting}
            topUpLink={topUpLink}
            openTopUpLink={openTopUpLink}
            userState={userState}
            renderQuota={renderQuota}
            statusLoading={statusLoading}
            topupInfo={topupInfo}
            onOpenHistory={handleOpenHistory}
            subscriptionLoading={subscriptionLoading}
            subscriptionPlans={subscriptionPlans}
            billingPreference={billingPreference}
            onChangeBillingPreference={updateBillingPreference}
            activeSubscriptions={activeSubscriptions}
            allSubscriptions={allSubscriptions}
            reloadSubscriptionSelf={getSubscriptionSelf}
          />
        </div>
        <div className='min-w-0'>
          <InvitationCard
            t={t}
            userState={userState}
            renderQuota={renderQuota}
            setOpenTransfer={setOpenTransfer}
            affLink={affLink}
            handleAffLinkClick={handleAffLinkClick}
          />
        </div>
      </div>
    </div>
  );
};

export default TopUp;
