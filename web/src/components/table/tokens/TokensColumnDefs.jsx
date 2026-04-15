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
import {
  timestamp2string,
  renderQuota,
  showError,
} from '../../../helpers';

function renderTimestamp(timestamp) {
  return <>{timestamp2string(timestamp)}</>;
}

const STATUS_CONFIG = {
  1: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', label: '已启用' },
  2: { bg: 'rgba(225, 29, 72, 0.12)', color: '#e11d48', label: '已禁用' },
  3: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', label: '已过期' },
  4: { bg: 'rgba(148, 163, 184, 0.14)', color: '#94a3b8', label: '已耗尽' },
};

const renderStatus = (text, _record, t) => {
  const cfg = STATUS_CONFIG[text] || {
    bg: 'rgba(148, 163, 184, 0.14)',
    color: '#94a3b8',
    label: '未知状态',
  };

  return (
    <span className='token-glass-status' style={{ background: cfg.bg, color: cfg.color }}>
      <span
        className='token-glass-status__dot'
        style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }}
      />
      {t(cfg.label)}
    </span>
  );
};

const renderGroupColumn = (text, record, t) => {
  let label = text || 'default';
  if (text === 'auto') {
    label = record?.cross_group_retry
      ? `${t('智能熔断')}(${t('跨分组')})`
      : t('智能熔断');
  }
  return <span className='token-glass-badge'>{label}</span>;
};

const renderTokenKey = (_text, record, copyTokenKey, t) => (
  <button
    type='button'
    title={t('点击复制完整密钥')}
    className='token-glass-key-btn'
    onClick={async (e) => {
      e.stopPropagation();
      await copyTokenKey(record);
    }}
  >
    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
      <rect x='9' y='9' width='13' height='13' rx='2' ry='2' />
      <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
    </svg>
    {t('复制')}
  </button>
);

const QuotaCell = ({ record, t }) => {
  const used = parseInt(record.used_quota) || 0;
  const remain = parseInt(record.remain_quota) || 0;
  const total = used + remain;

  if (record.unlimited_quota) {
    return (
      <div className='token-glass-quota'>
        <span className='token-glass-badge'>{t('无限额度')}</span>
        <div className='token-glass-quota__pop'>
          <div className='token-glass-quota__row'>
            <span>{t('已用额度')}:</span>
            <span>{renderQuota(used)}</span>
          </div>
        </div>
      </div>
    );
  }

  const percent = total > 0 ? (remain / total) * 100 : 0;
  const barColor = percent <= 10 ? '#e11d48' : percent <= 30 ? '#f59e0b' : '#10b981';

  return (
    <div className='token-glass-quota'>
      <span className='token-glass-quota__pill'>
        <span className='token-glass-quota__label'>
          {`${renderQuota(remain)} / ${renderQuota(total)}`}
        </span>
        <span className='token-glass-quota__track'>
          <span
            className='token-glass-quota__bar'
            style={{ width: `${percent}%`, background: barColor }}
          />
        </span>
      </span>
      <div className='token-glass-quota__pop'>
        <div className='token-glass-quota__row'>
          <span>{t('已用额度')}:</span>
          <span>{renderQuota(used)}</span>
        </div>
        <div className='token-glass-quota__row'>
          <span>{t('剩余额度')}:</span>
          <span>
            {renderQuota(remain)} ({percent.toFixed(0)}%)
          </span>
        </div>
        <div className='token-glass-quota__row'>
          <span>{t('总额度')}:</span>
          <span>{renderQuota(total)}</span>
        </div>
      </div>
    </div>
  );
};

const ChatDropdownPortal = ({ items, style, record, onOpenLink, onClose }) =>
  ReactDOM.createPortal(
    <div className='token-glass-chat-menu' style={style}>
      {items.map((item, i) => (
        <button
          key={i}
          type='button'
          className='token-glass-chat-menu__item'
          onClick={() => {
            onOpenLink(item.name, item.value, record);
            onClose();
          }}
        >
          {item.name}
        </button>
      ))}
    </div>,
    document.body,
  );

