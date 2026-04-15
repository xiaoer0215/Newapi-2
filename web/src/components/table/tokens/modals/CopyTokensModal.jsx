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

const CopyTokensModal = ({ visible, onCancel, batchCopyTokens, t }) => {
  const handleCopyWithName = async () => {
    await batchCopyTokens('name+key');
    onCancel();
  };

  const handleCopyKeyOnly = async () => {
    await batchCopyTokens('key-only');
    onCancel();
  };

  return (
    <Modal
      title={t('复制令牌')}
      icon={null}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      className='token-glass-modal'
      width={420}
    >
      <div className='token-glass-modal__body'>
        <p className='token-glass-modal__text'>{t('请选择你的复制方式')}</p>

        <div className='token-glass-choice-grid'>
          <button
            type='button'
            className='token-glass-choice-card'
            onClick={handleCopyWithName}
          >
            <span className='token-glass-choice-card__title'>{t('名称 + 密钥')}</span>
            <span className='token-glass-choice-card__desc'>
              {t('适合导出或给多枚令牌做映射备注')}
            </span>
          </button>

          <button
            type='button'
            className='token-glass-choice-card'
            onClick={handleCopyKeyOnly}
          >
            <span className='token-glass-choice-card__title'>{t('仅密钥')}</span>
            <span className='token-glass-choice-card__desc'>
              {t('适合直接粘贴到客户端或脚本中')}
            </span>
          </button>
        </div>

        <div className='token-glass-modal__footer'>
          <button
            type='button'
            className='token-glass-btn token-glass-btn--ghost'
            onClick={onCancel}
          >
            {t('取消')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CopyTokensModal;
