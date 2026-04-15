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

import React, { useEffect, useState } from 'react';
import { Button, Divider, Input, Switch, TextArea, Typography, Space } from '@douyinfe/semi-ui';
import { QrCode } from 'lucide-react';
import { API, showError, showSuccess } from '../../../helpers';
import { useTranslation } from 'react-i18next';

const { Text, Title } = Typography;

const PanelForm = ({ panelNum, enabled, onEnabledChange, title, onTitleChange, image, onImageChange, caption, onCaptionChange, t }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <Switch checked={enabled} onChange={onEnabledChange} size='small' />
      <Text strong>{t('面板') + ' ' + panelNum + '：' + (enabled ? t('已启用') : t('已禁用'))}</Text>
    </div>

    <Space vertical align='start' style={{ width: '100%' }}>
      <div style={{ width: '100%' }}>
        <Text type='secondary' size='small' style={{ display: 'block', marginBottom: 4 }}>
          {t('面板标题')}
        </Text>
        <Input
          value={title}
          onChange={onTitleChange}
          placeholder={t('例如：QQ 通知群、客服微信')}
          style={{ maxWidth: 400 }}
        />
      </div>

      <div style={{ width: '100%' }}>
        <Text type='secondary' size='small' style={{ display: 'block', marginBottom: 4 }}>
          {t('图片链接（二维码等）')}
        </Text>
        <Input
          value={image}
          onChange={onImageChange}
          placeholder='https://example.com/qrcode.png'
          style={{ maxWidth: 600 }}
        />
        {image && (
          <div style={{ marginTop: 8 }}>
            <img
              src={image}
              alt='preview'
              style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: '1px solid var(--semi-color-border)' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      <div style={{ width: '100%' }}>
        <Text type='secondary' size='small' style={{ display: 'block', marginBottom: 4 }}>
          {t('说明文字（显示在图片下方，可换行）')}
        </Text>
        <TextArea
          value={caption}
          onChange={onCaptionChange}
          placeholder={t('例如：\nQQ 通知群：123456789\n客服微信：myservice')}
          rows={3}
          style={{ maxWidth: 600 }}
        />
      </div>
    </Space>
  </div>
);

const SettingsContact = ({ options, refresh }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Panel 1
  const [contactEnabled, setContactEnabled] = useState(false);
  const [contactImage, setContactImage] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [contactCaption, setContactCaption] = useState('');

  // Panel 2
  const [contact2Enabled, setContact2Enabled] = useState(false);
  const [contactImage2, setContactImage2] = useState('');
  const [contactTitle2, setContactTitle2] = useState('');
  const [contactCaption2, setContactCaption2] = useState('');

  useEffect(() => {
    if (options) {
      setContactEnabled(options['console_setting.contact_enabled'] === 'true');
      setContactImage(options['console_setting.contact_image'] || '');
      setContactTitle(options['console_setting.contact_title'] || '');
      setContactCaption(options['console_setting.contact_caption'] || '');
      setContact2Enabled(options['console_setting.contact2_enabled'] === 'true');
      setContactImage2(options['console_setting.contact_image2'] || '');
      setContactTitle2(options['console_setting.contact_title2'] || '');
      setContactCaption2(options['console_setting.contact_caption2'] || '');
    }
  }, [options]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await Promise.all([
        API.put('/api/option/', { key: 'console_setting.contact_enabled', value: String(contactEnabled) }),
        API.put('/api/option/', { key: 'console_setting.contact_image', value: contactImage }),
        API.put('/api/option/', { key: 'console_setting.contact_title', value: contactTitle }),
        API.put('/api/option/', { key: 'console_setting.contact_caption', value: contactCaption }),
        API.put('/api/option/', { key: 'console_setting.contact2_enabled', value: String(contact2Enabled) }),
        API.put('/api/option/', { key: 'console_setting.contact_image2', value: contactImage2 }),
        API.put('/api/option/', { key: 'console_setting.contact_title2', value: contactTitle2 }),
        API.put('/api/option/', { key: 'console_setting.contact_caption2', value: contactCaption2 }),
      ]);
      showSuccess(t('保存成功'));
      refresh();
    } catch (err) {
      showError(t('保存失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <QrCode size={18} />
        <Title heading={6} style={{ margin: 0 }}>{t('联系方式面板')}</Title>
        <div style={{ flex: 1 }} />
        <Text type='secondary' size='small'>{t('在仪表盘显示联系二维码（最多两个独立面板）')}</Text>
      </div>

      <PanelForm
        panelNum={1}
        enabled={contactEnabled}
        onEnabledChange={setContactEnabled}
        title={contactTitle}
        onTitleChange={setContactTitle}
        image={contactImage}
        onImageChange={setContactImage}
        caption={contactCaption}
        onCaptionChange={setContactCaption}
        t={t}
      />

      <Divider margin='20px' />

      <PanelForm
        panelNum={2}
        enabled={contact2Enabled}
        onEnabledChange={setContact2Enabled}
        title={contactTitle2}
        onTitleChange={setContactTitle2}
        image={contactImage2}
        onImageChange={setContactImage2}
        caption={contactCaption2}
        onCaptionChange={setContactCaption2}
        t={t}
      />

      <div style={{ marginTop: 20 }}>
        <Button theme='solid' type='primary' loading={loading} onClick={handleSave}>
          {t('保存')}
        </Button>
      </div>
    </div>
  );
};

export default SettingsContact;
