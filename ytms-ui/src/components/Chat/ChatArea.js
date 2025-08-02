import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'context/ChatContext';
import { useAuth } from 'context/AuthContext';
import { 
  Send, 
  Hash, 
  Users, 
  MoreVertical,
  Reply,
  Edit3,
  Trash2,
  Smile,
  MessageCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const MessageInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      setIsTyping(false);
      onTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>
        <button
          type="submit"
          disabled={!message.trim()}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};

const MessageItem = ({ message, currentUser }) => {
  const [showActions, setShowActions] = useState(false);
  const isOwnMessage = message.sender?.id === currentUser?.id;

  const formatTime = (timestamp) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  return (
    <div
      className={`group flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        {!isOwnMessage && (
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
              {message.sender?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {message.sender?.username || 'Unknown User'}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}
        
        <div
          className={`p-3 rounded-lg ${
            isOwnMessage
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
          {message.isEdited && (
            <span className="text-xs opacity-70 mt-1 block">
              (edited)
            </span>
          )}
        </div>

        {isOwnMessage && (
          <div className="text-right mt-1">
            <span className="text-xs text-gray-500">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}
      </div>

      {/* Message Actions */}
      {showActions && (
        <div className={`flex items-center space-x-1 ${isOwnMessage ? 'order-1 mr-2' : 'order-2 ml-2'}`}>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700">
            <Reply className="w-4 h-4" />
          </button>
          {isOwnMessage && (
            <>
              <button className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700">
                <Edit3 className="w-4 h-4" />
              </button>
              <button className="p-1 rounded hover:bg-gray-200 text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const TypingIndicator = ({ typingUsers }) => {
  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  const typingText = typingUsers.length === 1
    ? `${typingUsers[0].userName} is typing...`
    : `${typingUsers.slice(0, 2).map(u => u.userName).join(', ')} ${
        typingUsers.length > 2 ? `and ${typingUsers.length - 2} others ` : ''
      }are typing...`;

  return (
    <div className="px-4 py-2 text-sm text-gray-500 italic">
      <div className="flex items-center">
        <div className="flex space-x-1 mr-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        {typingText}
      </div>
    </div>
  );
};

const ChatArea = () => {
  const { 
    activeChannel, 
    messages, 
    typingUsers, 
    sendMessage, 
    sendTypingIndicator 
  } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  const channelMessages = activeChannel ? messages[activeChannel.id] || [] : [];
  const channelTypingUsers = activeChannel ? typingUsers[activeChannel.id] || [] : [];

  // Filter out current user from typing users
  const filteredTypingUsers = channelTypingUsers.filter(u => u.userId !== user?.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [channelMessages, filteredTypingUsers]);

  const handleSendMessage = (content) => {
    sendMessage(content);
  };

  const handleTyping = (isTyping) => {
    sendTypingIndicator(isTyping);
  };

  if (!activeChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Welcome to Chat</h3>
          <p>Select a channel to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Channel Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Hash className="w-5 h-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              {activeChannel.name}
            </h2>
            {activeChannel.description && (
              <span className="ml-3 text-sm text-gray-500">
                {activeChannel.description}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <Users className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {channelMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div>
            {channelMessages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUser={user}
              />
            ))}
          </div>
        )}
        
        <TypingIndicator typingUsers={filteredTypingUsers} />
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput 
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
      />
    </div>
  );
};

export default ChatArea;