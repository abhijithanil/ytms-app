// Updated UserMentionInput.js - Enhanced with reply support and better UX

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Reply } from 'lucide-react';

const UserMentionInput = ({ 
  onSendMessage, 
  onStartTyping, 
  onStopTyping, 
  connected, 
  onlineUsers = [],
  placeholder = "Type a message...",
  replyingTo = null,
  onCancelReply = null
}) => {
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [isSending, setIsSending] = useState(false);
  
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);
  const sendTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-resize function - IMPROVED
  const resizeTextarea = (textarea) => {
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = replyingTo ? 120 : 150; // Smaller when replying
    const minHeight = 40;
    
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
    textarea.style.height = newHeight + 'px';
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  // Focus textarea when replying
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  // Handle input changes and detect mentions
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setMessage(value);
    
    // Handle typing indicators with debouncing
    if (onStartTyping) {
      onStartTyping();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        if (onStopTyping) onStopTyping();
      }, 1000);
    }
    
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
    
    // Handle escape to cancel reply
    if (e.key === 'Escape' && replyingTo && onCancelReply) {
      onCancelReply();
      return;
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

  // Handle sending message with duplicate prevention
  const handleSendMessage = () => {
    if (!message.trim() || !connected || isSending) {
      console.log('Cannot send message:', { 
        hasMessage: !!message.trim(), 
        connected, 
        isSending 
      });
      return;
    }

    // Prevent rapid duplicate sends
    setIsSending(true);
    
    // Clear any existing timeout
    if (sendTimeoutRef.current) {
      clearTimeout(sendTimeoutRef.current);
    }
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (onStopTyping) onStopTyping();

    // Debounce the send operation
    sendTimeoutRef.current = setTimeout(() => {
      if (onSendMessage) {
        const success = onSendMessage(message);
        if (success !== false) {
          setMessage('');
          // Reset textarea height
          if (textareaRef.current) {
            textareaRef.current.style.height = '40px';
            textareaRef.current.style.overflowY = 'hidden';
          }
        }
      }
      
      // Re-enable sending after a short delay
      setTimeout(() => {
        setIsSending(false);
      }, 500);
    }, 100);
  };

  // Handle form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSendMessage();
  };

  // Handle textarea blur
  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks and stop typing
    setTimeout(() => {
      if (onStopTyping) onStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
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

      {/* Reply Preview - UPDATED: Show when replying */}
      {replyingTo && (
        <div className="border-l-2 border-blue-500 bg-blue-50 px-3 py-2 mx-4 mb-2 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Reply className="h-3 w-3 text-blue-600 flex-shrink-0" />
              <span className="text-xs text-blue-700 font-medium">
                Replying to {replyingTo.senderName}
              </span>
              <span className="text-xs text-blue-600 truncate">
                {replyingTo.content}
              </span>
            </div>
            {onCancelReply && (
              <button
                onClick={onCancelReply}
                className="text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2"
                title="Cancel reply"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleFormSubmit} className="flex items-end space-x-2 p-4 bg-white message-input-container">
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={connected ? placeholder : "Connecting..."}
            disabled={!connected || isSending}
            rows={1}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm leading-5 overflow-hidden transition-all duration-200 ${
              (!connected || isSending) ? 'bg-gray-100 cursor-not-allowed' : ''
            } ${replyingTo ? 'border-blue-300 focus:ring-blue-500' : ''}`}
            style={{ 
              minHeight: '40px',
              maxHeight: replyingTo ? '120px' : '150px'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!connected || !message.trim() || isSending}
          className={`px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 h-[40px] flex items-center justify-center ${
            replyingTo 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
          title={replyingTo ? 'Send reply' : 'Send message'}
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>

      {/* Keyboard Shortcuts Help */}
      {message.length === 0 && !replyingTo && (
        <div className="absolute bottom-2 right-16 text-xs text-gray-400 pointer-events-none">
          <span className="hidden sm:inline">Enter to send • Shift+Enter for new line</span>
          {replyingTo && <span> • Esc to cancel reply</span>}
        </div>
      )}
    </div>
  );
};

export default UserMentionInput;