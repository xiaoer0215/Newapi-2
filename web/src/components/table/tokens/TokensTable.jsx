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

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Modal } from '@douyinfe/semi-ui';
import { timestamp2string, renderQuota, showError } from '../../../helpers';
import { useIsMobile } from '../../../hooks/common/useIsMobile';

/* ─── Status config ─────────────────────────────────────────────────────────── */
const STATUS = {
  1: { cls: 'tk-badge--success', label: '已启用' },
  2: { cls: 'tk-badge--danger',  label: '已禁用' },
  3: { cls: 'tk-badge--warning', label: '已过期' },
  4: { cls: 'tk-badge--muted',   label: '已耗尽' },
};

/* ─── Quota cell ────────────────────────────────────────────────────────────── */
const QuotaCell = ({ record, t }) => {
  const used   = parseInt(record.used_quota)   || 0;
  const remain = parseInt(record.remain_quota) || 0;
  const total  = used + remain;

  if (record.unlimited_quota) {
    return (
      <div className='tk-quota'>
        <span className='tk-badge tk-badge--outline' style={{ background: '#fff', borderRadius: 12 }}>
          {t('无限额度')}
        </span>
        <div className='tk-quota__pop'>
          <div className='tk-quota__row'><span>{t('已用额度')}:</span><span>{renderQuota(used)}</span></div>
        </div>
      </div>
    );
  }

  const pct = total > 0 ? (remain / total) * 100 : 0;
  const barColor = pct <= 10 ? '#E11D48' : pct <= 30 ? '#F59E0B' : '#10B981';

  return (
    <div className='tk-quota'>
      <span className='tk-quota__pill'>
        <span>{`${renderQuota(remain)} / ${renderQuota(total)}`}</span>
        <span className='tk-quota__track'>
          <span className='tk-quota__bar' style={{ width: `${pct}%`, background: barColor }} />
        </span>
      </span>
      <div className='tk-quota__pop'>
        <div className='tk-quota__row'><span>{t('已用额度')}:</span><span>{renderQuota(used)}</span></div>
        <div className='tk-quota__row'><span>{t('剩余额度')}:</span><span>{renderQuota(remain)} ({pct.toFixed(0)}%)</span></div>
        <div className='tk-quota__row'><span>{t('总额度')}:</span><span>{renderQuota(total)}</span></div>
      </div>
    </div>
  );
};

