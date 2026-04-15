import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Modal,
  Spin,
  Tag,
  Badge,
  Divider,
} from '@douyinfe/semi-ui';
import { IconGift } from '@douyinfe/semi-icons';
import { Sparkles } from 'lucide-react';
import { API, showError, showSuccess } from '../../helpers';
import { renderQuota } from '../../helpers/render';
import AutoDeliveryPurchaseModal from './modals/AutoDeliveryPurchaseModal';
import { useSearchParams } from 'react-router-dom';

const { Title, Text } = Typography;

const formatCnyPrice = (value) => {
  const amount = Number(value || 0);
  return amount.toFixed(Number.isInteger(amount) ? 0 : 2);
};

// 过滤易支付方式
function getEpayMethods(payMethods = []) {
  return (payMethods || []).filter(
    (m) => m?.type && m.type !== 'stripe' && m.type !== 'creem',
  );
}

// 提交易支付表单
function submitEpayForm({ url, params }) {
  const form = document.createElement('form');
  form.action = url;
  form.method = 'POST';
  const isSafari =
    navigator.userAgent.indexOf('Safari') > -1 &&
    navigator.userAgent.indexOf('Chrome') < 1;
  if (!isSafari) form.target = '_blank';
  Object.keys(params || {}).forEach((key) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = params[key];
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

const AutoDeliveryShop = ({ t, reloadUserQuota, payMethods = [], enableOnlineTopUp = false, enableStripeTopUp = false, enableCreemTopUp = false, products: propProducts = [] }) => {
  const [products, setProducts] = useState(propProducts);
  const [loading, setLoading] = useState(false);
  const [purchasedCards, setPurchasedCards] = useState([]);
  const [purchasedModalVisible, setPurchasedModalVisible] = useState(false);
  const [purchasedLoading, setPurchasedLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paying, setPaying] = useState(false);
  const [selectedEpayMethod, setSelectedEpayMethod] = useState('');
  const [searchParams] = useSearchParams();

  const epayMethods = useMemo(() => getEpayMethods(payMethods), [payMethods]);

  useEffect(() => {
    setProducts(propProducts);
  }, [propProducts]);

  // 支付回跳后刷新库存（从父组件 reload）
  useEffect(() => {
    const payStatus = searchParams.get('pay');
    if (payStatus === 'success') {
      setPurchasedModalVisible(true);
      fetchPurchasedCards();
    }
  }, [searchParams]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/auto_delivery/products');
      if (res.data.success) {
        setProducts(res.data.data || []);
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchasedCards = async () => {
    setPurchasedLoading(true);
    try {
      const res = await API.get('/api/auto_delivery/self');
      if (res.data.success) {
        setPurchasedCards(res.data.data || []);
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setPurchasedLoading(false);
    }
  };

  const openBuy = (product) => {
    setSelectedProduct(product);
    setSelectedEpayMethod(epayMethods?.[0]?.type || '');
    setOpen(true);
  };

  const closeBuy = () => {
    setOpen(false);
    setSelectedProduct(null);
    setPaying(false);
  };

  const payStripe = async () => {
    if (!selectedProduct?.stripe_price_id) {
      showError(t('该商品未配置 Stripe'));
      return;
    }
    setPaying(true);
    try {
      const res = await API.post('/api/auto_delivery/stripe/pay', {
        product_id: selectedProduct.id,
      });
      if (res.data?.message === 'success') {
        window.open(res.data.data?.pay_link, '_blank');
        showSuccess(t('已打开支付页面'));
        closeBuy();
      } else {
        const errorMsg =
          typeof res.data?.data === 'string'
            ? res.data.data
            : res.data?.message || t('支付失败');
        showError(errorMsg);
      }
    } catch (e) {
      showError(t('支付请求失败'));
    } finally {
      setPaying(false);
    }
  };

  const payCreem = async () => {
    if (!selectedProduct?.creem_product_id) {
      showError(t('该商品未配置 Creem'));
      return;
    }
    setPaying(true);
    try {
      const res = await API.post('/api/auto_delivery/creem/pay', {
        product_id: selectedProduct.id,
      });
      if (res.data?.message === 'success') {
        window.open(res.data.data?.checkout_url, '_blank');
        showSuccess(t('已打开支付页面'));
        closeBuy();
      } else {
        const errorMsg =
          typeof res.data?.data === 'string'
            ? res.data.data
            : res.data?.message || t('支付失败');
        showError(errorMsg);
      }
    } catch (e) {
      showError(t('支付请求失败'));
    } finally {
      setPaying(false);
    }
  };

  const payEpay = async () => {
    if (!selectedEpayMethod) {
      showError(t('请选择支付方式'));
      return;
    }
    setPaying(true);
    try {
      const res = await API.post('/api/auto_delivery/epay/pay', {
        product_id: selectedProduct.id,
        payment_method: selectedEpayMethod,
      });
      if (res.data?.message === 'success') {
        submitEpayForm({ url: res.data.url, params: res.data.data });
        showSuccess(t('已发起支付'));
        closeBuy();
      } else {
        const errorMsg =
          typeof res.data?.data === 'string'
            ? res.data.data
            : res.data?.message || t('支付失败');
        showError(errorMsg);
      }
    } catch (e) {
      showError(t('支付请求失败'));
    } finally {
      setPaying(false);
    }
  };

  const handleBuy = (product) => {
    openBuy(product);
  };

  const openPurchasedModal = () => {
    setPurchasedModalVisible(true);
    fetchPurchasedCards();
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Title heading={4}>
          <IconGift style={{ marginRight: 8 }} /> 自动发货
        </Title>
        <Button onClick={openPurchasedModal}>我的购买记录</Button>
      </div>

      <Spin spinning={loading}>
        {products.length > 0 ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 w-full px-1'>
            {products.map((p, index) => {
              const price = Number(p.price || 0);
              const displayPrice = formatCnyPrice(price);
              const isPopular = index === 0 && products.length > 1;

              return (
                <Card
                  key={p.id}
                  className={`!rounded-xl transition-all hover:shadow-lg w-full ${
                    isPopular ? 'ring-2 ring-purple-500' : ''
                  }`}
                  bodyStyle={{ padding: 0 }}
                >
                  <div className='p-4 flex flex-col'>
                    {/* 推荐标签 */}
                    {isPopular && (
                      <div className='mb-2'>
                        <Tag color='purple' shape='circle' size='small'>
                          <Sparkles size={10} className='mr-1' />
                          {t('推荐')}
                        </Tag>
                      </div>
                    )}

                    {/* 商品名称 */}
                    <div className='mb-3'>
                      <Typography.Title
                        heading={5}
                        ellipsis={{ rows: 1, showTooltip: true }}
                        style={{ margin: 0 }}
                      >
                        {p.name}
                      </Typography.Title>
                      {p.description && (
                        <Text
                          type='tertiary'
                          size='small'
                          ellipsis={{ rows: 1, showTooltip: true }}
                          style={{ display: 'block' }}
                        >
                          {p.description}
                        </Text>
                      )}
                    </div>

                    {/* 价格区域 */}
                    <div className='py-2'>
                      <Text type='tertiary' size='small'>
                        {t('实付')}
                      </Text>
                      <div className='flex items-baseline justify-start'>
                        <span className='text-xl font-bold text-purple-600'>¥</span>
                        <span className='text-3xl font-bold text-purple-600'>
                          {displayPrice}
                        </span>
                      </div>
                    </div>

                    {/* 商品详情 */}
                    <div className='flex flex-col items-start gap-1 pb-2'>
                      {p.quota > 0 && (
                        <div className='flex items-center gap-2 text-xs text-gray-500'>
                          <Badge dot type='success' />
                          <span>
                            {t('赠送额度')}: {renderQuota(p.quota)}
                          </span>
                        </div>
                      )}
                      <div className='flex items-center gap-2 text-xs text-gray-500'>
                        <Badge dot type='tertiary' />
                        <span>
                          {t('剩余库存')}: {p.stock}
                        </span>
                      </div>
                    </div>

                    <div className='mt-auto'>
                      <Divider margin={12} />
                      <Button
                        theme='outline'
                        type='primary'
                        block
                        disabled={p.stock <= 0}
                        onClick={() => handleBuy(p)}
                      >
                        {p.stock > 0 ? t('立即购买') : t('库存不足')}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          !loading && (
            <div className='text-center text-gray-400 text-sm py-4'>
              <Text type='tertiary'>{t('暂无商品')}</Text>
            </div>
          )
        )}
      </Spin>

      <Modal
        title={t('我的购买记录')}
        visible={purchasedModalVisible}
        onCancel={() => setPurchasedModalVisible(false)}
        footer={null}
        width={700}
      >
        <Spin spinning={purchasedLoading}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              maxHeight: '60vh',
              overflowY: 'auto',
              paddingRight: 8,
            }}
          >
            {purchasedCards.map((card) => {
              const isUrl = card.delivered_tutorial && /^https?:\/\//i.test(card.delivered_tutorial.trim());
              return (
                <Card key={card.id} bodyStyle={{ padding: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Text strong>{t('商品ID')}: {card.product_id}</Text>
                    <Text type='tertiary'>
                      {new Date(card.buy_time * 1000).toLocaleString()}
                    </Text>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'var(--semi-color-fill-0)',
                      padding: 12,
                      borderRadius: 6,
                      marginBottom: card.delivered_tutorial ? 12 : 0,
                    }}
                  >
                    <Text
                      copyable
                      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                    >
                      {card.secret}
                    </Text>
                  </div>
                  {card.delivered_tutorial && (
                    <div
                      style={{
                        backgroundColor: 'var(--semi-color-fill-1)',
                        padding: 12,
                        borderRadius: 6,
                      }}
                    >
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        {t('使用教程')}:
                      </Text>
                      {isUrl ? (
                        <a
                          href={card.delivered_tutorial.trim()}
                          target='_blank'
                          rel='noopener noreferrer'
                          style={{ color: 'var(--semi-color-link)' }}
                        >
                          {card.delivered_tutorial.trim()}
                        </a>
                      ) : (
                        <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {card.delivered_tutorial}
                        </Text>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
            {purchasedCards.length === 0 && !purchasedLoading && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type='tertiary'>{t('暂无购买记录')}</Text>
              </div>
            )}
          </div>
        </Spin>
      </Modal>

      {/* 购买确认弹窗 */}
      <AutoDeliveryPurchaseModal
        t={t}
        visible={open}
        onCancel={closeBuy}
        selectedProduct={selectedProduct}
        paying={paying}
        selectedEpayMethod={selectedEpayMethod}
        setSelectedEpayMethod={setSelectedEpayMethod}
        epayMethods={epayMethods}
        enableOnlineTopUp={enableOnlineTopUp}
        enableStripeTopUp={enableStripeTopUp}
        enableCreemTopUp={enableCreemTopUp}
        onPayStripe={payStripe}
        onPayCreem={payCreem}
        onPayEpay={payEpay}
      />
    </div>
  );
};

export default AutoDeliveryShop;
