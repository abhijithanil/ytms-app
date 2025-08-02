import React, { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Check, 
  X, 
  Star, 
  Frown,
  Reply, 
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Pin
} from 'lucide-react';
import MessageWithMentions from './MessageWithMentions';

const ChatMessage = ({ 
  message, 
  isOwn = false, 
  currentUserId, 
  onlineUsers = [],
  onReactToMessage,
  onReplyToMessage,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  showReplyButton = true,
  showActionsMenu = true,
  isSearchResult = false,
  parentMessage = null
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [reactions, setReactions] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  
  const messageRef = useRef(null);
  const actionsRef = useRef(null);
  const reactionsRef = useRef(null);

  // Available reactions
  const availableReactions = [
    { emoji: '👍', type: 'thumbs_up', label: 'Thumbs Up' },
    { emoji: '👎', type: 'thumbs_down', label: 'Thumbs Down' },
    { emoji: '✅', type: 'ack', label: 'Acknowledge' },
    { emoji: '❌', type: 'reject', label: 'Reject' },
    { emoji: '⭐', type: 'appraise', label: 'Appraise' },
    { emoji: '😞', type: 'disappointed', label: 'Disappointed' }
  ];

  // Parse existing reactions
  useEffect(() => {
    try {
      const messageReactions = message.reactions ? JSON.parse(message.reactions) : {};
      setReactions(messageReactions);
    } catch (error) {
      console.error('Error parsing reactions:', error);
      setReactions({});
    }
  }, [message.reactions]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reactionsRef.current && !reactionsRef.current.contains(event.target)) {
        setShowReactions(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleReaction = async (reactionType) => {
    if (!onReactToMessage) return;
    
    try {
      await onReactToMessage(message.id, reactionType);
      setShowReactions(false);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleReply = () => {
    if (onReplyToMessage) {
      onReplyToMessage(message);
    }
    setShowActionsDropdown(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowActionsDropdown(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !onEditMessage) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }

    try {
      await onEditMessage(message.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error editing message:', error);
      setEditContent(message.content);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleDelete = async () => {
    if (!onDeleteMessage) return;
    
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await onDeleteMessage(message.id);
        setShowActionsDropdown(false);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setShowActionsDropdown(false);
  };

  const handlePin = async () => {
    if (onPinMessage) {
      try {
        await onPinMessage(message.id);
        setShowActionsDropdown(false);
      } catch (error) {
        console.error('Error pinning message:', error);
      }
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

  // Render system messages differently
  if (message.type === 'JOIN' || message.type === 'LEAVE' || message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  // Render thread reply indicator if this is a reply
  const isReply = message.parentMessageId && parentMessage;

  return (
    <div 
      ref={messageRef}
      className={`group relative px-4 py-2 hover:bg-gray-50 transition-colors ${
        userMentioned ? 'bg-blue-50 border-l-2 border-blue-500' : ''
      } ${isSearchResult ? 'border border-yellow-300 bg-yellow-50' : ''}`}
    >
      {/* Reply indicator */}
      {isReply && (
        <div className="flex items-center mb-1 text-xs text-gray-500">
          <Reply className="h-3 w-3 mr-1 transform scale-x-[-1]" />
          <span>Replying to {parentMessage?.senderName || 'message'}</span>
        </div>
      )}

      <div className={`flex space-x-3 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
            isOwn ? 'bg-blue-500' : 'bg-green-500'
          }`}>
            {getInitials(message.senderName, message.senderUsername)}
          </div>
        </div>

        {/* Message content */}
        <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
          {/* Header */}
          <div className={`flex items-baseline space-x-2 mb-1 ${isOwn ? 'justify-end' : ''}`}>
            <span className="text-sm font-medium text-gray-900">
              {isOwn ? 'You' : (message.senderName || message.senderUsername)}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(message.createdAt)}
            </span>
            {message.isEdited && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>

          {/* Referenced message for replies */}
          {isReply && parentMessage && (
            <div className="mb-2 p-2 bg-gray-100 border-l-2 border-gray-300 rounded text-sm">
              <div className="text-xs text-gray-600 mb-1">
                {parentMessage.senderName}
              </div>
              <div className="text-gray-800 truncate">
                {parentMessage.content}
              </div>
            </div>
          )}

          {/* Message content */}
          <div className={`${isOwn ? 'text-right' : ''}`}>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  autoFocus
                />
                <div className="flex space-x-2 text-xs">
                  <button
                    onClick={handleSaveEdit}
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-800 whitespace-pre-wrap break-words">
                <MessageWithMentions
                  content={message.content}
                  currentUserId={currentUserId}
                  onlineUsers={onlineUsers}
                />
              </div>
            )}
          </div>

          {/* Attachments */}
          {message.attachmentUrl && (
            <div className="mt-2">
              {message.attachmentType?.startsWith('image/') ? (
                <img
                  src={message.attachmentUrl}
                  alt={message.attachmentName || 'Attachment'}
                  className="max-w-xs rounded border"
                />
              ) : (
                <a
                  href={message.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  📎 {message.attachmentName || 'Download attachment'}
                </a>
              )}
            </div>
          )}

          {/* Reactions */}
          {Object.keys(reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(reactions).map(([reactionType, reactionData]) => {
                if (!reactionData || !reactionData.count || reactionData.count === 0) return null;
                
                const reactionConfig = availableReactions.find(r => r.type === reactionType);
                const hasUserReacted = reactionData.userIds?.includes(currentUserId);
                
                return (
                  <button
                    key={reactionType}
                    onClick={() => handleReaction(reactionType)}
                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      hasUserReacted 
                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={`${reactionData.count} ${reactionConfig?.label || reactionType} reaction${reactionData.count !== 1 ? 's' : ''}`}
                  >
                    <span>{reactionConfig?.emoji || '👍'}</span>
                    <span>{reactionData.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Thread reply count */}
          {message.threadReplyCount > 0 && (
            <button className="text-xs text-blue-600 hover:text-blue-800 mt-1">
              {message.threadReplyCount} repl{message.threadReplyCount === 1 ? 'y' : 'ies'}
            </button>
          )}
        </div>

        {/* Actions menu (appears on hover) */}
        {showActionsMenu && !isEditing && (
          <div className={`absolute top-0 ${isOwn ? 'left-0' : 'right-0'} opacity-0 group-hover:opacity-100 transition-opacity`}>
            <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-lg shadow-sm p-1">
              {/* Reaction button */}
              <div className="relative" ref={reactionsRef}>
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="Add reaction"
                >
                  😊
                </button>
                
                {/* Reactions picker */}
                {showReactions && (
                  <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50">
                    <div className="grid grid-cols-3 gap-1">
                      {availableReactions.map((reaction) => (
                        <button
                          key={reaction.type}
                          onClick={() => handleReaction(reaction.type)}
                          className="p-2 hover:bg-gray-100 rounded text-lg transition-colors"
                          title={reaction.label}
                        >
                          {reaction.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reply button */}
              {showReplyButton && (
                <button
                  onClick={handleReply}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="Reply"
                >
                  <Reply className="h-4 w-4" />
                </button>
              )}

              {/* More actions */}
              <div className="relative" ref={actionsRef}>
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {/* Actions menu */}
                {showActionsDropdown && (
                  <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-32">
                    <button
                      onClick={handleCopyMessage}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </button>
                    
                    {onPinMessage && (
                      <button
                        onClick={handlePin}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <Pin className="h-4 w-4 mr-2" />
                        Pin
                      </button>
                    )}
                    
                    {isOwn && (
                      <>
                        <button
                          onClick={handleEdit}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;