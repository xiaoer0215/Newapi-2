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
import { Card, Tag, Timeline, Empty } from '@douyinfe/semi-ui';
import { Bell } from 'lucide-react';
import { marked } from 'marked';
import {
  IllustrationConstruction,
  IllustrationConstructionDark,
} from '@douyinfe/semi-illustrations';
import ScrollableContainer from '../common/ui/ScrollableContainer';

const AnnouncementsPanel = ({
  announcementData,
  announcementLegendData,
  CARD_PROPS,
  ILLUSTRATION_SIZE,
  t,
}) => {
  return (
    <Card
      {...CARD_PROPS}
      className='dashboard-glass-card shadow-sm !rounded-2xl lg:col-span-2'
      title={
        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 w-full'>
          <div className='flex items-center gap-2'>
            <span className='dashboard-title-icon blue'>
              <Bell size={16} />
            </span>
            {t('\u7cfb\u7edf\u516c\u544a')}
            <Tag color='white' shape='circle' className='dashboard-glass-pill'>
              {t('\u663e\u793a\u6700\u65b020\u6761')}
            </Tag>
          </div>
          <div className='flex flex-wrap gap-3 text-xs'>
            {announcementLegendData.map((legend, index) => (
              <div key={index} className='flex items-center gap-1'>
                <div
                  className='w-2 h-2 rounded-full'
                  style={{
                    backgroundColor:
                      legend.color === 'grey'
                        ? '#8b9aa7'
                        : legend.color === 'blue'
                          ? '#3b82f6'
                          : legend.color === 'green'
                            ? '#10b981'
                            : legend.color === 'orange'
                              ? '#f59e0b'
                              : legend.color === 'red'
                                ? '#ef4444'
                                : '#8b9aa7',
                  }}
                />
                <span className='text-gray-600'>{legend.label}</span>
              </div>
            ))}
          </div>
        </div>
      }
      bodyStyle={{ padding: 0 }}
    >
      <ScrollableContainer maxHeight='18.5rem'>
        {announcementData.length > 0 ? (
          <Timeline mode='left'>
            {announcementData.map((item, idx) => {
              const htmlExtra = item.extra ? marked.parse(item.extra) : '';
              return (
                <Timeline.Item
                  key={idx}
                  type={item.type || 'default'}
                  time={`${item.relative ? item.relative + ' ' : ''}${item.time}`}
                  extra={
                    item.extra ? (
                      <div
                        className='text-xs text-gray-500'
                        dangerouslySetInnerHTML={{ __html: htmlExtra }}
                      />
                    ) : null
                  }
                >
                  <div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(item.content || ''),
                      }}
                    />
                  </div>
                </Timeline.Item>
              );
            })}
          </Timeline>
        ) : (
          <div className='flex justify-center items-center py-8'>
            <Empty
              image={<IllustrationConstruction style={ILLUSTRATION_SIZE} />}
              darkModeImage={
                <IllustrationConstructionDark style={ILLUSTRATION_SIZE} />
              }
              title={t('\u6682\u65e0\u7cfb\u7edf\u516c\u544a')}
              description={t('\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u5728\u7cfb\u7edf\u8bbe\u7f6e\u4e2d\u914d\u7f6e\u516c\u544a\u4fe1\u606f')}
            />
          </div>
        )}
      </ScrollableContainer>
    </Card>
  );
};

export default AnnouncementsPanel;
