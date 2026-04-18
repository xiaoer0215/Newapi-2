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

const getEpayMethods = (payMethods = []) => {
  return (payMethods || []).filter(
    (m) => m?.type && m.type !== 'stripe' && m.type !== 'creem',
  );
};

const submitEpayForm = ({ url, params }) => {
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
};



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
  const [searchParams, setSearchParams] = useSearchParams();

  const epayMethods = useMemo(() => getEpayMethods(payMethods), [payMethods]);

  useEffect(() => {
    setProducts(propProducts);
  }, [propProducts]);

  useEffect(() => {
    const shouldShowPurchasedHistory =
      searchParams.get('show_auto_delivery_history') === 'true';
    if (!shouldShowPurchasedHistory) {
      return;
    }

    setPurchasedModalVisible(true);
    fetchPurchasedCards();

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('show_auto_delivery_history');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);


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
      showError(t('\u8be5\u5546\u54c1\u672a\u914d\u7f6e Stripe'));
      return;
    }
    setPaying(true);
    try {
      const res = await API.post('/api/auto_delivery/stripe/pay', {
        product_id: selectedProduct.id,
      });
      if (res.data?.message === 'success') {
        window.open(res.data.data?.pay_link, '_blank');
        showSuccess(t('\u5df2\u6253\u5f00\u652f\u4ed8\u9875\u9762'));
        closeBuy();
      } else {
        const errorMsg =
          typeof res.data?.data === 'string'
            ? res.data.data
            : res.data?.message || t('\u652f\u4ed8\u5931\u8d25');
        showError(errorMsg);
      }
    } catch (e) {
      showError(t('\u652f\u4ed8\u8bf7\u6c42\u5931\u8d25'));
    } finally {
      setPaying(false);
    }
  };

  const payCreem = async () => {
    if (!selectedProduct?.creem_product_id) {
      showError(t('\u8be5\u5546\u54c1\u672a\u914d\u7f6e Creem'));
      return;
    }
    setPaying(true);
    try {
      const res = await API.post('/api/auto_delivery/creem/pay', {
        product_id: selectedProduct.id,
      });
      if (res.data?.message === 'success') {
        window.open(res.data.data?.checkout_url, '_blank');
        showSuccess(t('\u5df2\u6253\u5f00\u652f\u4ed8\u9875\u9762'));
        closeBuy();
      } else {
        const errorMsg =
          typeof res.data?.data === 'string'
            ? res.data.data
            : res.data?.message || t('\u652f\u4ed8\u5931\u8d25');
        showError(errorMsg);
      }
    } catch (e) {
      showError(t('\u652f\u4ed8\u8bf7\u6c42\u5931\u8d25'));
    } finally {
      setPaying(false);
    }
  };

  const payEpay = async () => {
    if (!selectedEpayMethod) {
      showError(t('\u8bf7\u9009\u62e9\u652f\u4ed8\u65b9\u5f0f'));
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
        showSuccess(t('\u5df2\u53d1\u8d77\u652f\u4ed8'));
        closeBuy();
      } else {
        const errorMsg =
          typeof res.data?.data === 'string'
            ? res.data.data
            : res.data?.message || t('\u652f\u4ed8\u5931\u8d25');
        showError(errorMsg);
      }
    } catch (e) {
      showError(t('\u652f\u4ed8\u8bf7\u6c42\u5931\u8d25'));
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
          <IconGift style={{ marginRight: 8 }} /> {t('\u81ea\u52a8\u53d1\u8d27')}
        </Title>
        <Button onClick={openPurchasedModal}>{t('\u6211\u7684\u8d2d\u4e70\u8bb0\u5f55')}</Button>
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
                    {/* 闂備浇顫夋禍浠嬪礉韫囨挾鏆︽慨妞诲亾鐎殿喕绮欏畷鍫曞煛婵犲倸袨 */}
                    {isPopular && (
                      <div className='mb-2'>
                        <Tag color='purple' shape='circle' size='small'>
                          <Sparkles size={10} className='mr-1' />
                          {t('\u63a8\u8350')}
                        </Tag>
                      </div>
                    )}

                    {/* 闂備礁鎽滈崰搴∥涘Δ鍛鐟滄柨鐣烽妷銉悑闁?*/}
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

                    {/* 濠电偛顕繛鈧柡鈧柆宥嗗亱闁归棿绀佺粈宀勬煕濠靛棗顏柛?*/}
                    <div className='py-2'>
                      <Text type='tertiary' size='small'>
                        {t('\u5b9e\u4ed8')}
                      </Text>
                      <div className='flex items-baseline justify-start'>
                        <span className='text-xl font-bold text-purple-600'>\uFFE5</span>
                        <span className='text-3xl font-bold text-purple-600'>
                          {displayPrice}
                        </span>
                      </div>
                    </div>

                    {/* 闂備礁鎽滈崰搴∥涘Δ鍛鐟滃繘骞忛悩缁樻櫆闁芥ê顦竟?*/}
                    <div className='flex flex-col items-start gap-1 pb-2'>
                      {p.quota > 0 && (
                        <div className='flex items-center gap-2 text-xs text-gray-500'>
                          <Badge dot type='success' />
                          <span>
                            {t('\u8d60\u9001\u989d\u5ea6')}: {renderQuota(p.quota)}
                          </span>
                        </div>
                      )}
                      <div className='flex items-center gap-2 text-xs text-gray-500'>
                        <Badge dot type='tertiary' />
                        <span>
                          {t('\u5269\u4f59\u5e93\u5b58')}: {p.stock}
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
                        {p.stock > 0 ? t('\u7acb\u5373\u8d2d\u4e70') : t('\u5e93\u5b58\u4e0d\u8db3')}
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
              <Text type='tertiary'>{t('\u6682\u65e0\u5546\u54c1')}</Text>
            </div>
          )
        )}
      </Spin>

      <Modal
        title={t('\u6211\u7684\u8d2d\u4e70\u8bb0\u5f55')}
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
                    <Text strong>{t('\u5546\u54c1ID')}: {card.product_id}</Text>
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
                        {t('\u4f7f\u7528\u6559\u7a0b')}:
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
                <Text type='tertiary'>{t('\u6682\u65e0\u8d2d\u4e70\u8bb0\u5f55')}</Text>
              </div>
            )}
          </div>
        </Spin>
      </Modal>

      {/* 闂佽崵濮甸崝锕傚储濞差亜绠弶鍫氭櫆閸忔粍銇勯弮鈧娆撳触閸モ斁鍋撳▓鍨灈婵犫偓闁秵鍋?*/}
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
