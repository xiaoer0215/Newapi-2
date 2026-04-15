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

import React, { useContext } from 'react';
import { Button, Card, Typography } from '@douyinfe/semi-ui';
import { StatusContext } from '../../context/Status';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Zap, Key, BarChart3, Settings } from 'lucide-react';

const { Title, Text } = Typography;

const HomeNew = () => {
  const { t } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const serverAddress =
    statusState?.status?.server_address || window.location.origin;

  const features = [
    {
      icon: <Zap size={32} className='text-blue-500' />,
      title: t('快速接入'),
      description: t('支持 40+ AI 提供商，统一 API 接口'),
    },
    {
      icon: <Key size={32} className='text-green-500' />,
      title: t('令牌管理'),
      description: t('灵活的令牌分组和额度控制'),
    },
    {
      icon: <BarChart3 size={32} className='text-purple-500' />,
      title: t('数据统计'),
      description: t('实时监控使用情况和费用'),
    },
    {
      icon: <Settings size={32} className='text-orange-500' />,
      title: t('灵活配置'),
      description: t('支持多种计费和限流策略'),
    },
  ];

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50'>
      {/* Hero Section */}
      <div className='container mx-auto px-4 py-20'>
        <div className='text-center mb-16'>
          <Title
            heading={1}
            className='!text-5xl !font-bold !mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'
          >
            {t('AI API 统一网关')}
          </Title>
          <Text className='text-xl text-gray-600 mb-8'>
            {t('聚合 40+ AI 提供商，一个接口访问所有模型')}
          </Text>
          <div className='flex gap-4 justify-center'>
            <Link to='/token'>
              <Button size='large' theme='solid' type='primary'>
                {t('开始使用')}
              </Button>
            </Link>
            <Link to='/about'>
              <Button size='large' theme='borderless'>
                {t('了解更多')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16'>
          {features.map((feature, index) => (
            <Card
              key={index}
              className='text-center hover:shadow-xl transition-shadow duration-300'
              bodyStyle={{ padding: '32px' }}
            >
              <div className='flex justify-center mb-4'>{feature.icon}</div>
              <Title heading={4} className='!mb-2'>
                {feature.title}
              </Title>
              <Text type='tertiary'>{feature.description}</Text>
            </Card>
          ))}
        </div>

        {/* API Info */}
        <Card className='bg-white/80 backdrop-blur-sm'>
          <div className='p-6'>
            <Title heading={3} className='!mb-4'>
              {t('API 地址')}
            </Title>
            <div className='flex items-center gap-4'>
              <code className='flex-1 bg-gray-100 px-4 py-3 rounded-lg'>
                {serverAddress}
              </code>
              <Button
                onClick={() => navigator.clipboard.writeText(serverAddress)}
              >
                {t('复制')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HomeNew;
