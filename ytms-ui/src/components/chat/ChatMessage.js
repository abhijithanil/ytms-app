import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Smile, Edit, Trash2, Reply } from 'lucide-react';
import MessageWithMentions from './MessageWithMentions';

const ChatMessage = ({ message, isOwn = false, currentUserId, onlineUsers = [], onReaction, onEdit, onDelete, onReply }) => {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

  // Common emoji reactions
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  const handleEmojiReaction = (emoji) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {message.reactions.map((reaction, index) => (
          <button
            key={index}
            onClick={() => handleEmojiReaction(reaction.emoji)}
            className={`inline-flex items-center px-2 py-1 rounded-full text-sm border transition-colors ${
              reaction.userIds?.includes(currentUserId)
                ? 'bg-blue-100 border-blue-300 text-blue-800'
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-1">{reaction.emoji}</span>
            <span className="text-xs">{reaction.count}</span>
          </button>
        ))}
      </div>
    );
  };

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
    <div 
      className={`group flex space-x-3 p-4 hover:bg-gray-50 transition-colors ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      {!isOwn && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {getInitials(message.senderName, message.senderUsername)}
          </div>
        </div>
      )}
      
      <div className={`max-w-xs lg:max-w-md relative ${isOwn ? 'order-1' : 'order-2'}`}>
        <div className={`rounded-lg px-4 py-2 relative ${
          isOwn 
            ? 'bg-blue-500 text-white' 
            : userMentioned 
              ? 'bg-yellow-50 text-gray-900 border border-yellow-200' 
              : 'bg-gray-100 text-gray-900'
        }`}>
          {!isOwn && (
            <p className="text-xs font-medium text-gray-600 mb-1">
              {message.senderName || message.senderUsername}
            </p>
          )}
          
          <MessageWithMentions 
            content={message.content}
            currentUserId={currentUserId}
            onlineUsers={onlineUsers}
          />
          
          <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
            {formatTime(message.createdAt)}
            {message.edited && (
              <span className="ml-1 italic">(edited)</span>
            )}
          </p>

          {/* Message Actions */}
          {showActions && (
            <div className={`absolute top-0 ${isOwn ? 'left-0 -ml-16' : 'right-0 -mr-16'} flex items-center space-x-1 bg-white rounded-lg shadow-lg border p-1`}>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Add reaction"
              >
                <Smile className="h-4 w-4 text-gray-600" />
              </button>
              
              {onReply && (
                <button
                  onClick={() => onReply(message)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Reply"
                >
                  <Reply className="h-4 w-4 text-gray-600" />
                </button>
              )}
              
              {isOwn && onEdit && (
                <button
                  onClick={() => onEdit(message)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Edit message"
                >
                  <Edit className="h-4 w-4 text-gray-600" />
                </button>
              )}
              
              {isOwn && onDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              )}
              
              <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className={`absolute top-full mt-2 ${isOwn ? 'right-0' : 'left-0'} bg-white rounded-lg shadow-lg border p-2 z-10`}>
              <div className="grid grid-cols-6 gap-1">
                {commonEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleEmojiReaction(emoji)}
                    className="p-2 hover:bg-gray-100 rounded transition-colors text-lg"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reactions */}
        {renderReactions()}
      </div>
      
      {isOwn && (
        <div className="flex-shrink-0 order-2">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {getInitials(message.senderName, message.senderUsername)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;