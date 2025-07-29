import React, { useState } from 'react';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import ChatPanel from './ChatPanel';

const ChatWidget = ({ taskId = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white rounded-lg shadow-2xl border border-gray-200 ${
        isMinimized ? 'w-80 h-12' : 'w-96 h-[500px]'
      } transition-all duration-300`}>
        {/* Widget Header */}
        <div className="p-3 border-b border-gray-200 bg-blue-500 text-white rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-4 w-4" />
            <span className="font-medium text-sm">
              {taskId ? 'Task Chat' : 'Team Chat'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-blue-600 rounded"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-blue-600 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Widget Content */}
        {!isMinimized && (
          <div className="h-[452px]">
            <ChatPanel taskId={taskId} showOnlineUsers={false} className="h-full" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWidget;