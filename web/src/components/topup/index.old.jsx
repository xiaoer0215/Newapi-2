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
import TransferModal from './modals/TransferModal';
import PaymentConfirmModal from './modals/PaymentConfirmModal';
import TopupHistoryModal from './modals/TopupHistoryModal';

const MSG_REQUEST_FAILED = '请求失败';
const MSG_TOPUP_LINK_MISSING = '超级管理员未设置充值链接！';
const MSG_STRIPE_DISABLED = '管理员未开启 Stripe 充值！';
const MSG_ONLINE_DISABLED = '管理员未开启在线充值！';
const MSG_GET_AMOUNT_FAILED = '获取金额失败';
const MSG_PAYMENT_FAILED = '支付失败';
const MSG_PAYMENT_REQUEST_FAILED = '支付请求失败';
const MSG_CREEM_DISABLED = '管理员未开启 Creem 充值！';
const MSG_SELECT_PRODUCT = '请选择产品';
const MSG_UPDATE_SUCCESS = '更新成功';
const MSG_UPDATE_FAILED = '更新失败';
const MSG_TRANSFER_MIN = '划转金额最低为';
const MSG_AFF_LINK_COPIED = '邀请链接已复制到剪切板';
const MSG_CREEM_CONFIRM_TITLE = '确定要充值？';
const MSG_REDEEM_SUCCESS_QUOTA = '成功兑换额度：';
const MSG_PRODUCT_CONFIG_INVALID = '产品配置错误，请联系管理员';
const MSG_TOPUP_QUOTA = '充值额度';

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

  const [creemProducts, setCreemProducts] = useState([]);
  const [enableCreemTopUp, setEnableCreemTopUp] = useState(false);
  const [creemOpen, setCreemOpen] = useState(false);
  const [selectedCreemProduct, setSelectedCreemProduct] = useState(null);

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

  const [affLink, setAffLink] = useState('');
  const [openTransfer, setOpenTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState(0);

  const [openHistory, setOpenHistory] = useState(false);

  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [billingPreference, setBillingPreference] =
    useState('subscription_first');
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [allSubscriptions, setAllSubscriptions] = useState([]);

  const [presetAmounts, setPresetAmounts] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);

  const [topupInfo, setTopupInfo] = useState({
    amount_options: [],
    discount: {},
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
      if (amount === 0) {
        await getStripeAmount();
      }
    } else if (amount === 0) {
      await getAmount();
    }

    if (topUpCount < minTopUp) {
      showError(t('充值数量不能小于 ') + minTopUp);
      return;
    }
    setConfirmLoading(true);
    try {
      let res;
      if (payWay === 'stripe') {
        res = await API.post('/api/user/stripe/pay', {
          amount: parseInt(topUpCount),
          payment_method: 'stripe',
        });
      } else {
        res = await API.post('/api/user/pay', {
          amount: parseInt(topUpCount),
          payment_method: payWay,
        });
      }

      if (res !== undefined) {
        const { message, data } = res.data;
        if (message === 'success') {
          if (payWay === 'stripe') {
            window.open(data.pay_link, '_blank');
          } else {
            const params = data;
            const url = res.data.url;
            const form = document.createElement('form');
            form.action = url;
            form.method = 'POST';
            const isSafari =
              navigator.userAgent.indexOf('Safari') > -1 &&
              navigator.userAgent.indexOf('Chrome') < 1;
            if (!isSafari) {
              form.target = '_blank';
            }
            for (const key in params) {
              const input = document.createElement('input');
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
    window.open(data.checkout_url, '_blank');
  };

  const getUserQuota = async () => {
    const res = await API.get('/api/user/self');
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
        setActiveSubscriptions(res.data.data?.subscriptions || []);
        setAllSubscriptions(res.data.data?.all_subscriptions || []);
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

  const getTopupInfo = async () => {
    try {
      const res = await API.get('/api/user/topup/info');
      const { data, success } = res.data;
      if (success) {
        setTopupInfo({
          amount_options: data.amount_options || [],
          discount: data.discount || {},
        });

        let methods = data.pay_methods || [];
        try {
          if (typeof methods === 'string') {
            methods = JSON.parse(methods);
          }
          if (methods && methods.length > 0) {
            methods = methods
              .filter((method) => method.name && method.type)
              .map((method) => {
                const normalizedMinTopup = Number(method.min_topup);
                method.min_topup = Number.isFinite(normalizedMinTopup)
                  ? normalizedMinTopup
                  : 0;

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
            methods = [];
          }

          setPayMethods(methods);
          const stripeEnabled = data.enable_stripe_topup || false;
          const onlineEnabled = data.enable_online_topup || false;
          const creemEnabled = data.enable_creem_topup || false;
          const minTopUpValue = onlineEnabled
            ? data.min_topup
            : stripeEnabled
              ? data.stripe_min_topup
              : data.enable_waffo_topup
                ? data.waffo_min_topup
                : 1;
          setEnableOnlineTopUp(onlineEnabled);
          setEnableStripeTopUp(stripeEnabled);
          setEnableCreemTopUp(creemEnabled);
          const waffoEnabled = data.enable_waffo_topup || false;
          setEnableWaffoTopUp(waffoEnabled);
          setWaffoPayMethods(data.waffo_pay_methods || []);
          setWaffoMinTopUp(data.waffo_min_topup || 1);
          setMinTopUp(minTopUpValue);
          setTopUpCount(minTopUpValue);

          try {
            const products = JSON.parse(data.creem_products || '[]');
            setCreemProducts(products);
          } catch (e) {
            setCreemProducts([]);
          }

          if ((data.amount_options || []).length === 0) {
            setPresetAmounts(generatePresetAmounts(minTopUpValue));
          }

          getAmount(minTopUpValue);
        } catch (e) {
          setPayMethods([]);
        }

        if (data.amount_options && data.amount_options.length > 0) {
          const customPresets = data.amount_options.map((count) => ({
            value: count,
            discount: data.discount[count] || 1.0,
          }));
          setPresetAmounts(customPresets);
        }
      } else {
        showError(t('获取充值配置失败'));
      }
    } catch (error) {
      showError(t('获取充值配置异常'));
    }
  };

  const getAffLink = async () => {
    const res = await API.get('/api/user/aff');
    const { success, message, data } = res.data;
    if (success) {
      const link = `${window.location.origin}/register?aff=${data}`;
      setAffLink(link);
    } else {
      showError(message);
    }
  };

  const transfer = async () => {
    if (transferAmount < getQuotaPerUnit()) {
      showError(t(MSG_TRANSFER_MIN) + ' ' + renderQuota(getQuotaPerUnit()));
      return;
    }
    const res = await API.post('/api/user/aff_transfer', {
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

  const handleAffLinkClick = async () => {
    await copy(affLink);
    showSuccess(t(MSG_AFF_LINK_COPIED));
  };

  useEffect(() => {
    if (searchParams.get('show_history') === 'true') {
      setOpenHistory(true);
      searchParams.delete('show_history');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    getUserQuota().then();
    setTransferAmount(getQuotaPerUnit());
  }, []);

  useEffect(() => {
    if (affFetchedRef.current) return;
    affFetchedRef.current = true;
    getAffLink().then();
  }, []);

  useEffect(() => {
    getTopupInfo().then();
    getSubscriptionPlans().then();
    getSubscriptionSelf().then();
  }, []);

  useEffect(() => {
    if (statusState?.status) {
      setTopUpLink(statusState.status.top_up_link || '');
      setPriceRatio(statusState.status.price || 1);
      setStatusLoading(false);
    }
  }, [statusState?.status]);

  const renderAmount = () => {
    return amount + ' ' + t('元');
  };

  const getAmount = async (value) => {
    const currentValue = value === undefined ? topUpCount : value;
    setAmountLoading(true);
    try {
      const res = await API.post('/api/user/amount', {
        amount: parseFloat(currentValue),
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
      // ignore amount load errors
    }
    setAmountLoading(false);
  };

  const getStripeAmount = async (value) => {
    const currentValue = value === undefined ? topUpCount : value;
    setAmountLoading(true);
    try {
      const res = await API.post('/api/user/stripe/amount', {
        amount: parseFloat(currentValue),
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
      // ignore amount load errors
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

  const selectPresetAmount = (preset) => {
    setTopUpCount(preset.value);
    setSelectedPreset(preset.value);

    const discount = preset.discount || topupInfo.discount[preset.value] || 1.0;
    const discountedAmount = preset.value * priceRatio * discount;
    setAmount(discountedAmount);
  };

  const formatLargeNumber = (num) => {
    return num.toString();
  };

  const generatePresetAmounts = (minAmount) => {
    const multipliers = [1, 5, 10, 30, 50, 100, 300, 500];
    return multipliers.map((multiplier) => ({
      value: minAmount * multiplier,
    }));
  };

  return (
    <div className='w-full max-w-[1480px] mx-auto relative min-h-screen lg:min-h-0 mt-2 sm:mt-3 lg:mt-4 px-2 sm:px-4 lg:px-5'>
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
        discountRate={topupInfo?.discount?.[topUpCount] || 1.0}
      />

      <TopupHistoryModal
        visible={openHistory}
        onCancel={handleHistoryCancel}
        t={t}
      />

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

      <div className='flex justify-center w-full'>
        <div className='w-full'>
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
