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

import React, { useRef, useEffect, useCallback } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { usePlayground } from '../../contexts/PlaygroundContext';

const CustomInputRender = (props) => {
  const { t } = useTranslation();
  const { onPasteImage, imageUrls = [], onRemoveImage } = usePlayground();
  const { detailProps } = props;
  const { inputNode, sendNode, onClick } = detailProps;
  const containerRef = useRef(null);
  const visibleImageUrls = Array.isArray(imageUrls)
    ? imageUrls.filter((url) => typeof url === 'string' && url.trim() !== '')
    : [];

  const handlePaste = useCallback(
    async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();

          if (file) {
            try {
              const reader = new FileReader();
              reader.onload = (event) => {
                const base64 = event.target.result;

                if (onPasteImage) {
                  onPasteImage(base64);
                  Toast.success({
                    content: t('图片已添加'),
                    duration: 2,
                  });
                } else {
                  Toast.error({
                    content: t('无法添加图片'),
                    duration: 2,
                  });
                }
              };
              reader.onerror = () => {
                console.error('Failed to read image file:', reader.error);
                Toast.error({
                  content: t('粘贴图片失败'),
                  duration: 2,
                });
              };
              reader.readAsDataURL(file);
            } catch (error) {
              console.error('Failed to paste image:', error);
              Toast.error({
                content: t('粘贴图片失败'),
                duration: 2,
              });
            }
          }
          break;
        }
      }
    },
    [onPasteImage, t],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('paste', handlePaste);
    return () => {
      container.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const styledSendNode = React.cloneElement(sendNode, {
    className: `playground-send-button flex-shrink-0 transition-all ${sendNode.props.className || ''}`,
    style: {
      ...sendNode.props.style,
      width: '42px',
      height: '42px',
      minWidth: '42px',
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <div className='playground-composer-wrap' ref={containerRef}>
      {visibleImageUrls.length > 0 && (
        <div className='playground-paste-preview'>
          {visibleImageUrls.map((url, index) => (
            <div className='playground-paste-chip' key={`${url}-${index}`}>
              <button
                type='button'
                className='playground-paste-remove'
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveImage?.(index);
                }}
                aria-label={t('删除图片')}
              >
                ×
              </button>
              <img src={url} alt={t('粘贴图片缩略图')} />
            </div>
          ))}
        </div>
      )}

      <div
        className='playground-composer'
        onClick={onClick}
        title={t('支持 Ctrl+V 粘贴图片')}
      >
        <div className='playground-composer-input'>{inputNode}</div>
        {styledSendNode}
      </div>
    </div>
  );
};

export default CustomInputRender;
