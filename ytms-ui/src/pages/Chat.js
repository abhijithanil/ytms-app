import React, { useState } from 'react';
import { ChatProvider } from 'context/ChatContext';
import ChannelSidebar from '../components/Chat/ChannelSidebar';
import ChatArea from '../components/Chat/ChatArea';
import CreateChannelModal from '../components/Chat/CreateChannelModal';

const ChatInterface = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="flex h-full bg-gray-100">
      <ChannelSidebar onCreateChannel={() => setShowCreateModal(true)} />
      <ChatArea />
      <CreateChannelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

const Chat = () => {
  return (
    <ChatProvider>
      <ChatInterface />
    </ChatProvider>
  );
};

export default Chat;