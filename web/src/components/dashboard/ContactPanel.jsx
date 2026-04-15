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
import { Card, Typography } from '@douyinfe/semi-ui';
import { QrCode } from 'lucide-react';

const { Text } = Typography;

const ContactPanel = ({ contactImage, contactTitle, contactCaption, CARD_PROPS, t }) => {
  const captionLines = contactCaption
    ? contactCaption.split('\n').map(l => l.trim()).filter(Boolean)
    : [];

  return (
    <Card
      {...CARD_PROPS}
      className='shadow-sm !rounded-2xl'
      style={{
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }}
      title={
        <div className='flex items-center gap-2'>
          <QrCode size={16} />
          {contactTitle || t('联系我们')}
        </div>
      }
    >
      <div className='flex flex-col items-center justify-center py-2 gap-3'>
        <img
          src={contactImage}
          alt={contactTitle || t('联系二维码')}
          style={{
            maxWidth: '100%',
            maxHeight: 200,
            borderRadius: 8,
            objectFit: 'contain',
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {captionLines.length > 0 && (
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            paddingTop: 8,
            borderTop: '1px solid var(--semi-color-border)',
          }}>
            {captionLines.map((line, idx) => (
              <Text
                key={idx}
                size='small'
                style={{
                  display: 'block',
                  textAlign: 'center',
                  color: 'var(--semi-color-text-1)',
                  userSelect: 'text',
                }}
              >
                {line}
              </Text>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ContactPanel;
