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
  Pin,
  Smile
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
  const [isReacting, setIsReacting] = useState(false);
  const [reactingToType, setReactingToType] = useState(null);
  
  const messageRef = useRef(null);
  const actionsRef = useRef(null);
  const reactionsRef = useRef(null);

  const availableReactions = [
    { emoji: '👍', type: 'thumbs_up', label: 'Thumbs Up' },
    { emoji: '👎', type: 'thumbs_down', label: 'Thumbs Down' },
    { emoji: '✅', type: 'ack', label: 'Acknowledge' },
    { emoji: '❌', type: 'reject', label: 'Reject' },
    { emoji: '⭐', type: 'appraise', label: 'Appraise' },
    { emoji: '😞', type: 'disappointed', label: 'Disappointed' }
  ];

  // FIXED: Enhanced reaction parsing with better debugging
  useEffect(() => {
    try {
      console.log('🎯 ChatMessage: Processing reactions for message', message.id, {
        rawReactions: message.reactions,
        messageUpdatedAt: message.updatedAt,
        messageCreatedAt: message.createdAt
      });
      
      const messageReactions = message.reactions ? JSON.parse(message.reactions) : {};
      setReactions(messageReactions);
      
      console.log('🎯 ChatMessage: Parsed reactions:', messageReactions);
    } catch (error) {
      console.error('🎯 ChatMessage: Error parsing reactions:', error);
      setReactions({});
    }
  }, [message.reactions, message.id, message.updatedAt]);

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

  // FIXED: Enhanced reaction handler with better state management and debugging
  const handleReaction = async (reactionType) => {
    if (!onReactToMessage || isReacting || reactingToType === reactionType) {
      console.log('🎯 ChatMessage: Reaction blocked', {
        hasHandler: !!onReactToMessage,
        isReacting,
        reactingToType,
        requestedType: reactionType
      });
      return;
    }
    
    try {
      setIsReacting(true);
      setReactingToType(reactionType);
      setShowReactions(false);
      
      // Check current reaction state
      const currentReaction = reactions[reactionType];
      const userHasReaction = currentReaction && 
        currentReaction.userIds && 
        currentReaction.userIds.includes(currentUserId);
      
      console.log('🎯 ChatMessage: Handling reaction:', {
        reactionType,
        messageId: message.id,
        currentReactions: reactions,
        userHasReaction,
        currentReaction
      });
      
      // FIXED: Just call the handler - let backend handle toggle logic
      await onReactToMessage(message.id, reactionType);
      
      console.log('🎯 ChatMessage: Reaction handled successfully');
      
    } catch (error) {
      console.error('🎯 ChatMessage: Error handling reaction:', error);
      // Error message will be shown by the handler in RoomChatPanel
    } finally {
      setIsReacting(false);
      setReactingToType(null);
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

  const isUserMentioned = () => {
    if (!currentUserId || !message.content || !Array.isArray(onlineUsers)) return false;
    const currentUser = onlineUsers.find(user => user && user.userId === currentUserId);
    if (!currentUser) return false;
    
    const mentionRegex = new RegExp(`@${currentUser.username}\\b`, 'i');
    return mentionRegex.test(message.content);
  };

  const userMentioned = isUserMentioned();

  if (message.type === 'JOIN' || message.type === 'LEAVE' || message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const isReply = message.parentMessageId && parentMessage;

  return (
    <div 
      ref={messageRef}
      className={`group relative px-4 py-2 hover:bg-gray-50 transition-colors ${
        userMentioned ? 'bg-blue-50 border-l-4 border-blue-500 pl-6' : ''
      } ${isSearchResult ? 'border border-yellow-300 bg-yellow-50' : ''}`}
    >
      <div className="flex space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium ${
            isOwn ? 'bg-blue-500' : 'bg-gray-600'
          }`}>
            {getInitials(message.senderName, message.senderUsername)}
          </div>
        </div>

        {/* Message content container */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline space-x-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">
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
            <div className="mb-2 p-2 bg-gray-100 border-l-4 border-gray-300 rounded-r-lg text-sm max-w-md">
              <div className="text-xs text-gray-600 mb-1 font-medium">
                {parentMessage.senderName}
              </div>
              <div className="text-gray-800 line-clamp-2">
                {parentMessage.content?.length > 100 
                  ? `${parentMessage.content.substring(0, 100)}...`
                  : parentMessage.content
                }
              </div>
            </div>
          )}

          {/* Message Content */}
          <div>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  autoFocus
                />
                <div className="flex space-x-2 text-sm">
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
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
                  className="max-w-xs rounded-lg border shadow-sm"
                />
              ) : (
                <a
                  href={message.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  📎 {message.attachmentName || 'Download attachment'}
                </a>
              )}
            </div>
          )}

          {/* FIXED: Enhanced Reactions Display with better state tracking */}
          {Object.keys(reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(reactions).map(([reactionType, reactionData]) => {
                if (!reactionData || !reactionData.count || reactionData.count === 0) return null;
                
                const reactionConfig = availableReactions.find(r => r.type === reactionType);
                const hasUserReacted = reactionData.userIds?.includes(currentUserId);
                const isProcessing = reactingToType === reactionType;
                
                return (
                  <button
                    key={reactionType}
                    onClick={() => handleReaction(reactionType)}
                    disabled={isReacting}
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition-colors disabled:opacity-50 ${
                      hasUserReacted 
                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${isProcessing ? 'animate-pulse' : ''}`}
                    title={`${reactionData.count} ${reactionConfig?.label || reactionType} reaction${reactionData.count !== 1 ? 's' : ''}`}
                  >
                    <span>{reactionConfig?.emoji || '👍'}</span>
                    <span className="font-medium">{reactionData.count}</span>
                    {isProcessing && <span className="text-xs">...</span>}
                  </button>
                );
              })}
            </div>
          )}
          
          {/* Actions Bar */}
          {showActionsMenu && !isEditing && (
            <div className="mt-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Add Reaction Button */}
              {!isOwn && (
                <div className="relative" ref={reactionsRef}>
                  <button
                    onClick={() => setShowReactions(!showReactions)}
                    disabled={isReacting}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                    title="Add reaction"
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  {showReactions && (
                    <div className="absolute bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50">
                      <div className="flex gap-1">
                        {availableReactions.map((reaction) => (
                          <button
                            key={reaction.type}
                            onClick={() => handleReaction(reaction.type)}
                            disabled={isReacting}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-lg transition-colors disabled:opacity-50"
                            title={reaction.label}
                          >
                            {reaction.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reply Button */}
              {showReplyButton && (
                <button
                  onClick={handleReply}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title="Reply"
                >
                  <Reply className="h-4 w-4" />
                </button>
              )}

              {/* More Actions Dropdown */}
              <div className="relative" ref={actionsRef}>
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {showActionsDropdown && (
                  <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[150px]">
                    <button
                      onClick={handleCopyMessage}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </button>
                    {onPinMessage && (
                      <button
                        onClick={handlePin}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                      >
                        <Pin className="h-4 w-4 mr-2" />
                        Pin
                      </button>
                    )}
                    {isOwn && (
                      <>
                        <button
                          onClick={handleEdit}
                          className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
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
          )}

        </div>
      </div>

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default ChatMessage;