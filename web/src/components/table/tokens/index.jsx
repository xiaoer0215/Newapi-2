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

import React, { useEffect, useRef, useState } from 'react';
import { Notification, Button, Space, Toast, Select } from '@douyinfe/semi-ui';
import { API, showError, getModelCategories, selectFilter } from '../../../helpers';
import TokensTable from './TokensTable';
import TokensActions from './TokensActions';
import TokensFilters from './TokensFilters';
import TokensDescription from './TokensDescription';
import EditTokenModal from './modals/EditTokenModal';
import CCSwitchModal from './modals/CCSwitchModal';
import { useTokensData } from '../../../hooks/tokens/useTokensData';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import PersonalRateLimitNotice from '../../common/PersonalRateLimitNotice';
import './tokens-glass.css';

/* ─── Pagination buttons ────────────────────────────────────────────────────── */
const PaginationBtns = ({ currentPage, total, pageSize, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const delta = 2;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      pages.push(i);
    }
  }
  const result = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) result.push('…');
    result.push(p);
    prev = p;
  }

  return (
    <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      <button
        className='tk-page-btn'
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
          <polyline points='15 18 9 12 15 6' />
        </svg>
      </button>
      {result.map((item, i) =>
        item === '…'
          ? <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--tk-text3)', fontSize: 13 }}>…</span>
          : (
            <button
              key={item}
              className={`tk-page-btn${item === currentPage ? ' tk-page-btn--active' : ''}`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
      )}
      <button
        className='tk-page-btn'
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
          <polyline points='9 18 15 12 9 6' />
        </svg>
      </button>
    </div>
  );
};

