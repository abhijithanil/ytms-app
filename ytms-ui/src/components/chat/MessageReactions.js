import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { EmojiButton } from './EmojiPicker';

const MessageReactions = ({ 
  reactions = '{}', 
  messageId, 
  onAddReaction, 
  currentUserId,
  className = '' 
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  let parsedReactions = {};
  try {
    parsedReactions = JSON.parse(reactions || '{}');
  } catch (error) {
    console.warn('Failed to parse reactions:', error);
    parsedReactions = {};
  }

  const handleReactionAdd = (emoji) => {
    if (onAddReaction) {
      onAddReaction(messageId, emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleReactionToggle = (emoji) => {
    if (onAddReaction) {
      onAddReaction(messageId, emoji);
    }
  };

  // Check if there are any reactions
  const hasReactions = Object.keys(parsedReactions).length > 0;

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {/* Existing reactions */}
      {Object.entries(parsedReactions).map(([emoji, users]) => {
        const userList = Array.isArray(users) ? users : [users];
        const count = userList.length;
        const currentUserReacted = userList.includes(currentUserId);
        
        return (
          <button
            key={emoji}
            onClick={() => handleReactionToggle(emoji)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
              currentUserReacted
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
            title={`${count} ${count === 1 ? 'person' : 'people'} reacted with ${emoji}`}
          >
            <span>{emoji}</span>
            <span className="text-xs font-medium">{count}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          title="Add reaction"
        >
          <Plus size={12} />
        </button>

        {showEmojiPicker && (
          <div className="absolute bottom-full mb-2 left-0 z-50">
            <EmojiButton onEmojiSelect={handleReactionAdd} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageReactions;