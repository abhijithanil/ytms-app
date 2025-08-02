import React, { useState } from 'react';
import { Plus, Smile } from 'lucide-react';

const MessageReactions = ({ message, currentUserId, onAddReaction, onRemoveReaction }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Common emoji reactions
  const commonEmojis = ['👍', '❤️', '😄', '😮', '😢', '😡', '🎉', '👏'];
  
  // Parse reactions from message
  const reactions = React.useMemo(() => {
    try {
      const reactionsData = message.reactions ? JSON.parse(message.reactions) : {};
      return Object.entries(reactionsData).map(([emoji, users]) => ({
        emoji,
        users: Array.isArray(users) ? users : [],
        count: Array.isArray(users) ? users.length : 0,
        hasReacted: Array.isArray(users) ? users.some(user => user.userId === currentUserId) : false
      })).filter(reaction => reaction.count > 0);
    } catch (error) {
      console.error('Error parsing reactions:', error);
      return [];
    }
  }, [message.reactions, currentUserId]);

  const handleReactionClick = (emoji) => {
    const reaction = reactions.find(r => r.emoji === emoji);
    if (reaction && reaction.hasReacted) {
      onRemoveReaction?.(message.id, emoji);
    } else {
      onAddReaction?.(message.id, emoji);
    }
  };

  const handleEmojiSelect = (emoji) => {
    handleReactionClick(emoji);
    setShowEmojiPicker(false);
  };

  if (reactions.length === 0 && !showEmojiPicker) {
    return (
      <div className="flex items-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setShowEmojiPicker(true)}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          title="Add reaction"
        >
          <Smile className="w-3 h-3" />
          <span>React</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji)}
          className={`flex items-center space-x-1 px-2 py-1 text-xs rounded-full border transition-colors ${
            reaction.hasReacted
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
          }`}
          title={`${reaction.emoji} ${reaction.count} reaction${reaction.count > 1 ? 's' : ''}`}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}
      
      {showEmojiPicker ? (
        <div className="relative">
          <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-10">
            <div className="grid grid-cols-4 gap-1">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="p-2 hover:bg-gray-100 rounded text-lg"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowEmojiPicker(true)}
          className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          title="Add reaction"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default MessageReactions;