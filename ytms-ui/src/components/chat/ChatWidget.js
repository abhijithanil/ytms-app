import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import ChatPanel from './ChatPanel';

const ChatWidget = ({ taskId = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  // Track if the chat has ever been opened to maintain connection
  useEffect(() => {
    if (isOpen && !hasBeenOpened) {
      setHasBeenOpened(true);
    }
  }, [isOpen, hasBeenOpened]);

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false); // Reset minimized state when opening
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleToggleOpen}
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
              onClick={handleMinimize}
              className="p-1 hover:bg-blue-600 rounded"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-blue-600 rounded"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Widget Content */}
        {!isMinimized && (
          <div className="h-[452px]">
            {/* Keep ChatPanel mounted even when minimized to maintain connection */}
            <ChatPanel 
              taskId={taskId} 
              showOnlineUsers={false} 
              className="h-full" 
              key={`chat-${taskId || 'global'}`} // Stable key to prevent remounting
            />
          </div>
        )}
        
        {/* Hidden ChatPanel when minimized to maintain connection */}
        {isMinimized && hasBeenOpened && (
          <div className="hidden">
            <ChatPanel 
              taskId={taskId} 
              showOnlineUsers={false} 
              className="h-full" 
              key={`chat-${taskId || 'global'}`} // Same key as above
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWidget;