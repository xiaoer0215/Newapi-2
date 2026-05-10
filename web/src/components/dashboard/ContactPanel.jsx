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
    ? contactCaption.split(/\\n|\n/g).map((line) => line.trim()).filter(Boolean)
    : [];

  return (
    <Card
      {...CARD_PROPS}
      className='dashboard-glass-card shadow-sm !rounded-2xl lg:col-span-1'
      title={
        <div className='flex items-center gap-2'>
          <span className='dashboard-title-icon green'>
            <QrCode size={16} />
          </span>
          {contactTitle || t('\u8054\u7cfb\u6211\u4eec')}
        </div>
      }
      bodyStyle={{ padding: 0 }}
    >
      <div className='dashboard-contact-panel'>
        <div className='dashboard-contact-qr'>
          <img
            src={contactImage}
            alt={contactTitle || t('\u8054\u7cfb\u4e8c\u7ef4\u7801')}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        </div>
        {captionLines.length > 0 && (
          <div className='dashboard-contact-caption'>
            {captionLines.map((line, idx) => (
              <Text key={idx}>{line}</Text>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ContactPanel;
