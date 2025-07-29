import React from 'react';
import ChatPanel from '../components/chat/ChatPanel';

const Chat = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Team Chat</h1>
        <p className="text-gray-600 mt-1">Connect with your team in real-time</p>
      </div>
      <div className="flex-1">
        <ChatPanel className="h-full" />
      </div>
    </div>
  );
};

export default Chat;