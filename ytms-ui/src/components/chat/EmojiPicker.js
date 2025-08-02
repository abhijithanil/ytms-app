import React, { useState } from 'react';
import { Smile } from 'lucide-react';

const EmojiPicker = ({ onEmojiSelect, isOpen, onToggle }) => {
  const emojiCategories = {
    'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'],
    'Gestures': ['👍', '👎', '👌', '✋', '🤚', '🖐', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️'],
    'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖'],
    'Objects': ['🔥', '💯', '⭐', '🌟', '✨', '⚡', '💥', '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '🏅', '🎯', '📌']
  };

  const [activeCategory, setActiveCategory] = useState('Smileys');

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full mb-2 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-80">
      <div className="p-2">
        {/* Category tabs */}
        <div className="flex border-b border-gray-200 mb-2">
          {Object.keys(emojiCategories).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1 text-sm rounded-t ${
                activeCategory === category
                  ? 'bg-blue-100 text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {emojiCategories[activeCategory].map((emoji, index) => (
            <button
              key={index}
              onClick={() => {
                onEmojiSelect(emoji);
                onToggle();
              }}
              className="p-2 text-xl hover:bg-gray-100 rounded transition-colors"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Emoji trigger button component
export const EmojiButton = ({ onEmojiSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        title="Add emoji"
      >
        <Smile size={20} />
      </button>
      
      <EmojiPicker
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        onEmojiSelect={onEmojiSelect}
      />
    </div>
  );
};

export default EmojiPicker;