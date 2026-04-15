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

const DeleteTokensModal = ({
  visible,
  onCancel,
  onConfirm,
  selectedKeys,
  t,
}) => {
  return (
    <Modal
      title={t('批量删除令牌')}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      className='token-glass-modal token-glass-modal--danger'
      width={420}
    >
      <div className='token-glass-modal__body'>
        <div className='token-glass-modal__warning'>
          <div className='token-glass-modal__warning-icon'>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
              <line x1='12' y1='9' x2='12' y2='13' />
              <line x1='12' y1='17' x2='12.01' y2='17' />
            </svg>
          </div>
          <div>
            <div className='token-glass-modal__warning-title'>
              {t('确定要删除所选的 {{count}} 个令牌吗？', {
                count: selectedKeys.length,
              })}
            </div>
            <div className='token-glass-modal__warning-desc'>
              {t('此操作不可恢复，请确认这些令牌不再使用。')}
            </div>
          </div>
        </div>

        <div className='token-glass-modal__footer'>
          <button
            type='button'
            className='token-glass-btn token-glass-btn--ghost'
            onClick={onCancel}
          >
            {t('取消')}
          </button>
          <button
            type='button'
            className='token-glass-btn token-glass-btn--danger-solid'
            onClick={onConfirm}
          >
            {t('确认删除')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteTokensModal;
