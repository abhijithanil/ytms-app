import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Wifi, WifiOff, Settings } from 'lucide-react';
import { useChat } from '../../hook/useChat';
import { useAuth } from '../../context/AuthContext';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import OnlineUsers from './OnlineUsers';

const ChatPanel = ({ taskId = null, className = '', showOnlineUsers = true }) => {
  const { user } = useAuth();
  const {
    messages,
    onlineUsers,
    typingUsers,
    connected,
    loading,
    error,
    sendMessage,
    startTyping,
    stopTyping,
    updateUserStatus,
    reconnect
  } = useChat(taskId);

  const [newMessage, setNewMessage] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const statusMenuRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close status menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        setShowStatusMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const success = sendMessage(newMessage);
    if (success) {
      setNewMessage('');
      stopTyping();
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    startTyping();
    
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleStatusChange = (status) => {
    updateUserStatus(status);
    setShowStatusMenu(false);
  };

  const getConnectionStatus = () => {
    if (loading) return { color: 'text-yellow-600', text: 'Connecting...', icon: Wifi };
    if (connected) return { color: 'text-green-600', text: 'Connected', icon: Wifi };
    return { color: 'text-red-600', text: 'Disconnected', icon: WifiOff };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-blue-500" />
          <h2 className="font-semibold text-gray-900">
            {taskId ? 'Task Chat' : 'Team Chat'}
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Status Menu */}
          <div className="relative" ref={statusMenuRef}>
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Change status"
            >
              <Settings className="h-4 w-4 text-gray-600" />
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <button
                    onClick={() => handleStatusChange('online')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    Online
                  </button>
                  <button
                    onClick={() => handleStatusChange('away')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                    Away
                  </button>
                  <button
                    onClick={() => handleStatusChange('busy')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    Busy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 ${status.color}`}>
              <StatusIcon className="h-4 w-4" />
              <span className="text-sm">{status.text}</span>
            </div>
            {!connected && !loading && (
              <button
                onClick={reconnect}
                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading chat...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isOwn={message.senderId === user?.id}
                  />
                ))}
                <TypingIndicator users={typingUsers} />
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  onBlur={stopTyping}
                  placeholder={connected ? "Type a message..." : "Connecting..."}
                  disabled={!connected}
                  rows={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                  style={{ maxHeight: '120px' }}
                />
              </div>
              <button
                type="submit"
                disabled={!connected || !newMessage.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Online Users Sidebar */}
        {showOnlineUsers && (
          <div className="w-80 border-l border-gray-200 flex-shrink-0">
            <OnlineUsers users={onlineUsers} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;