const ChatSplitBtn = ({ chatsArray, record, onOpenLink, t }) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const arrowRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (arrowRef.current && !arrowRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const id = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('click', handler);
    };
  }, [open]);

  const handleArrow = (e) => {
    e.stopPropagation();
    if (!open && arrowRef.current) {
      const rect = arrowRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
        minWidth: 140,
        zIndex: 2147483647,
      });
    }
    setOpen((v) => !v);
  };

  const handleChat = (e) => {
    e.stopPropagation();
    if (chatsArray.length === 0) {
      showError(t('请联系管理员配置聊天链接'));
      return;
    }
    onOpenLink(chatsArray[0].name, chatsArray[0].value, record);
  };

  return (
    <>
      <div className='token-glass-chat'>
        <button type='button' className='token-glass-chat__main' onClick={handleChat}>
          <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
          </svg>
          {t('聊天')}
        </button>
        {chatsArray.length > 0 && (
          <button
            type='button'
            ref={arrowRef}
            className='token-glass-chat__arrow'
            onClick={handleArrow}
          >
            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
              <polyline points='6 9 12 15 18 9' />
            </svg>
          </button>
        )}
      </div>
      {open && chatsArray.length > 0 && (
        <ChatDropdownPortal
          items={chatsArray}
          style={menuStyle}
          record={record}
          onOpenLink={onOpenLink}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

const ActBtn = ({ onClick, variant = 'default', children }) => {
  const className =
    variant === 'success'
      ? 'token-glass-action-btn token-glass-action-btn--success'
      : variant === 'warning'
        ? 'token-glass-action-btn token-glass-action-btn--warning'
        : variant === 'danger'
          ? 'token-glass-action-btn token-glass-action-btn--danger'
          : 'token-glass-action-btn';

  return (
    <button type='button' onClick={onClick} className={className}>
      {children}
    </button>
  );
};

const ICO_STOP = <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><circle cx='12' cy='12' r='10' /><line x1='4.93' y1='4.93' x2='19.07' y2='19.07' /></svg>;
const ICO_PLAY = <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><polygon points='5 3 19 12 5 21 5 3' /></svg>;
const ICO_EDIT = <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' /><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' /></svg>;
const ICO_DELETE = <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6' /><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' /></svg>;

const renderOperations = (
  _text,
  record,
  onOpenLink,
  setEditingToken,
  setShowEdit,
  manageToken,
  refresh,
  t,
) => {
  let chatsArray = [];
  try {
    const raw = localStorage.getItem('chats');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        const name = Object.keys(item)[0];
        if (!name) continue;
        chatsArray.push({ name, value: item[name] });
      }
    }
  } catch (_) {
    showError(t('聊天链接配置错误，请联系管理员'));
  }

  return (
    <div className='token-glass-row-actions'>
      <ChatSplitBtn chatsArray={chatsArray} record={record} onOpenLink={onOpenLink} t={t} />

      {record.status === 1 ? (
        <ActBtn
          variant='warning'
          onClick={async () => {
            await manageToken(record.id, 'disable', record);
            await refresh();
          }}
        >
          {ICO_STOP}
          {t('禁用')}
        </ActBtn>
      ) : (
        <ActBtn
          variant='success'
          onClick={async () => {
            await manageToken(record.id, 'enable', record);
            await refresh();
          }}
        >
          {ICO_PLAY}
          {t('启用')}
        </ActBtn>
      )}

      <ActBtn
        onClick={() => {
          setEditingToken(record);
          setShowEdit(true);
        }}
      >
        {ICO_EDIT}
        {t('编辑')}
      </ActBtn>

      <ActBtn
        variant='danger'
        onClick={() => {
          Modal.confirm({
            className: 'token-glass-modal token-glass-modal--danger',
            title: t('确定是否要删除此令牌？'),
            content: t('此修改将不可逆'),
            okText: t('确认删除'),
            cancelText: t('取消'),
            onOk: () => {
              (async () => {
                await manageToken(record.id, 'delete', record);
                await refresh();
              })();
            },
          });
        }}
      >
        {ICO_DELETE}
        {t('删除')}
      </ActBtn>
    </div>
  );
};

export const getTokensColumns = ({
  t,
  copyTokenKey,
  manageToken,
  onOpenLink,
  setEditingToken,
  setShowEdit,
  refresh,
}) => [
  {
    title: t('名称'),
    dataIndex: 'name',
    render: (text, record) => (
      <span
        className={`token-glass-cell-title ${record.status !== 1 ? 'token-glass-cell-title--muted' : ''}`}
      >
        {text}
      </span>
    ),
  },
  {
    title: t('状态'),
    dataIndex: 'status',
    key: 'status',
    render: (text, record) => renderStatus(text, record, t),
  },
  {
    title: t('剩余额度/总额度'),
    key: 'quota_usage',
    render: (text, record) => <QuotaCell record={record} t={t} />,
  },
  {
    title: t('分组'),
    dataIndex: 'group',
    key: 'group',
    render: (text, record) => renderGroupColumn(text, record, t),
  },
  {
    title: t('密钥'),
    key: 'token_key',
    render: (text, record) => renderTokenKey(text, record, copyTokenKey, t),
  },
  {
    title: t('创建时间'),
    dataIndex: 'created_time',
    render: (text) => <span className='token-glass-time'>{renderTimestamp(text)}</span>,
  },
  {
    title: t('过期时间'),
    dataIndex: 'expired_time',
    render: (text, record) => (
      <span className='token-glass-time'>
        {record.expired_time === -1 ? t('永不过期') : renderTimestamp(text)}
      </span>
    ),
  },
  {
    title: '',
    dataIndex: 'operate',
    fixed: 'right',
    render: (text, record) =>
      renderOperations(
        text,
        record,
        onOpenLink,
        setEditingToken,
        setShowEdit,
        manageToken,
        refresh,
        t,
      ),
  },
];
