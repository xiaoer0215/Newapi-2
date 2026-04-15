import React, { useEffect, useState } from 'react';
import { Button, Card, Table, Typography, Modal, Form, Input, InputNumber, TextArea, Popconfirm, Tag, Tabs, TabPane, Banner, Switch, Toast } from '@douyinfe/semi-ui';
import { IconPlus, IconDelete, IconSetting } from '@douyinfe/semi-icons';
import { API, showError, showSuccess } from '../helpers';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const AutoDeliveryAdmin = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [setting, setSetting] = useState({});
  const [settingLoading, setSettingLoading] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/auto_delivery/admin/products');
      if (res.data.success) {
        setProducts(res.data.data || []);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async () => {
    setCardsLoading(true);
    try {
      const res = await API.get('/api/auto_delivery/admin/cards');
      if (res.data.success) {
        setCards(res.data.data || []);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setCardsLoading(false);
    }
  };

  const loadSetting = async () => {
    try {
      const res = await API.get('/api/auto_delivery/admin/setting');
      if (res.data.success) {
        setSetting(res.data.data || {});
      }
    } catch (e) {
      showError(e.message);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCards();
    loadSetting();
  }, []);

  const handleDeleteProduct = async (id) => {
    try {
      const res = await API.delete(`/api/auto_delivery/admin/products/${id}`);
      if (res.data.success) {
        showSuccess(t('删除成功'));
        loadProducts();
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    }
  };

  const handleDeleteCard = async (id) => {
    try {
      const res = await API.delete(`/api/auto_delivery/admin/cards/${id}`);
      if (res.data.success) {
        showSuccess(t('删除成功'));
        loadCards();
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    }
  };

  const handleSaveProduct = async (values) => {
    try {
      let res;
      if (editingProduct) {
        res = await API.put(`/api/auto_delivery/admin/products/${editingProduct.id}`, values);
      } else {
        res = await API.post('/api/auto_delivery/admin/products', values);
      }
      if (res.data.success) {
        showSuccess(t('保存成功'));
        setShowProductModal(false);
        setEditingProduct(null);
        loadProducts();
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    }
  };

  const handleSaveCards = async (values) => {
    try {
      const res = await API.post('/api/auto_delivery/admin/cards', values);
      if (res.data.success) {
        showSuccess(t('添加成功'));
        setShowCardModal(false);
        loadCards();
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    }
  };

  const handleSaveSetting = async () => {
    setSettingLoading(true);
    try {
      const res = await API.put('/api/auto_delivery/admin/setting', setting);
      if (res.data.success) {
        showSuccess(t('保存成功'));
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setSettingLoading(false);
    }
  };

  const productColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: t('名称'), dataIndex: 'name' },
    { title: t('价格'), dataIndex: 'price', render: (v) => `¥${v}` },
    { title: t('额度'), dataIndex: 'quota', render: (v) => v ? `$${(v / 500000).toFixed(2)}` : '-' },
    { title: t('库存'), dataIndex: 'stock', render: (_, r) => {
      const cardCount = cards.filter(c => c.product_id === r.id && c.status === 0).length;
      return <Tag color={cardCount > 0 ? 'green' : 'red'}>{cardCount}</Tag>;
    }},
    { title: t('状态'), dataIndex: 'enabled', render: (v) => <Tag color={v ? 'green' : 'grey'}>{v ? t('启用') : t('禁用')}</Tag> },
    {
      title: t('操作'),
      render: (_, record) => (
        <span style={{ display: 'flex', gap: 8 }}>
          <Button size='small' onClick={() => { setEditingProduct(record); setShowProductModal(true); }}>{t('编辑')}</Button>
          <Popconfirm title={t('确认删除？')} onConfirm={() => handleDeleteProduct(record.id)}>
            <Button size='small' type='danger' icon={<IconDelete />} />
          </Popconfirm>
        </span>
      ),
    },
  ];

  const cardColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: t('商品'), dataIndex: 'product_name', render: (_, r) => {
      const p = products.find(p => p.id === r.product_id);
      return p ? p.name : r.product_id;
    }},
    { title: t('卡密'), dataIndex: 'content', render: (v) => v ? v.substring(0, 20) + '...' : '-' },
    { title: t('状态'), dataIndex: 'status', render: (v) => <Tag color={v === 0 ? 'green' : 'grey'}>{v === 0 ? t('未使用') : t('已使用')}</Tag> },
    {
      title: t('操作'),
      render: (_, record) => (
        <Popconfirm title={t('确认删除？')} onConfirm={() => handleDeleteCard(record.id)}>
          <Button size='small' type='danger' icon={<IconDelete />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Tabs>
        <TabPane tab={t('商品管理')} itemKey='products'>
          <div style={{ marginBottom: 16 }}>
            <Button icon={<IconPlus />} theme='solid' onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
              {t('添加商品')}
            </Button>
          </div>
          <Table columns={productColumns} dataSource={products} loading={loading} rowKey='id' pagination={false} />
        </TabPane>
        <TabPane tab={t('卡密管理')} itemKey='cards'>
          <div style={{ marginBottom: 16 }}>
            <Button icon={<IconPlus />} theme='solid' onClick={() => setShowCardModal(true)}>
              {t('添加卡密')}
            </Button>
          </div>
          <Table columns={cardColumns} dataSource={cards} loading={cardsLoading} rowKey='id' pagination={false} />
        </TabPane>
        <TabPane tab={t('设置')} itemKey='settings'>
          <Card style={{ maxWidth: 600 }}>
            <div style={{ marginBottom: 16 }}>
              <Text>{t('启用自动发货')}</Text>
              <Switch checked={setting.enabled} onChange={(v) => setSetting({ ...setting, enabled: v })} style={{ marginLeft: 12 }} />
            </div>
            <Button theme='solid' loading={settingLoading} onClick={handleSaveSetting}>{t('保存设置')}</Button>
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title={editingProduct ? t('编辑商品') : t('添加商品')}
        visible={showProductModal}
        onCancel={() => { setShowProductModal(false); setEditingProduct(null); }}
        footer={null}
      >
        <Form initValues={editingProduct || {}} onSubmit={handleSaveProduct}>
          <Form.Input field='name' label={t('名称')} rules={[{ required: true }]} />
          <Form.InputNumber field='price' label={t('价格')} rules={[{ required: true }]} />
          <Form.InputNumber field='quota' label={t('额度')} />
          <Form.TextArea field='description' label={t('描述')} />
          <Form.Switch field='enabled' label={t('启用')} />
          <Button htmlType='submit' theme='solid' style={{ marginTop: 12 }}>{t('保存')}</Button>
        </Form>
      </Modal>

      <Modal
        title={t('添加卡密')}
        visible={showCardModal}
        onCancel={() => setShowCardModal(false)}
        footer={null}
      >
        <Form onSubmit={handleSaveCards}>
          <Form.Select field='product_id' label={t('商品')} rules={[{ required: true }]}>
            {products.map(p => (
              <Form.Select.Option key={p.id} value={p.id}>{p.name}</Form.Select.Option>
            ))}
          </Form.Select>
          <Form.TextArea field='content' label={t('卡密内容（每行一个）')} rules={[{ required: true }]} />
          <Button htmlType='submit' theme='solid' style={{ marginTop: 12 }}>{t('添加')}</Button>
        </Form>
      </Modal>
    </div>
  );
};

export default AutoDeliveryAdmin;
