import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Reply, Paperclip, Smile } from 'lucide-react';

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);
  const sendTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const commonEmojis = ['😊', '😄', '👍', '👎', '❤️', '😂', '😅', '😍', '🤔', '👏', '🔥', '💯'];

  const resizeTextarea = (textarea) => {
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = replyingTo ? 120 : 150;
    const minHeight = 44;
    
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
    textarea.style.height = newHeight + 'px';
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setMessage(value);
    
    if (onStartTyping) {
      onStartTyping();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (onStopTyping) onStopTyping();
      }, 1000);
    }
    
    resizeTextarea(e.target);
    
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
    
    if (e.key === 'Escape' && replyingTo && onCancelReply) {
      onCancelReply();
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const insertMention = (user) => {
    const beforeMention = message.substring(0, mentionStart);
    const afterCursor = message.substring(textareaRef.current.selectionStart);
    const newMessage = `${beforeMention}@${user.username} ${afterCursor}`;
    
    setMessage(newMessage);
    setShowSuggestions(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPosition = beforeMention.length + user.username.length + 2;
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        resizeTextarea(textareaRef.current);
      }
    }, 0);
  };

  const insertEmoji = (emoji) => {
    const cursorPosition = textareaRef.current.selectionStart;
    const beforeCursor = message.substring(0, cursorPosition);
    const afterCursor = message.substring(cursorPosition);
    const newMessage = `${beforeCursor}${emoji} ${afterCursor}`;
    
    setMessage(newMessage);
    setShowEmojiPicker(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPosition = cursorPosition + emoji.length + 1;
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        resizeTextarea(textareaRef.current);
      }
    }, 0);
  };

  const handleSendMessage = () => {
    if (!message.trim() || !connected || isSending) {
      return;
    }

    setIsSending(true);
    
    if (sendTimeoutRef.current) {
      clearTimeout(sendTimeoutRef.current);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (onStopTyping) onStopTyping();

    sendTimeoutRef.current = setTimeout(() => {
      if (onSendMessage) {
        const success = onSendMessage(message);
        if (success !== false) {
          setMessage('');
          if (textareaRef.current) {
            textareaRef.current.style.height = '44px';
            textareaRef.current.style.overflowY = 'hidden';
          }
        }
      }
      
      setTimeout(() => {
        setIsSending(false);
      }, 500);
    }, 100);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSendMessage();
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (onStopTyping) onStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }, 100);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      resizeTextarea(textareaRef.current);
    }
  }, []);

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
    <div className="relative bg-white">
      {/* Mention Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50"
        >
          {suggestions.map((user, index) => (
            <div
              key={user.userId || user.username}
              className={`px-3 py-2 cursor-pointer flex items-center space-x-2 transition-colors ${
                index === selectedSuggestion ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
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

      {/* Emoji Picker - Fixed positioning */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50"
        >
          <div className="grid grid-cols-10 gap-2">
            {commonEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => insertEmoji(emoji)}
                className="p-2 hover:bg-gray-100 rounded transition-colors text-lg leading-none"
                type="button"
                style={{ fontSize: '18px' }} // Ensures proper emoji rendering
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="border-l-4 border-blue-500 bg-blue-50 px-4 py-3 mx-4 mb-2 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Reply className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-700 font-medium">
                Replying to {replyingTo.senderName}
              </span>
              <span className="text-sm text-blue-600 truncate">
                {replyingTo.content}
              </span>
            </div>
            {onCancelReply && (
              <button
                onClick={onCancelReply}
                className="text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2 p-1"
                title="Cancel reply"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message Input - Fixed alignment */}
      <form onSubmit={handleFormSubmit} className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={connected ? placeholder : "Connecting..."}
              disabled={!connected || isSending}
              rows={1}
              className={`w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm leading-5 overflow-hidden transition-all duration-200 ${
                (!connected || isSending) ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${replyingTo ? 'border-blue-300 focus:ring-blue-500' : ''}`}
              style={{ 
                minHeight: '44px',
                maxHeight: replyingTo ? '120px' : '150px'
              }}
            />
            
            {/* Input Actions - Fixed positioning */}
            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Add emoji"
              >
                <Smile className="h-4 w-4" />
              </button>
              
              <button
                type="button"
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Attach file"
                disabled
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Send Button - Fixed alignment */}
          <button
            type="submit"
            disabled={!connected || !message.trim() || isSending}
            className={`px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 flex items-center justify-center min-w-[48px] h-[44px] ${
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
        </div>

        {/* Helper Text - Fixed positioning to not overlap */}
        {!message.trim() && !replyingTo && (
          <div className="mt-2 text-xs text-gray-400 text-center sm:text-left">
            <span>Press Enter to send • Shift+Enter for new line</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default UserMentionInput;