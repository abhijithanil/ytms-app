import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Reply, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import MessageReactions from './MessageReactions';
import UserPresenceIndicator from './UserPresenceIndicator';

const ChatMessage = ({ 
  message, 
  isOwn = false, 
  currentUserId, 
  onlineUsers = [],
  onReply,
  onEdit,
  onDelete,
  onAddReaction,
  onRemoveReaction,
  showAvatar = true
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

  const getDetailedTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
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

  // Get user status
  const getUserStatus = () => {
    if (!Array.isArray(onlineUsers)) return 'offline';
    const user = onlineUsers.find(u => u && u.userId === message.senderId);
    return user?.status || 'offline';
  };

  // System/join/leave messages
  if (message.type === 'JOIN' || message.type === 'LEAVE' || message.type === 'SYSTEM') {
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
      className={`group relative hover:bg-gray-50 px-4 py-2 ${userMentioned ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      id={`message-${message.id}`}
    >
      <div className="flex space-x-3">
        {/* Avatar */}
        {showAvatar && (
          <div className="flex-shrink-0 relative">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-medium">
              {getInitials(message.senderName, message.senderUsername)}
            </div>
            {/* Status indicator */}
            <div className="absolute -bottom-1 -right-1">
              <UserPresenceIndicator status={getUserStatus()} size="xs" />
            </div>
          </div>
        )}

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline space-x-2 mb-1">
            <span className="font-medium text-gray-900 text-sm">
              {message.senderName || message.senderUsername}
            </span>
            <span 
              className="text-xs text-gray-500 hover:underline cursor-pointer"
              title={getDetailedTime(message.createdAt)}
            >
              {formatTime(message.createdAt)}
            </span>
            {message.isEdited && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>

          {/* Message Body */}
          <div className="text-sm text-gray-900 leading-relaxed">
            {/* Thread parent indicator */}
            {message.parentMessageId && (
              <div className="flex items-center text-xs text-gray-500 mb-2 p-2 bg-gray-100 rounded border-l-4 border-gray-300">
                <Reply className="w-3 h-3 mr-1" />
                Replying to a message
              </div>
            )}

            {/* Message content */}
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>

            {/* Attachment */}
            {message.attachmentUrl && (
              <div className="mt-2 p-3 bg-gray-100 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {message.attachmentType?.charAt(0)?.toUpperCase() || 'F'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {message.attachmentName || 'File'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {message.attachmentType || 'Unknown type'}
                      </p>
                    </div>
                  </div>
                  <a 
                    href={message.attachmentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Download
                  </a>
                </div>
              </div>
            )}

            {/* Reactions */}
            <MessageReactions
              message={message}
              currentUserId={currentUserId}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
            />

            {/* Thread replies count */}
            {message.threadReplyCount > 0 && (
              <div className="mt-2">
                <button 
                  onClick={() => onReply?.(message)}
                  className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Reply className="w-3 h-3" />
                  <span>{message.threadReplyCount} repl{message.threadReplyCount === 1 ? 'y' : 'ies'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="flex items-start space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onReply?.(message)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded border border-transparent hover:border-gray-200"
              title="Reply in thread"
            >
              <Reply className="w-4 h-4" />
            </button>
            
            {isOwn && (
              <>
                <button
                  onClick={() => onEdit?.(message)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded border border-transparent hover:border-gray-200"
                  title="Edit message"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete?.(message)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-white rounded border border-transparent hover:border-gray-200"
                  title="Delete message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded border border-transparent hover:border-gray-200"
                title="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      // Copy message link functionality
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Copy link
                  </button>
                  <button
                    onClick={() => {
                      // Copy message text functionality
                      navigator.clipboard.writeText(message.content);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Copy text
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;