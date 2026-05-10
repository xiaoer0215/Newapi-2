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
import { Card, Skeleton, Tag } from '@douyinfe/semi-ui';
import { VChart } from '@visactor/react-vchart';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const StatsCards = ({
  groupedStatsData,
  loading,
  getTrendSpec,
  CARD_PROPS,
  CHART_CONFIG,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className='mb-4'>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {groupedStatsData.map((group, idx) => (
          <Card
            key={idx}
            {...CARD_PROPS}
            className='dashboard-glass-card dashboard-stats-card hover:-translate-y-1 !rounded-2xl w-full'
            title={group.title}
          >
            <div className='space-y-4'>
              {group.items.map((item, itemIdx) => {
                const isBalance = item.title === t('\u5f53\u524d\u4f59\u989d');
                const iconTone = item.avatarColor || ['blue', 'green', 'purple', 'orange'][itemIdx % 4];
                return (
                  <div
                    key={itemIdx}
                    className='dashboard-stat-row cursor-pointer'
                    onClick={item.onClick}
                  >
                    <div className='dashboard-stat-left'>
                      <div className={`dashboard-glass-icon ${iconTone}`}>
                        {item.icon}
                      </div>
                      <div className='dashboard-stat-text'>
                        <div className='dashboard-stat-label'>{item.title}</div>
                        <div className='dashboard-stat-value'>
                          <Skeleton
                            loading={loading}
                            active
                            placeholder={
                              <Skeleton.Paragraph
                                active
                                rows={1}
                                style={{
                                  width: '65px',
                                  height: '24px',
                                  marginTop: '4px',
                                }}
                              />
                            }
                          >
                            {item.value}
                          </Skeleton>
                        </div>
                      </div>
                    </div>
                    {isBalance ? (
                      <Tag
                        color='white'
                        shape='circle'
                        size='large'
                        className='dashboard-glass-pill'
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/console/topup');
                        }}
                      >
                        {t('\u5145\u503c')}
                      </Tag>
                    ) : (
                      (loading || (item.trendData && item.trendData.length > 0)) && (
                        <div className='dashboard-stat-trend'>
                          <VChart
                            spec={getTrendSpec(item.trendData, item.trendColor)}
                            option={CHART_CONFIG}
                          />
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StatsCards;