/* ─── Main page ─────────────────────────────────────────────────────────────── */
function TokensPage() {
  const openFluentNotificationRef = useRef(null);
  const openCCSwitchModalRef = useRef(null);
  const tokensData = useTokensData(
    (key) => openFluentNotificationRef.current?.(key),
    (key) => openCCSwitchModalRef.current?.(key),
  );

  const latestRef = useRef({
    tokens: [],
    selectedKeys: [],
    t: (k) => k,
    selectedModel: '',
    prefillKey: '',
    fetchTokenKey: async () => '',
  });

  const [modelOptions, setModelOptions] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [fluentNoticeOpen, setFluentNoticeOpen] = useState(false);
  const [prefillKey, setPrefillKey] = useState('');
  const [ccSwitchVisible, setCCSwitchVisible] = useState(false);
  const [ccSwitchKey, setCCSwitchKey] = useState('');
  const [showOps, setShowOps] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    latestRef.current = {
      tokens: tokensData.tokens,
      selectedKeys: tokensData.selectedKeys,
      t: tokensData.t,
      selectedModel,
      prefillKey,
      fetchTokenKey: tokensData.fetchTokenKey,
    };
  }, [tokensData.tokens, tokensData.selectedKeys, tokensData.t, selectedModel, prefillKey, tokensData.fetchTokenKey]);

  const loadModels = async () => {
    try {
      const res = await API.get('/api/user/models');
      const { success, message, data } = res.data || {};
      if (success) {
        const categories = getModelCategories(tokensData.t);
        setModelOptions(
          (data || []).map((model) => {
            let icon = null;
            for (const [key, category] of Object.entries(categories)) {
              if (key !== 'all' && category.filter({ model_name: model })) { icon = category.icon; break; }
            }
            return { label: <span className='flex items-center gap-1'>{icon}{model}</span>, value: model };
          }),
        );
      } else {
        showError(tokensData.t(message));
      }
    } catch (e) {
      showError(e.message || 'Failed to load models');
    }
  };

  function openFluentNotification(key) {
    const { t } = latestRef.current;
    const SUPPRESS_KEY = 'fluent_notify_suppressed';
    if (modelOptions.length === 0) loadModels();
    if (!key && localStorage.getItem(SUPPRESS_KEY) === '1') return;
    const container = document.getElementById('fluent-new-api-container');
    if (!container) { Toast.warning(t('未检测到 FluentRead（流畅阅读），请确认扩展已启用')); return; }
    setPrefillKey(key || '');
    setFluentNoticeOpen(true);
    Notification.info({
      id: 'fluent-detected',
      title: t('检测到 FluentRead（流畅阅读）'),
      content: (
        <div>
          <div style={{ marginBottom: 8 }}>
            {key ? t('请选择模型。') : t('选择模型后可一键填充当前选中令牌（或本页第一个令牌）。')}
          </div>
          <div style={{ marginBottom: 8 }}>
            <Select placeholder={t('请选择模型')} optionList={modelOptions} onChange={setSelectedModel}
              filter={selectFilter} style={{ width: 320 }} showClear searchable emptyContent={t('暂无数据')} />
          </div>
          <Space>
            <Button theme='solid' type='primary' onClick={handlePrefillToFluent}>{t('一键填充到 FluentRead')}</Button>
            {!key && (
              <Button type='warning' onClick={() => {
                localStorage.setItem(SUPPRESS_KEY, '1');
                Notification.close('fluent-detected');
                Toast.info(t('已关闭后续提醒'));
              }}>{t('不再提醒')}</Button>
            )}
            <Button type='tertiary' onClick={() => Notification.close('fluent-detected')}>{t('关闭')}</Button>
          </Space>
        </div>
      ),
      duration: 0,
    });
  }
  openFluentNotificationRef.current = openFluentNotification;

  function openCCSwitchModal(key) {
    if (modelOptions.length === 0) loadModels();
    setCCSwitchKey(key || '');
    setCCSwitchVisible(true);
  }
  openCCSwitchModalRef.current = openCCSwitchModal;

  const handlePrefillToFluent = async () => {
    const { tokens, selectedKeys, t, selectedModel: chosenModel, prefillKey: overrideKey, fetchTokenKey } = latestRef.current;
    const container = document.getElementById('fluent-new-api-container');
    if (!container) { Toast.error(t('未检测到 Fluent 容器')); return; }
    if (!chosenModel) { Toast.warning(t('请选择模型')); return; }

    let serverAddress = '';
    try { serverAddress = JSON.parse(localStorage.getItem('status') || '{}').server_address || ''; } catch (_) {}
    if (!serverAddress) serverAddress = window.location.origin;

    let apiKeyToUse = '';
    if (overrideKey) {
      apiKeyToUse = 'sk-' + overrideKey;
    } else {
      const token = selectedKeys?.length === 1 ? selectedKeys[0] : tokens?.[0] ?? null;
      if (!token) { Toast.warning(t('没有可用令牌用于填充')); return; }
      try { apiKeyToUse = 'sk-' + (await fetchTokenKey(token)); } catch (_) { return; }
    }

    container.dispatchEvent(new CustomEvent('fluent:prefill', {
      detail: { id: 'new-api', baseUrl: serverAddress, apiKey: apiKeyToUse, model: chosenModel },
    }));
    Toast.success(t('已发送到 Fluent'));
    Notification.close('fluent-detected');
  };

  useEffect(() => {
    const onAppeared = () => openFluentNotification();
    const onRemoved = () => { setFluentNoticeOpen(false); Notification.close('fluent-detected'); };
    window.addEventListener('fluent-container:appeared', onAppeared);
    window.addEventListener('fluent-container:removed', onRemoved);
    return () => {
      window.removeEventListener('fluent-container:appeared', onAppeared);
      window.removeEventListener('fluent-container:removed', onRemoved);
    };
  }, []);

  useEffect(() => {
    if (fluentNoticeOpen) openFluentNotification();
  }, [modelOptions, selectedModel, tokensData.t, fluentNoticeOpen]);

  useEffect(() => {
    const selector = '#fluent-new-api-container';
    const root = document.body || document.documentElement;
    const existing = document.querySelector(selector);
    if (existing) window.dispatchEvent(new CustomEvent('fluent-container:appeared', { detail: existing }));

    const isOrContains = (node) => {
      if (!(node && node.nodeType === 1)) return false;
      if (node.id === 'fluent-new-api-container') return true;
      return typeof node.querySelector === 'function' && !!node.querySelector(selector);
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const added of m.addedNodes) {
          if (isOrContains(added)) {
            const el = document.querySelector(selector);
            if (el) window.dispatchEvent(new CustomEvent('fluent-container:appeared', { detail: el }));
            break;
          }
        }
        for (const removed of m.removedNodes) {
          if (isOrContains(removed)) {
            if (!document.querySelector(selector)) window.dispatchEvent(new CustomEvent('fluent-container:removed'));
            break;
          }
        }
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const {
    showEdit, editingToken, closeEdit, refresh,
    selectedKeys, setEditingToken, setShowEdit,
    batchCopyTokens, batchDeleteTokens,
    searchTokens, loading, searching,
    filters, setFilterValue, resetFilters,
    t,
  } = tokensData;

  return (
    <>
      <EditTokenModal
        refresh={refresh}
        editingToken={editingToken}
        visiable={showEdit}
        handleClose={closeEdit}
      />

      <CCSwitchModal
        visible={ccSwitchVisible}
        onClose={() => setCCSwitchVisible(false)}
        tokenKey={ccSwitchKey}
        modelOptions={modelOptions}
      />

      <div className='tk-page'>
        <PersonalRateLimitNotice className='mb-4' />

        <div className='tk-card'>
          <TokensDescription t={t} />

          <div className='tk-toolbar' style={{ flexShrink: 0 }}>
            {isMobile ? (
              /* ── Mobile: collapsible ops panel ── */
              <div style={{ width: '100%' }}>
                <button
                  type='button'
                  className='tk-ops-toggle'
                  onClick={() => setShowOps((v) => !v)}
                >
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    {showOps
                      ? <><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></>
                      : <><circle cx='12' cy='12' r='1'/><circle cx='19' cy='12' r='1'/><circle cx='5' cy='12' r='1'/></>
                    }
                  </svg>
                  {showOps ? t('隐藏操作项') : t('显示操作项')}
                </button>
                {showOps && (
                  <div className='tk-ops-panel'>
                    <TokensFilters
                      filters={filters}
                      setFilterValue={setFilterValue}
                      resetFilters={resetFilters}
                      searchTokens={searchTokens}
                      loading={loading}
                      searching={searching}
                      t={t}
                      isMobile
                    />
                    <TokensActions
                      selectedKeys={selectedKeys}
                      setEditingToken={setEditingToken}
                      setShowEdit={setShowEdit}
                      batchCopyTokens={batchCopyTokens}
                      batchDeleteTokens={batchDeleteTokens}
                      t={t}
                      isMobile
                    />
                  </div>
                )}
              </div>
            ) : (
              /* ── Desktop: standard inline toolbar ── */
              <>
                <TokensFilters
                  filters={filters}
                  setFilterValue={setFilterValue}
                  resetFilters={resetFilters}
                  searchTokens={searchTokens}
                  loading={loading}
                  searching={searching}
                  t={t}
                />
                <TokensActions
                  selectedKeys={selectedKeys}
                  setEditingToken={setEditingToken}
                  setShowEdit={setShowEdit}
                  batchCopyTokens={batchCopyTokens}
                  batchDeleteTokens={batchDeleteTokens}
                  t={t}
                />
              </>
            )}
          </div>

          <TokensTable {...tokensData} />

          <div className='tk-pagination'>
            <span className='tk-pagination__info'>
              {t('显示')} {tokensData.tokenCount === 0 ? 0 : (tokensData.activePage - 1) * tokensData.pageSize + 1} {t('到')}{' '}
              {Math.min(tokensData.activePage * tokensData.pageSize, tokensData.tokenCount)} {t('条，共')} {tokensData.tokenCount} {t('条记录')}
            </span>
            <div className='tk-pagination__controls'>
              <select
                className='tk-page-size'
                value={tokensData.pageSize}
                onChange={(e) => tokensData.handlePageSizeChange(Number(e.target.value))}
              >
                {[10, 20, 50, 100].map((s) => (
                  <option key={s} value={s}>{s} {t('条/页')}</option>
                ))}
              </select>
              <PaginationBtns
                currentPage={tokensData.activePage}
                total={tokensData.tokenCount}
                pageSize={tokensData.pageSize}
                onPageChange={tokensData.handlePageChange}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default TokensPage;
