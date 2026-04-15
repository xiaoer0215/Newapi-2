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

const TokensFilters = ({
  filters,
  setFilterValue,
  resetFilters,
  searchTokens,
  loading,
  searching,
  t,
  isMobile = false,
}) => {
  const busy = loading || searching;

  const handleSubmit = (e) => {
    e.preventDefault();
    searchTokens(1);
  };

  const handleReset = () => {
    resetFilters();
    setTimeout(() => searchTokens(), 50);
  };

  if (isMobile) {
    return (
      <form onSubmit={handleSubmit} autoComplete='off' style={{ width: '100%' }}>
        <label className='tk-search' style={{ width: '100%', marginBottom: 8 }}>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
          </svg>
          <input
            type='text'
            value={filters?.searchKeyword || ''}
            onChange={(e) => setFilterValue('searchKeyword', e.target.value)}
            placeholder={t('搜索关键字')}
          />
        </label>
        <label className='tk-search' style={{ width: '100%', marginBottom: 10 }}>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <rect x='3' y='11' width='18' height='11' rx='2' ry='2' /><path d='M7 11V7a5 5 0 0 1 10 0v4' />
          </svg>
          <input
            type='text'
            value={filters?.searchToken || ''}
            onChange={(e) => setFilterValue('searchToken', e.target.value)}
            placeholder={t('密钥')}
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button type='submit' disabled={busy} className='tk-btn tk-btn--secondary'>
            {busy ? t('查询中...') : t('查询')}
          </button>
          <button type='button' onClick={handleReset} className='tk-btn tk-btn--secondary'>
            {t('重置')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} autoComplete='off'>
      <div className='tk-toolbar__filters'>
        <label className='tk-search'>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
          </svg>
          <input
            type='text'
            value={filters?.searchKeyword || ''}
            onChange={(e) => setFilterValue('searchKeyword', e.target.value)}
            placeholder={t('搜索关键字')}
          />
        </label>
        <label className='tk-search'>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <rect x='3' y='11' width='18' height='11' rx='2' ry='2' /><path d='M7 11V7a5 5 0 0 1 10 0v4' />
          </svg>
          <input
            type='text'
            value={filters?.searchToken || ''}
            onChange={(e) => setFilterValue('searchToken', e.target.value)}
            placeholder={t('密钥')}
          />
        </label>
        <button type='submit' disabled={busy} className='tk-btn tk-btn--secondary'>
          {busy ? t('查询中...') : t('查询')}
        </button>
        <button type='button' onClick={handleReset} className='tk-btn tk-btn--secondary'>
          {t('重置')}
        </button>
      </div>
    </form>
  );
};

export default TokensFilters;
