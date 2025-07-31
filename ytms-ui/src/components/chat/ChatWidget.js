import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Minimize2, Maximize2, ExternalLink } from 'lucide-react';
import ChatPanel from './ChatPanel';

const ChatWidget = ({ 
  taskId = null, 
  isEmbedded = false, 
  onOpenFullChat,
  onNotificationCountChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Track if the chat has ever been opened to maintain connection
  useEffect(() => {
    if (isOpen && !hasBeenOpened) {
      setHasBeenOpened(true);
    }
  }, [isOpen, hasBeenOpened]);

  // Update parent component with notification count
  useEffect(() => {
    if (onNotificationCountChange) {
      onNotificationCountChange(unreadCount);
    }
  }, [unreadCount, onNotificationCountChange]);

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false); // Reset minimized state when opening
      setUnreadCount(0); // Clear unread count when opening
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleOpenFullChat = () => {
    if (onOpenFullChat) {
      onOpenFullChat();
    }
  };

  // If embedded mode, render directly without floating container
  if (isEmbedded) {
    return (
      <div className="h-full flex flex-col bg-white">
        <ChatPanel 
          taskId={taskId} 
          showOnlineUsers={false} 
          className="h-full"
          onUnreadCountChange={setUnreadCount}
          isEmbedded={true}
        />
      </div>
    );
  }

  // Floating widget mode
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleToggleOpen}
          className="relative bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
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
            {onOpenFullChat && (
              <button
                onClick={handleOpenFullChat}
                className="p-1 hover:bg-blue-600 rounded"
                title="Open in full view"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
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
            <ChatPanel 
              taskId={taskId} 
              showOnlineUsers={false} 
              className="h-full" 
              onUnreadCountChange={setUnreadCount}
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
              onUnreadCountChange={setUnreadCount}
              key={`chat-${taskId || 'global'}`} // Same key as above
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWidget;