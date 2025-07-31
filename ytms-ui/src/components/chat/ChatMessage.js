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
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 ${
      userMentioned ? 'bg-blue-50 -mx-2 px-2 py-1 rounded-lg border-l-2 border-blue-500' : ''
    }`}>
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} space-x-2 max-w-[70%]`}>
        {!isOwn && (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {getInitials(message.senderName, message.senderUsername)}
          </div>
        )}
        
        <div className={`${isOwn ? 'mr-2' : 'ml-2'}`}>
          {!isOwn && (
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                {message.senderName || message.senderUsername}
              </span>
              <span className="text-xs text-gray-500">
                {formatTime(message.createdAt)}
              </span>
              {userMentioned && (
                <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                  mentioned you
                </span>
              )}
            </div>
          )}
          
          <div
            className={`px-4 py-2 rounded-2xl ${
              isOwn
                ? 'bg-blue-500 text-white rounded-br-md'
                : userMentioned
                ? 'bg-white text-gray-900 rounded-bl-md border border-blue-200'
                : 'bg-gray-100 text-gray-900 rounded-bl-md'
            }`}
          >
            <div className="text-sm">
              <MessageWithMentions 
                content={message.content}
                currentUserId={currentUserId}
                onlineUsers={onlineUsers}
              />
            </div>
          </div>
          
          {isOwn && (
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-500">
                {formatTime(message.createdAt)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;