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

import React, { useState } from 'react';
import { showError } from '../../../helpers';
import CopyTokensModal from './modals/CopyTokensModal';
import DeleteTokensModal from './modals/DeleteTokensModal';

const ICO_PLUS = (
  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
    <line x1='12' y1='5' x2='12' y2='19' /><line x1='5' y1='12' x2='19' y2='12' />
  </svg>
);

const TokensActions = ({
  selectedKeys,
  setEditingToken,
  setShowEdit,
  batchCopyTokens,
  batchDeleteTokens,
  t,
  isMobile = false,
}) => {
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleCopySelected = () => {
    if (selectedKeys.length === 0) { showError(t('请至少选择一个令牌！')); return; }
    setShowCopyModal(true);
  };

  const handleDeleteSelected = () => {
    if (selectedKeys.length === 0) { showError(t('请至少选择一个令牌！')); return; }
    setShowDeleteModal(true);
  };

  const modals = (
    <>
      <CopyTokensModal
        visible={showCopyModal}
        onCancel={() => setShowCopyModal(false)}
        batchCopyTokens={batchCopyTokens}
        t={t}
      />
      <DeleteTokensModal
        visible={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => { batchDeleteTokens(); setShowDeleteModal(false); }}
        selectedKeys={selectedKeys}
        t={t}
      />
    </>
  );

  if (isMobile) {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          <button
            type='button'
            className='tk-btn tk-btn--primary'
            onClick={() => { setEditingToken({ id: undefined }); setShowEdit(true); }}
          >
            {ICO_PLUS}{t('添加令牌')}
          </button>
          <button type='button' className='tk-btn tk-btn--secondary' onClick={handleCopySelected}>
            {t('复制所选令牌')}
          </button>
        </div>
        <button
          type='button'
          className='tk-btn tk-btn--danger'
          style={{ width: '100%', marginTop: 8 }}
          onClick={handleDeleteSelected}
        >
          {t('删除所选令牌')}
        </button>
        {modals}
      </>
    );
  }

  return (
    <>
      <div className='tk-toolbar__actions'>
        <button
          type='button'
          className='tk-btn tk-btn--primary'
          onClick={() => { setEditingToken({ id: undefined }); setShowEdit(true); }}
        >
          {ICO_PLUS}{t('添加令牌')}
        </button>
        <button type='button' className='tk-btn tk-btn--secondary' onClick={handleCopySelected}>
          {t('复制所选令牌')}
        </button>
        <button type='button' className='tk-btn tk-btn--danger' onClick={handleDeleteSelected}>
          {t('删除所选令牌')}
        </button>
      </div>
      {modals}
    </>
  );
};

export default TokensActions;
