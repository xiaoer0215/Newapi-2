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

import React from 'react';
import { Modal } from '@douyinfe/semi-ui';
import { renderQuota, timestamp2string } from '../../../helpers';
import ChatDropdown from './ChatDropdown';

const STATUS_MAP = {
  1: {
    className: 'token-glass-status token-glass-status--success',
    dotClassName: 'token-glass-status__dot token-glass-status__dot--success',
    label: '已启用',
  },
  2: {
    className: 'token-glass-status token-glass-status--danger',
    dotClassName: 'token-glass-status__dot token-glass-status__dot--danger',
    label: '已禁用',
  },
  3: {
    className: 'token-glass-status token-glass-status--warning',
    dotClassName: 'token-glass-status__dot token-glass-status__dot--warning',
    label: '已过期',
  },
  4: {
    className: 'token-glass-status token-glass-status--muted',
    dotClassName: 'token-glass-status__dot token-glass-status__dot--muted',
    label: '已耗尽',
  },
};

const ActionButton = ({ variant = 'default', onClick, children }) => {
  const className =
    variant === 'success'
      ? 'token-glass-action-btn token-glass-action-btn--success'
      : variant === 'warning'
        ? 'token-glass-action-btn token-glass-action-btn--warning'
        : variant === 'danger'
          ? 'token-glass-action-btn token-glass-action-btn--danger'
          : 'token-glass-action-btn';

  return (
    <button
      type='button'
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const TokenCard = ({
  record,
  selected,
  onSelect,
  copyTokenKey,
  manageToken,
  setEditingToken,
  setShowEdit,
  onOpenLink,
  refresh,
  t,
}) => {
  const status = STATUS_MAP[record.status] || STATUS_MAP[4];
  const used = parseInt(record.used_quota) || 0;
  const remain = parseInt(record.remain_quota) || 0;
  const total = used + remain;
  const quotaPercent = record.unlimited_quota
    ? 100
    : total > 0
      ? Math.min(100, Math.max(0, (remain / total) * 100))
      : 0;
  const quotaTone =
    quotaPercent <= 10 ? 'danger' : quotaPercent <= 30 ? 'warning' : 'success';

  return (
    <article
      className={`token-glass-mobile-card ${
        selected ? 'token-glass-mobile-card--selected' : ''
      } ${record.status !== 1 ? 'token-glass-mobile-card--muted' : ''}`}
    >
      <div className='token-glass-mobile-card__top'>
        <button
          type='button'
          className={`token-glass-mobile-check ${
            selected ? 'token-glass-mobile-check--selected' : ''
          }`}
          onClick={() => onSelect(record)}
          aria-label={selected ? t('取消选择') : t('选择令牌')}
        >
          <svg
            width='12'
            height='12'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='3'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <polyline points='20 6 9 17 4 12' />
          </svg>
        </button>

        <div className='token-glass-mobile-card__title-wrap'>
          <div className='token-glass-mobile-card__title-row'>
            <h3 className='token-glass-mobile-card__title'>{record.name}</h3>
            <span className={status.className}>
              <span className={status.dotClassName} />
              {t(status.label)}
            </span>
          </div>
          <div className='token-glass-mobile-card__meta'>
            <span className='token-glass-badge'>{record.group || 'default'}</span>
            <span className='token-glass-badge'>
              {record.expired_time === -1
                ? t('永不过期')
                : timestamp2string(record.expired_time)}
            </span>
          </div>
        </div>
      </div>

      <div className='token-glass-mobile-card__section'>
        <div className='token-glass-mobile-card__label'>{t('额度')}</div>
        {record.unlimited_quota ? (
          <span className='token-glass-badge'>{t('无限额度')}</span>
        ) : (
          <div className='token-glass-mobile-card__quota'>
            <div className='token-glass-mobile-card__quota-row'>
              <span>{renderQuota(remain)}</span>
              <span className='token-glass-mobile-card__quota-sep'>/</span>
              <span>{renderQuota(total)}</span>
            </div>
            <span className='token-glass-quota__track'>
              <span
                className={`token-glass-quota__bar token-glass-quota__bar--${quotaTone}`}
                style={{ width: `${quotaPercent}%` }}
              />
            </span>
          </div>
        )}
      </div>

      <div className='token-glass-mobile-card__section'>
        <div className='token-glass-mobile-card__label'>{t('密钥')}</div>
        <button
          type='button'
          className='token-glass-mobile-card__key'
          onClick={async (e) => {
            e.stopPropagation();
            await copyTokenKey(record);
          }}
        >
          <span className='token-glass-mobile-card__key-mask'>sk-********************</span>
          <span className='token-glass-mobile-card__key-copy'>
            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <rect x='9' y='9' width='13' height='13' rx='2' ry='2' />
              <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
            </svg>
            {t('复制')}
          </span>
        </button>
      </div>

      <div className='token-glass-mobile-card__grid'>
        <div className='token-glass-mobile-card__field'>
          <span className='token-glass-mobile-card__field-label'>{t('创建时间')}</span>
          <span className='token-glass-time'>{timestamp2string(record.created_time)}</span>
        </div>
        <div className='token-glass-mobile-card__field'>
          <span className='token-glass-mobile-card__field-label'>{t('已用额度')}</span>
          <span className='token-glass-time'>{renderQuota(used)}</span>
        </div>
      </div>

      <div className='token-glass-mobile-card__actions'>
        <div className='token-glass-mobile-card__chat'>
          <ChatDropdown record={record} onOpenLink={onOpenLink} t={t} />
        </div>

        <div className='token-glass-mobile-card__action-set'>
          {record.status === 1 ? (
            <ActionButton
              variant='warning'
              onClick={async (e) => {
                e.stopPropagation();
                await manageToken(record.id, 'disable', record);
                await refresh();
              }}
            >
              <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <circle cx='12' cy='12' r='10' />
                <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
              </svg>
              {t('禁用')}
            </ActionButton>
          ) : (
            <ActionButton
              variant='success'
              onClick={async (e) => {
                e.stopPropagation();
                await manageToken(record.id, 'enable', record);
                await refresh();
              }}
            >
              <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <polygon points='5 3 19 12 5 21 5 3' />
              </svg>
              {t('启用')}
            </ActionButton>
          )}

          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              setEditingToken(record);
              setShowEdit(true);
            }}
          >
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
              <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
            </svg>
            {t('编辑')}
          </ActionButton>

          <ActionButton
            variant='danger'
            onClick={(e) => {
              e.stopPropagation();
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
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <polyline points='3 6 5 6 21 6' />
              <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
            </svg>
            {t('删除')}
          </ActionButton>
        </div>
      </div>
    </article>
  );
};

export default TokenCard;
