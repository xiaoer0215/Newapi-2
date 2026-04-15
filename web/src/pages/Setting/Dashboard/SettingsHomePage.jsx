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
import { Button, Input, Switch, Typography, Space, Divider } from '@douyinfe/semi-ui';
import { Home, ArrowUp, ArrowDown } from 'lucide-react';
import { API, showError, showSuccess } from '../../../helpers';
import { useTranslation } from 'react-i18next';

const { Text, Title } = Typography;

const DEFAULT_SECTIONS = [
  { id: 'endpoint', label: '接口地址', enabled: true },
  { id: 'buttons',  label: '操作按钮（注册/登录）', enabled: true },
  { id: 'stats',    label: '统计数据（运行时间等）', enabled: true },
  { id: 'qr',       label: '二维码 / 图片面板', enabled: true },
];

const SettingsHomePage = ({ options, refresh }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [qrImage, setQrImage] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [qrCaption, setQrCaption] = useState('');

  useEffect(() => {
    if (!options) return;
    const raw = options['console_setting.home_page_config'];
    if (raw) {
      try {
        const cfg = JSON.parse(raw);
        if (cfg.sections && Array.isArray(cfg.sections)) {
          // Merge saved order+enabled with defaults (add new sections if any)
          const saved = cfg.sections;
          const merged = saved.map(s => {
            const def = DEFAULT_SECTIONS.find(d => d.id === s.id);
            return { id: s.id, label: def ? def.label : s.id, enabled: s.enabled };
          });
          // Append any default sections not yet in saved list
          DEFAULT_SECTIONS.forEach(d => {
            if (!merged.find(m => m.id === d.id)) merged.push(d);
          });
          setSections(merged);
        }
        setQrImage(cfg.qr_image || '');
        setQrTitle(cfg.qr_title || '');
        setQrCaption(cfg.qr_caption || '');
      } catch {}
    }
  }, [options]);

  const moveSection = (idx, dir) => {
    const next = [...sections];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setSections(next);
  };

  const toggleSection = (idx) => {
    const next = [...sections];
    next[idx] = { ...next[idx], enabled: !next[idx].enabled };
    setSections(next);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const config = {
        sections: sections.map(s => ({ id: s.id, enabled: s.enabled })),
        qr_image: qrImage,
        qr_title: qrTitle,
        qr_caption: qrCaption,
      };
      const res = await API.put('/api/option/', {
        key: 'console_setting.home_page_config',
        value: JSON.stringify(config),
      });
      if (res.data.success) {
        showSuccess(t('保存成功'));
        refresh();
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('保存失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Home size={18} />
        <Title heading={6} style={{ margin: 0 }}>{t('首页版块配置')}</Title>
        <div style={{ flex: 1 }} />
        <Text type='secondary' size='small'>{t('控制首页各版块的显示与排列顺序')}</Text>
      </div>

      {/* Section order & visibility */}
      <div style={{ marginBottom: 20 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('版块顺序与显示')}</Text>
        <Text type='secondary' size='small' style={{ display: 'block', marginBottom: 12 }}>
          {t('二维码版块位于右侧，其余版块按此顺序排列在左侧')}
        </Text>
        {sections.map((sec, idx) => (
          <div
            key={sec.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: sec.enabled ? 'var(--semi-color-fill-0)' : 'transparent',
              borderRadius: 8,
              marginBottom: 6,
              border: '1px solid var(--semi-color-border)',
              opacity: sec.enabled ? 1 : 0.5,
            }}
          >
            <Switch checked={sec.enabled} onChange={() => toggleSection(idx)} size='small' />
            <Text style={{ flex: 1 }}>{t(sec.label)}</Text>
            <Button
              size='small'
              theme='borderless'
              icon={<ArrowUp size={14} />}
              disabled={idx === 0}
              onClick={() => moveSection(idx, -1)}
            />
            <Button
              size='small'
              theme='borderless'
              icon={<ArrowDown size={14} />}
              disabled={idx === sections.length - 1}
              onClick={() => moveSection(idx, 1)}
            />
          </div>
        ))}
      </div>

      <Divider />

      {/* QR code settings */}
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <Text strong style={{ display: 'block', marginBottom: 12 }}>{t('二维码 / 图片设置')}</Text>
        <Space vertical align='start' style={{ width: '100%' }}>
          <div style={{ width: '100%' }}>
            <Text type='secondary' size='small' style={{ display: 'block', marginBottom: 4 }}>{t('图片链接')}</Text>
            <Input
              value={qrImage}
              onChange={setQrImage}
              placeholder='https://example.com/qrcode.png'
              style={{ maxWidth: 500 }}
            />
          </div>
          <div style={{ width: '100%' }}>
            <Text type='secondary' size='small' style={{ display: 'block', marginBottom: 4 }}>{t('标题（如：SCAN TO PURCHASE）')}</Text>
            <Input
              value={qrTitle}
              onChange={setQrTitle}
              placeholder='SCAN TO PURCHASE'
              style={{ maxWidth: 400 }}
            />
          </div>
          <div style={{ width: '100%' }}>
            <Text type='secondary' size='small' style={{ display: 'block', marginBottom: 4 }}>{t('副标题说明')}</Text>
            <Input
              value={qrCaption}
              onChange={setQrCaption}
              placeholder='WeChat · Reply "API" · Instant Access'
              style={{ maxWidth: 500 }}
            />
          </div>
          {qrImage && (
            <img
              src={qrImage}
              alt='preview'
              style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: '1px solid var(--semi-color-border)' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
        </Space>
      </div>

      <Button theme='solid' type='primary' loading={loading} onClick={handleSave}>
        {t('保存首页配置')}
      </Button>
    </div>
  );
};

export default SettingsHomePage;
