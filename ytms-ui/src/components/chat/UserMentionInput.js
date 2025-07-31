import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

const UserMentionInput = ({ 
  onSendMessage, 
  onStartTyping, 
  onStopTyping, 
  connected, 
  onlineUsers = [] 
}) => {
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Auto-resize function
  const resizeTextarea = (textarea) => {
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 150;
    textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  // Handle input changes and detect mentions
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setMessage(value);
    if (onStartTyping) onStartTyping();
    
    // Auto-resize textarea
    resizeTextarea(e.target);
    
    // Check for mention trigger (@)
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch && Array.isArray(onlineUsers)) {
      const mentionQuery = mentionMatch[1].toLowerCase();
      const matchedUsers = onlineUsers.filter(user => 
        user && user.username && (
          user.username.toLowerCase().includes(mentionQuery) ||
          (user.displayName && user.displayName.toLowerCase().includes(mentionQuery))
        )
      );
      
      if (matchedUsers.length > 0) {
        setSuggestions(matchedUsers);
        setShowSuggestions(true);
        setSelectedSuggestion(0);
        setMentionStart(textBeforeCursor.lastIndexOf('@'));
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e) => {
    if (showSuggestions) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestion(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestion(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Tab':
        case 'Enter':
          if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
            e.preventDefault();
            insertMention(suggestions[selectedSuggestion]);
            return;
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Insert mention into message
  const insertMention = (user) => {
    const beforeMention = message.substring(0, mentionStart);
    const afterCursor = message.substring(textareaRef.current.selectionStart);
    const newMessage = `${beforeMention}@${user.username} ${afterCursor}`;
    
    setMessage(newMessage);
    setShowSuggestions(false);
    
    // Focus back to textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPosition = beforeMention.length + user.username.length + 2;
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        resizeTextarea(textareaRef.current);
      }
    }, 0);
  };

  // Handle sending message
  const handleSendMessage = () => {
    if (!message.trim() || !connected) return;

    if (onSendMessage) {
      const success = onSendMessage(message);
      if (success !== false) {
        setMessage('');
        if (onStopTyping) onStopTyping();
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.overflowY = 'hidden';
        }
      }
    }
  };

  // Handle form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  // Handle textarea blur
  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      if (onStopTyping) onStopTyping();
    }, 100);
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial textarea setup
  useEffect(() => {
    if (textareaRef.current) {
      resizeTextarea(textareaRef.current);
    }
  }, []);

  return (
    <div className="relative">
      {/* Mention Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50"
        >
          {suggestions.map((user, index) => (
            <div
              key={user.userId || user.username}
              className={`px-3 py-2 cursor-pointer flex items-center space-x-2 ${
                index === selectedSuggestion ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur from firing
                insertMention(user);
              }}
            >
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {user.username ? user.username[0].toUpperCase() : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  @{user.username}
                </div>
                {user.displayName && user.displayName !== user.username && (
                  <div className="text-xs text-gray-500 truncate">
                    {user.displayName}
                  </div>
                )}
              </div>
              <div className={`w-2 h-2 rounded-full ${
                user.status === 'online' ? 'bg-green-500' : 
                user.status === 'away' ? 'bg-yellow-500' : 
                user.status === 'busy' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
            </div>
          ))}
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-end space-x-2 space-y-2 p-2 bg-white border-t border-gray-200">
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={connected ? "Type a message... (use @ to mention users)" : "Connecting..."}
            disabled={!connected}
            rows={1}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm leading-5 overflow-hidden"
            style={{ 
              minHeight: '48px',
              maxHeight: '150px'
            }}
          />
        </div>
        <button
          onClick={handleSendMessage}
          disabled={!connected || !message.trim()}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 h-[48px] flex items-center justify-center"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default UserMentionInput;