import React from 'react';
import { Button, Dropdown, Avatar } from '@douyinfe/semi-ui';
import { IconPlus, IconSetting } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, MoreHorizontal } from 'lucide-react';

const Sidebar = ({
  isMobile,
  userState,
  historyList = [],
  onNewChat,
  onSelectChat,
  onOpenSettings
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <aside className={`flex flex-col h-full bg-[#171717] border-r border-[#333333] transition-all duration-300 z-20 ${isMobile ? 'w-full' : 'w-[260px]'}`}>
      
      {/* Logo 区域 */}
      <div className="h-[60px] flex items-center px-4 shrink-0">
        <div className="flex items-center gap-2 font-bold text-lg cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-[#ff6b00] rounded flex items-center justify-center text-white font-bold text-lg">M</div>
          <span className="text-white">New API</span>
        </div>
      </div>

      {/* 新建对话按钮区 */}
      <div className="px-3 pb-2 pt-1 shrink-0">
        <button 
          className="w-full flex items-center justify-between px-3 py-2.5 bg-[#252525] hover:bg-[#2a2a2a] rounded-xl border border-[#333333] transition-colors shadow-sm group"
          onClick={onNewChat}
        >
          <div className="flex items-center gap-3 text-[#e5e5e5]">
            <IconPlus className="text-sm group-hover:text-white transition-colors" />
            <span className="font-medium text-sm">{t('新建对话')}</span>
          </div>
          <div className="flex gap-1">
            <kbd className="hidden xl:inline-block px-1.5 py-0.5 rounded border border-gray-600 bg-gray-800 text-[10px] text-gray-400 font-sans">⌘</kbd>
            <kbd className="hidden xl:inline-block px-1.5 py-0.5 rounded border border-gray-600 bg-gray-800 text-[10px] text-gray-400 font-sans">K</kbd>
          </div>
        </button>
      </div>

      {/* 历史记录列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        
        <div className="sticky top-0 bg-[#171717]/90 backdrop-blur pb-1 z-10">
          <div className="text-xs font-semibold text-[#9ca3af] px-2 py-1">{t('今天')}</div>
        </div>
        
        {/* 激活状态的会话 */}
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#2a2a2a] text-left group">
          <MessageSquare size={16} className="text-[#9ca3af]" />
          <span className="flex-1 text-sm font-medium text-white truncate">你好</span>
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <div className="p-1 text-[#9ca3af] hover:text-white rounded">
              <MoreHorizontal size={14} />
            </div>
          </div>
        </button>

        {/* 普通会话 */}
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#2a2a2a] text-left group transition-colors">
          <MessageSquare size={16} className="text-[#9ca3af]" />
          <span className="flex-1 text-sm text-[#9ca3af] group-hover:text-[#e5e5e5] truncate">编写一个Python脚本</span>
        </button>

        <div className="sticky top-0 bg-[#171717]/90 backdrop-blur pb-1 pt-4 z-10">
          <div className="text-xs font-semibold text-[#9ca3af] px-2 py-1">{t('昨天')}</div>
        </div>
        
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#2a2a2a] text-left group transition-colors">
          <MessageSquare size={16} className="text-[#9ca3af]" />
          <span className="flex-1 text-sm text-[#9ca3af] group-hover:text-[#e5e5e5] truncate">解释一下React Hooks</span>
        </button>
      </div>

      {/* 底部设置区 */}
      <div className="p-3 border-t border-[#333333] shrink-0 space-y-1">
        <button 
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#2a2a2a] text-left text-[#e5e5e5] transition-colors"
          onClick={onOpenSettings}
        >
          <IconSetting className="w-5 text-center text-[#9ca3af]" />
          <span className="text-sm">{t('设置')}</span>
        </button>
        
        <Dropdown
          position="topRight"
          render={
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => navigate('/panel')}>{t('后台管理')}</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item type="danger">{t('退出登录')}</Dropdown.Item>
            </Dropdown.Menu>
          }
        >
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#2a2a2a] text-left text-[#e5e5e5] transition-colors mt-1">
            <Avatar size="small" color="blue" className="w-6 h-6 text-xs font-bold bg-blue-600">
              {userState?.user?.username?.charAt(0)?.toUpperCase() || 'A'}
            </Avatar>
            <span className="text-sm truncate flex-1">{userState?.user?.username || 'Administrator'}</span>
            <MoreHorizontal size={14} className="text-[#9ca3af]" />
          </button>
        </Dropdown>
      </div>
    </aside>
  );
};

export default Sidebar;