/* ─── Chat split button ─────────────────────────────────────────────────────── */
const ChatSplitBtn = ({ record, onOpenLink, t }) => {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState({});
  const arrowRef = useRef(null);

  let chatsArray = [];
  try {
    const parsed = JSON.parse(localStorage.getItem('chats') || '[]');
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        const name = Object.keys(item)[0];
        if (name) chatsArray.push({ name, value: item[name] });
      });
    }
  } catch (_) {}

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (arrowRef.current && !arrowRef.current.contains(e.target)) setOpen(false);
    };
    const id = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(id); document.removeEventListener('click', handler); };
  }, [open]);

  const handleArrow = (e) => {
    e.stopPropagation();
    if (!open && arrowRef.current) {
      const r = arrowRef.current.getBoundingClientRect();
      setStyle({ top: r.bottom + 4, left: r.left + r.width / 2, transform: 'translateX(-50%)' });
    }
    setOpen((v) => !v);
  };

  const handleChat = (e) => {
    e.stopPropagation();
    if (chatsArray.length === 0) { showError(t('请联系管理员配置聊天链接')); return; }
    onOpenLink(chatsArray[0].name, chatsArray[0].value, record);
  };

  return (
    <>
      <div className='tk-split'>
        <button type='button' className='tk-split__main' onClick={handleChat}>{t('聊天')}</button>
        {chatsArray.length > 0 && (
          <button type='button' ref={arrowRef} className='tk-split__arrow' onClick={handleArrow}>
            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
              <polyline points='6 9 12 15 18 9' />
            </svg>
          </button>
        )}
      </div>
      {open && chatsArray.length > 0 && ReactDOM.createPortal(
        <div className='tk-dropdown' style={style}>
          {chatsArray.map((c, i) => (
            <button key={i} type='button' className='tk-dropdown__item'
              onClick={() => { onOpenLink(c.name, c.value, record); setOpen(false); }}>
              {c.name}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
};

/* ─── ICO constants ─────────────────────────────────────────────────────────── */
const ICO_STOP   = <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><circle cx='12' cy='12' r='10'/><line x1='4.93' y1='4.93' x2='19.07' y2='19.07'/></svg>;
const ICO_PLAY   = <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><polygon points='5 3 19 12 5 21 5 3'/></svg>;
const ICO_EDIT   = <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/></svg>;
const ICO_DELETE = <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/></svg>;
const ICO_COPY   = <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><rect x='9' y='9' width='13' height='13' rx='2' ry='2'/><path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/></svg>;

/* ─── Mobile token card ─────────────────────────────────────────────────────── */
const MobileTokenCard = ({
  record, selected, onToggleSelect,
  copyTokenKey, manageToken, onOpenLink,
  setEditingToken, setShowEdit, refresh, t,
}) => {
  const cfg = STATUS[record.status] || { cls: 'tk-badge--muted', label: '未知状态' };

  let groupLabel = record.group || 'default';
  if (record.group === 'auto') {
    groupLabel = record.cross_group_retry
      ? `${t('智能熔断')}(${t('跨分组')})`
      : t('智能熔断');
  }

  const handleDelete = () => {
    Modal.confirm({
      title: t('确定是否要删除此令牌？'),
      content: t('此修改将不可逆'),
      onOk: async () => { await manageToken(record.id, 'delete', record); await refresh(); },
    });
  };

  return (
    <div className={`tk-mcard${record.status !== 1 ? ' tk-mcard--disabled' : ''}`}>
      {/* Header row: checkbox + name + status badge */}
      <div className='tk-mcard__head'>
        <input type='checkbox' className='tk-checkbox' checked={selected} onChange={() => onToggleSelect(record)} />
        <span className='tk-mcard__name'>{record.name}</span>
        <span className={`tk-badge ${cfg.cls}`}>{t(cfg.label)}</span>
      </div>

      {/* Key-value body */}
      <div className='tk-mcard__body'>
        <div className='tk-mcard__row'>
          <span className='tk-mcard__lbl'>{t('剩余/总额度')}</span>
          <div className='tk-mcard__val'><QuotaCell record={record} t={t} /></div>
        </div>
        <div className='tk-mcard__row'>
          <span className='tk-mcard__lbl'>{t('分组')}</span>
          <span className='tk-badge tk-badge--outline tk-mcard__val'>{groupLabel}</span>
        </div>
        <div className='tk-mcard__row'>
          <span className='tk-mcard__lbl'>{t('密钥')}</span>
          <button type='button' className='tk-copy-btn tk-copy-btn--sm'
            onClick={async (e) => { e.stopPropagation(); await copyTokenKey(record); }}>
            {ICO_COPY}{t('复制')}
          </button>
        </div>
        <div className='tk-mcard__row'>
          <span className='tk-mcard__lbl'>{t('创建时间')}</span>
          <span className='tk-mcard__val tk-time'>{timestamp2string(record.created_time)}</span>
        </div>
        <div className='tk-mcard__row tk-mcard__row--last'>
          <span className='tk-mcard__lbl'>{t('过期时间')}</span>
          <span className='tk-mcard__val tk-time'>
            {record.expired_time === -1 ? t('永不过期') : timestamp2string(record.expired_time)}
          </span>
        </div>
      </div>

      {/* Actions row */}
      <div className='tk-mcard__actions'>
        <ChatSplitBtn record={record} onOpenLink={onOpenLink} t={t} />
        {record.status === 1 ? (
          <button type='button' className='tk-act tk-act--warning'
            onClick={async () => { await manageToken(record.id, 'disable', record); await refresh(); }}>
            {ICO_STOP} {t('禁用')}
          </button>
        ) : (
          <button type='button' className='tk-act tk-act--success'
            onClick={async () => { await manageToken(record.id, 'enable', record); await refresh(); }}>
            {ICO_PLAY} {t('启用')}
          </button>
        )}
        <button type='button' className='tk-act' onClick={() => { setEditingToken(record); setShowEdit(true); }}>
          {ICO_EDIT} {t('编辑')}
        </button>
        <button type='button' className='tk-act tk-act--danger' onClick={handleDelete}>
          {ICO_DELETE} {t('删除')}
        </button>
      </div>
    </div>
  );
};

/* ─── Token row (desktop) ───────────────────────────────────────────────────── */
const TokenRow = ({
  record, selected, onToggleSelect,
  copyTokenKey, manageToken, onOpenLink,
  setEditingToken, setShowEdit, refresh, t,
}) => {
  const cfg = STATUS[record.status] || { cls: 'tk-badge--muted', label: '未知状态' };

  let groupLabel = record.group || 'default';
  if (record.group === 'auto') {
    groupLabel = record.cross_group_retry
      ? `${t('智能熔断')}(${t('跨分组')})`
      : t('智能熔断');
  }

  const handleDelete = () => {
    Modal.confirm({
      title: t('确定是否要删除此令牌？'),
      content: t('此修改将不可逆'),
      onOk: async () => { await manageToken(record.id, 'delete', record); await refresh(); },
    });
  };

  return (
    <tr className={record.status !== 1 ? 'tk-row--disabled' : ''}>
      <td><input type='checkbox' className='tk-checkbox' checked={selected} onChange={() => onToggleSelect(record)} /></td>
      <td><div className={`tk-name${record.status !== 1 ? ' tk-name--disabled' : ''}`}>{record.name}</div></td>
      <td><span className={`tk-badge ${cfg.cls}`}>{t(cfg.label)}</span></td>
      <td><QuotaCell record={record} t={t} /></td>
      <td><span className='tk-badge tk-badge--outline'>{groupLabel}</span></td>
      <td>
        <button type='button' className='tk-copy-btn' title={t('点击复制完整密钥')}
          onClick={async (e) => { e.stopPropagation(); await copyTokenKey(record); }}>
          {ICO_COPY}{t('复制')}
        </button>
      </td>
      <td><div className='tk-time'>{timestamp2string(record.created_time)}</div></td>
      <td><div className='tk-time'>{record.expired_time === -1 ? t('永不过期') : timestamp2string(record.expired_time)}</div></td>
      <td>
        <div className='tk-actions'>
          <ChatSplitBtn record={record} onOpenLink={onOpenLink} t={t} />
          {record.status === 1 ? (
            <button type='button' className='tk-act tk-act--warning'
              onClick={async () => { await manageToken(record.id, 'disable', record); await refresh(); }}>
              {ICO_STOP} {t('禁用')}
            </button>
          ) : (
            <button type='button' className='tk-act tk-act--success'
              onClick={async () => { await manageToken(record.id, 'enable', record); await refresh(); }}>
              {ICO_PLAY} {t('启用')}
            </button>
          )}
          <button type='button' className='tk-act' onClick={() => { setEditingToken(record); setShowEdit(true); }}>
            {ICO_EDIT} {t('编辑')}
          </button>
          <button type='button' className='tk-act tk-act--danger' onClick={handleDelete}>
            {ICO_DELETE} {t('删除')}
          </button>
        </div>
      </td>
    </tr>
  );
};

/* ─── TokensTable ───────────────────────────────────────────────────────────── */
const TokensTable = (tokensData) => {
  const {
    tokens, loading, selectedKeys, setSelectedKeys,
    copyTokenKey, manageToken, onOpenLink,
    setEditingToken, setShowEdit, refresh, t,
  } = tokensData;

  const isMobile = useIsMobile();

  const allSelected = tokens.length > 0 && tokens.every((r) => selectedKeys.some((s) => s.id === r.id));

  const onToggleAll = () => {
    if (allSelected) {
      setSelectedKeys((prev) => prev.filter((s) => !tokens.some((r) => r.id === s.id)));
    } else {
      setSelectedKeys((prev) => {
        const existing = new Set(prev.map((s) => s.id));
        return [...prev, ...tokens.filter((r) => !existing.has(r.id))];
      });
    }
  };

  const onToggleSelect = (record) => {
    setSelectedKeys((prev) => {
      const exists = prev.some((s) => s.id === record.id);
      return exists ? prev.filter((s) => s.id !== record.id) : [...prev, record];
    });
  };

  const sharedProps = { copyTokenKey, manageToken, onOpenLink, setEditingToken, setShowEdit, refresh, t };

  if (loading) {
    return (
      <div className='tk-table-wrap'>
        <div className='tk-loading'><div className='tk-spinner' /><span>{t('加载中...')}</span></div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className='tk-table-wrap'>
        <div className='tk-empty'>{t('暂无数据')}</div>
      </div>
    );
  }

  /* ── Mobile: card list ── */
  if (isMobile) {
    return (
      <div className='tk-cards-wrap'>
        <div className='tk-cards-allsel'>
          <input type='checkbox' className='tk-checkbox' checked={allSelected} onChange={onToggleAll} />
          <span style={{ fontSize: 13, color: 'var(--tk-text2)' }}>{t('全选')}</span>
        </div>
        {tokens.map((record) => (
          <MobileTokenCard
            key={record.id}
            record={record}
            selected={selectedKeys.some((s) => s.id === record.id)}
            onToggleSelect={onToggleSelect}
            {...sharedProps}
          />
        ))}
      </div>
    );
  }

  /* ── Desktop: table ── */
  return (
    <div className='tk-table-wrap'>
      <div className='tk-table-scroll'>
        <table className='tk-table'>
          <thead>
            <tr>
              <th><input type='checkbox' className='tk-checkbox' checked={allSelected} onChange={onToggleAll} /></th>
              <th>{t('名称')}</th>
              <th>{t('状态')}</th>
              <th>{t('剩余 / 总额度')}</th>
              <th>{t('分组')}</th>
              <th>{t('密钥')}</th>
              <th>{t('创建时间')}</th>
              <th>{t('过期时间')}</th>
              <th>{t('操作')}</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((record) => (
              <TokenRow
                key={record.id}
                record={record}
                selected={selectedKeys.some((s) => s.id === record.id)}
                onToggleSelect={onToggleSelect}
                {...sharedProps}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TokensTable;
