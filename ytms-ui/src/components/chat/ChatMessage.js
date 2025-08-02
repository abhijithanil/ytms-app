import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import MessageWithMentions from './MessageWithMentions';

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
    <div className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'} ${userMentioned ? 'bg-yellow-50 -mx-2 px-2 py-1 rounded' : ''}`}>
      {!isOwn && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {getInitials(message.senderName, message.senderUsername)}
          </div>
        </div>
      )}
      
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
        <div className={`px-4 py-2 rounded-lg ${
          isOwn 
            ? 'bg-blue-500 text-white' 
            : userMentioned 
              ? 'bg-yellow-100 border border-yellow-300' 
              : 'bg-gray-100'
        }`}>
          {!isOwn && (
            <div className="text-xs font-semibold mb-1 text-gray-600">
              {message.senderName || message.senderUsername}
            </div>
          )}
          
          {/* Message content with mention highlighting */}
          <MessageWithMentions 
            content={message.content} 
            onlineUsers={onlineUsers}
            className={isOwn ? 'text-white' : ''}
          />
          
          {/* File attachment display */}
          {message.attachmentUrl && (
            <div className="mt-2 p-2 bg-white bg-opacity-20 rounded">
              <a 
                href={message.attachmentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm underline"
              >
                📎 {message.attachmentName || 'Attachment'}
              </a>
            </div>
          )}
          
          {/* Reactions display */}
          {message.reactions && message.reactions !== '{}' && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(JSON.parse(message.reactions)).map(([emoji, count]) => (
                <span 
                  key={emoji}
                  className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full"
                >
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {formatTime(message.createdAt)}
          {message.isEdited && <span className="ml-1">(edited)</span>}
        </div>
      </div>
      
      {isOwn && (
        <div className="flex-shrink-0 ml-3 order-2">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {getInitials(message.senderName, message.senderUsername)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;