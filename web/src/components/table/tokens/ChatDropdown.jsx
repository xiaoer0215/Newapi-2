import React, { useState, useRef, useEffect } from 'react';
import { showError } from '../../../helpers';

const ChatDropdown = ({ record, onOpenLink, t }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  let chatsArray = [];
  try {
    const parsed = JSON.parse(localStorage.getItem('chats') || '[]');
    if (Array.isArray(parsed)) {
      parsed.forEach((item, i) => {
        const name = Object.keys(item)[0];
        if (name) {
          chatsArray.push({ name, value: item[name], idx: i });
        }
      });
    }
  } catch (_) {}

  useEffect(() => {
    if (!open) {
      return;
    }

    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleChat = (e) => {
    e.stopPropagation();
    if (chatsArray.length === 0) {
      showError(t('请联系管理员配置聊天链接'));
      return;
    }
    onOpenLink(chatsArray[0].name, chatsArray[0].value, record);
  };

  return (
    <div className='token-glass-chat token-glass-chat--dropdown' ref={ref}>
      <button type='button' className='token-glass-chat__main' onClick={handleChat}>
        <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
        </svg>
        {t('聊天')}
      </button>

      <button
        type='button'
        className='token-glass-chat__arrow'
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={t('展开聊天菜单')}
      >
        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
          <polyline points='6 9 12 15 18 9' />
        </svg>
      </button>

      {open && chatsArray.length > 0 && (
        <div className='token-glass-chat-menu token-glass-chat-menu--floating'>
          {chatsArray.map((chat) => (
            <button
              key={chat.idx}
              type='button'
              className='token-glass-chat-menu__item'
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onOpenLink(chat.name, chat.value, record);
              }}
            >
              {chat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatDropdown;
