import React from 'react';

const TypingIndicator = ({ users }) => {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].username} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].username} and ${users[1].username} are typing...`;
    } else {
      return `${users[0].username} and ${users.length - 1} others are typing...`;
    }
  };

  return (
    <div className="px-4 py-2">
      <div className="flex items-center space-x-3">
        {/* Typing animation dots */}
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        
        {/* Typing text */}
        <span className="text-sm text-gray-600 italic">
          {getTypingText()}
        </span>
      </div>
    </div>
  );
};

export default TypingIndicator;