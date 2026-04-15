import React, { useEffect, useState } from 'react';
import {
  Layout,
  Typography,
  Button,
  Table,
  Modal,
  Form,
  Space,
  Popconfirm,
  Tabs,
  TabPane,
  Tag,
  Switch,
  Card,
  Toast,
} from '@douyinfe/semi-ui';
import { IconPlus, IconDelete, IconEdit } from '@douyinfe/semi-icons';
import { API, showError, showSuccess } from '../../helpers';
import { useTranslation } from 'react-i18next';
import { renderQuota } from '../../helpers/render';

const { Header, Content } = Layout;
const { Title } = Typography;

const AutoDeliveryAdmin = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [settingLoading, setSettingLoading] = useState(false);

  // Product Modal
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  // Cards state
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchSetting();
  }, []);

  const fetchSetting = async () => {
    try {
      const res = await API.get('/api/auto_delivery/admin/setting');
      if (res.data.success) setEnabled(res.data.data?.enabled ?? true);
    } catch (e) { /* ignore */ }
  };

  const handleToggleEnabled = async (val) => {
    setSettingLoading(true);
    try {
      const res = await API.put('/api/auto_delivery/admin/setting', { enabled: val });
      if (res.data.success) {
        setEnabled(val);
        showSuccess(val ? t('自动发货已开启') : t('自动发货已关闭'));
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(t('操作失败'));
    } finally {
      setSettingLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/auto_delivery/admin/products');
      if (res.data.success) {
        setProducts(res.data.data || []);
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async (productId = null) => {
    setCardsLoading(true);
    try {
      let url = '/api/auto_delivery/admin/cards';
      if (productId) {
        url += `?product_id=${productId}`;
      }
      const res = await API.get(url);
      if (res.data.success) {
        setCards(res.data.data || []);
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setCardsLoading(false);
    }
  };

  const handleProductSubmit = async (values) => {
    try {
      let res;
      if (currentProduct) {
        res = await API.put(
          `/api/auto_delivery/admin/products/${currentProduct.id}`,
          {
            ...values,
            price: parseFloat(values.price),
            quota: parseInt(values.quota) || 0,
          },
        );
      } else {
        res = await API.post('/api/auto_delivery/admin/products', {
          ...values,
          price: parseFloat(values.price),
          quota: parseInt(values.quota) || 0,
        });
      }
      if (res.data.success) {
        showSuccess(t('保存成功'));
        setProductModalVisible(false);
        fetchProducts();
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      const res = await API.delete(`/api/auto_delivery/admin/products/${id}`);
      if (res.data.success) {
        showSuccess(t('删除成功'));
        fetchProducts();
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const handleAddCards = async (values) => {
    try {
      const res = await API.post('/api/auto_delivery/admin/cards', values);
      if (res.data.success) {
        showSuccess(res.data.message);
        setCardModalVisible(false);
        fetchProducts();
        fetchCards(selectedProductId);
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const handleDeleteCard = async (id) => {
    try {
      const res = await API.delete(`/api/auto_delivery/admin/cards/${id}`);
      if (res.data.success) {
        showSuccess(t('删除成功'));
        fetchCards(selectedProductId);
        fetchProducts(); // update stock
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const openProductModal = (product = null) => {
    setCurrentProduct(product);
    setProductModalVisible(true);
  };

  const openCardModal = () => {
    setCardModalVisible(true);
  };

  const productColumns = [
    { title: 'ID', dataIndex: 'id' },
    { title: t('名称'), dataIndex: 'name' },
    { title: t('种类'), dataIndex: 'type' },
    { title: t('价格'), dataIndex: 'price', render: (text) => `$${text}` },
    {
      title: t('赠送额度'),
      dataIndex: 'quota',
      render: (text) => renderQuota(text),
    },
    { title: t('库存'), dataIndex: 'stock' },
    {
      title: t('状态'),
      dataIndex: 'enabled',
      render: (text) => (
        <Tag color={text ? 'green' : 'red'}>{text ? t('上架') : t('下架')}</Tag>
      ),
    },
    {
      title: t('操作'),
      render: (text, record) => (
        <Space>
          <Button
            icon={<IconEdit />}
            onClick={() => openProductModal(record)}
          />
          <Popconfirm
            title={t('确定删除？')}
            onConfirm={() => handleDeleteProduct(record.id)}
          >
            <Button type='danger' icon={<IconDelete />} />
          </Popconfirm>
          <Button
            onClick={() => {
              setSelectedProductId(record.id);
              fetchCards(record.id);
              setActiveTab('cards');
            }}
          >
            {t('管理卡密')}
          </Button>
        </Space>
      ),
    },
  ];

  const cardColumns = [
    { title: 'ID', dataIndex: 'id' },
    { title: t('商品ID'), dataIndex: 'product_id' },
    { title: t('卡密内容'), dataIndex: 'secret' },
    {
      title: t('状态'),
      dataIndex: 'status',
      render: (text) => (
        <Tag color={text === 'available' ? 'green' : 'grey'}>{text}</Tag>
      ),
    },
    { title: t('买家ID'), dataIndex: 'user_id', render: (text) => text || '-' },
    {
      title: t('操作'),
      render: (text, record) => (
        <Space>
          <Popconfirm
            title={t('确定删除？')}
            onConfirm={() => handleDeleteCard(record.id)}
          >
            <Button
              type='danger'
              icon={<IconDelete />}
              disabled={record.status !== 'available'}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '20px' }}>
        <Title heading={3} style={{ marginBottom: 20 }}>{t('自动发货管理')}</Title>

        {/* 开关卡片 */}
        <Card style={{ marginBottom: 20, borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Typography.Text strong>{t('自动发货功能')}</Typography.Text>
              <Typography.Text type='tertiary' style={{ display: 'block', fontSize: 13, marginTop: 2 }}>
                {t('关闭后，钱包页面不再显示自动发货商品，相关接口也不会被调用')}
              </Typography.Text>
            </div>
            <Switch
              checked={enabled}
              onChange={handleToggleEnabled}
              loading={settingLoading}
              checkedText={t('开启')}
              uncheckedText={t('关闭')}
            />
          </div>
        </Card>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={t('商品管理')} itemKey='products'>
            <Button
              onClick={() => openProductModal()}
              icon={<IconPlus />}
              style={{ marginBottom: 16 }}
            >
              {t('添加商品')}
            </Button>
            <Table
              dataSource={products}
              columns={productColumns}
              loading={loading}
              rowKey='id'
            />
          </TabPane>
          <TabPane tab={t('卡密管理')} itemKey='cards'>
            <Space style={{ marginBottom: 16 }}>
              <Button onClick={() => openCardModal()} icon={<IconPlus />}>
                {t('导入卡密')}
              </Button>
              <Button
                onClick={() => {
                  setSelectedProductId(null);
                  fetchCards();
                }}
              >
                {t('查看所有卡密')}
              </Button>
            </Space>
            <Table
              dataSource={cards}
              columns={cardColumns}
              loading={cardsLoading}
              rowKey='id'
            />
          </TabPane>
        </Tabs>
      </Content>

      <Modal
        title={currentProduct ? t('编辑商品') : t('添加商品')}
        visible={productModalVisible}
        onCancel={() => setProductModalVisible(false)}
        footer={null}
      >
        <Form
          onSubmit={handleProductSubmit}
          initValues={currentProduct || { enabled: true }}
        >
          <Form.Input field='name' label={t('名称')} rules={[{ required: true }]} />
          <Form.Input field='type' label={t('种类')} />
          <Form.TextArea field='description' label={t('描述')} />
          <Form.Input field='price' label={t('价格')} rules={[{ required: true }]} />
          <Form.Input field='quota' label={t('赠送额度 (可不填)')} />
          <Form.TextArea field='tutorial' label={t('使用教程 (可填写文本或链接)')} placeholder={t('填写使用教程或链接，购买后将显示给用户')} style={{ minHeight: 100 }} />
          <Form.Switch field='enabled' label={t('是否上架')} />
          <Button type='primary' htmlType='submit' style={{ marginTop: 16 }}>
            {t('保存')}
          </Button>
        </Form>
      </Modal>

      <Modal
        title={t('导入卡密')}
        visible={cardModalVisible}
        onCancel={() => setCardModalVisible(false)}
        footer={null}
      >
        <Form
          onSubmit={handleAddCards}
          initValues={{ product_id: selectedProductId }}
        >
          <Form.Select
            field='product_id'
            label={t('选择商品')}
            rules={[{ required: true }]}
          >
            {products.map((p) => (
              <Form.Select.Option key={p.id} value={p.id}>
                {p.name}
              </Form.Select.Option>
            ))}
          </Form.Select>
          <Form.TextArea
            field='secrets'
            label={t('卡密内容 (一行一个)')}
            rules={[{ required: true }]}
            style={{ height: 200 }}
          />
          <Button type='primary' htmlType='submit' style={{ marginTop: 16 }}>
            {t('保存')}
          </Button>
        </Form>
      </Modal>
    </Layout>
  );
};

export default AutoDeliveryAdmin;
