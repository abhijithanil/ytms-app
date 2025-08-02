import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const ChatMessage = ({ message, isOwn = false, currentUserId, onlineUsers = [] }) => {
  const getInitials = (name, username) => {
    if (name && name.includes(' ')) {
      const parts = name.split(' ');
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return username ? username[0].toUpperCase() : '?';
  };

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Check if current user is mentioned in this message
  const isUserMentioned = () => {
    if (!currentUserId || !message.content || !Array.isArray(onlineUsers)) return false;
    const currentUser = onlineUsers.find(user => user && user.userId === currentUserId);
    if (!currentUser) return false;
    
    const mentionRegex = new RegExp(`@${currentUser.username}\\b`, 'i');
    return mentionRegex.test(message.content);
  };

  const userMentioned = isUserMentioned();

  if (message.type === 'JOIN' || message.type === 'LEAVE') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`} id={`message-${message.id}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isOwn 
          ? 'bg-blue-500 text-white' 
          : userMentioned 
            ? 'bg-yellow-100 border border-yellow-300' 
            : 'bg-gray-200 text-gray-900'
      }`}>
        {!isOwn && (
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs text-white mr-2">
              {getInitials(message.senderName, message.senderUsername)}
            </div>
            <span className="text-sm font-medium">{message.senderName || message.senderUsername}</span>
          </div>
        )}
        
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {message.attachmentUrl && (
          <div className="mt-2">
            <a 
              href={message.attachmentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 underline text-sm"
            >
              {message.attachmentName || 'Download'}
            </a>
          </div>
        )}
        
        <div className="text-xs opacity-75 mt-1">
          {formatTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;