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
import { Chat } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import CustomInputRender from './CustomInputRender';

const ChatArea = ({
  chatRef,
  message,
  roleInfo,
  onMessageSend,
  onMessageCopy,
  onMessageReset,
  onMessageDelete,
  onStopGenerator,
  onClearMessages,
  renderCustomChatContent,
  renderChatBoxAction,
}) => {
  const { t } = useTranslation();

  const renderInputArea = React.useCallback((props) => {
    return <CustomInputRender {...props} />;
  }, []);

  return (
    <div className='playground-chat-card'>
      <Chat
        ref={chatRef}
        chatBoxRenderConfig={{
          renderChatBoxContent: renderCustomChatContent,
          renderChatBoxAction: renderChatBoxAction,
          renderChatBoxTitle: () => null,
        }}
        renderInputArea={renderInputArea}
        roleConfig={roleInfo}
        style={{
          height: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
        }}
        chats={message}
        onMessageSend={onMessageSend}
        onMessageCopy={onMessageCopy}
        onMessageReset={onMessageReset}
        onMessageDelete={onMessageDelete}
        showClearContext
        showStopGenerate
        onStopGenerator={onStopGenerator}
        onClear={onClearMessages}
        className='playground-chat-instance'
        placeholder={t('输入消息，或直接粘贴图片到这里...')}
      />
    </div>
  );
};

export default ChatArea;
