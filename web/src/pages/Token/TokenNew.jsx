import React, { useState, useEffect } from 'react';
import { API } from '../../helpers';

const TokenNew = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/token/');
      const { success, data } = res.data;
      if (success) {
        setTokens(data || []);
      }
    } catch (error) {
      console.error('加载令牌失败:', error);
    }
    setLoading(false);
  };

  return (
    <div className='min-h-screen pt-20 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-7xl mx-auto'>
        {/* 头部操作栏 */}
        <div className='mb-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/20'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div className='flex gap-3'>
              <button className='px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200'>
                添加令牌
              </button>
              <button className='px-6 py-2.5 bg-white text-gray-700 rounded-xl font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 border border-gray-200'>
                复制所选
              </button>
              <button className='px-6 py-2.5 bg-red-500 text-white rounded-xl font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200'>
                删除所选
              </button>
            </div>

            <div className='flex gap-3'>
              <input
                type='text'
                placeholder='搜索关键字...'
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className='px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all w-64'
              />
              <button className='px-6 py-2.5 bg-blue-500 text-white rounded-xl font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200'>
                查询
              </button>
            </div>
          </div>
        </div>

        {/* 表格 */}
        <div className='bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20'>
          {loading ? (
            <div className='flex items-center justify-center h-64'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gradient-to-r from-blue-50 to-indigo-50'>
                  <tr>
                    <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                      <input type='checkbox' className='rounded' />
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                      名称
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                      状态
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                      已用额度
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                      剩余额度
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                      过期时间
                    </th>
                    <th className='px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white/50 divide-y divide-gray-100'>
                  {tokens.length === 0 ? (
                    <tr>
                      <td
                        colSpan='7'
                        className='px-6 py-12 text-center text-gray-500'
                      >
                        暂无令牌数据
                      </td>
                    </tr>
                  ) : (
                    tokens.map((token) => (
                      <tr
                        key={token.id}
                        className='hover:bg-blue-50/50 transition-colors duration-150'
                      >
                        <td className='px-6 py-4'>
                          <input type='checkbox' className='rounded' />
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                          {token.name}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              token.status === 1
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {token.status === 1 ? '已启用' : '已禁用'}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                          {token.used_quota || 0}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                          {token.remain_quota === -1
                            ? '无限'
                            : token.remain_quota}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                          {token.expired_time === -1
                            ? '永不过期'
                            : new Date(
                                token.expired_time * 1000,
                              ).toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                          <button className='text-blue-600 hover:text-blue-900 mr-4 transition-colors'>
                            编辑
                          </button>
                          <button className='text-green-600 hover:text-green-900 mr-4 transition-colors'>
                            复制
                          </button>
                          <button className='text-red-600 hover:text-red-900 transition-colors'>
                            删除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenNew;
