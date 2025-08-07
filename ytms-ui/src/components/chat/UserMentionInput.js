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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);
  const sendTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const commonEmojis = ['😊', '😄', '👍', '👎', '❤️', '😂', '😅', '😍', '🤔', '👏', '🔥', '💯'];

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resizeTextarea = (textarea) => {
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = isMobile ? (replyingTo ? 80 : 100) : (replyingTo ? 120 : 150);
    const minHeight = isMobile ? 36 : 44;
    
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

  // FIXED: Handle reply message sending properly
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
        const messageContent = message.trim();
        
        // FIXED: Create proper message structure for replies
        let messageToSend;
        if (replyingTo) {
          messageToSend = {
            content: messageContent,
            parentMessageId: replyingTo.id
          };
        } else {
          messageToSend = messageContent;
        }
        
        const success = onSendMessage(messageToSend);
        if (success !== false) {
          setMessage('');
          if (textareaRef.current) {
            textareaRef.current.style.height = isMobile ? '36px' : '44px';
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
          className={`absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto z-50 ${
            isMobile ? 'mb-1 max-h-32' : 'mb-2 max-h-40'
          }`}
        >
          {suggestions.map((user, index) => (
            <div
              key={user.userId || user.username}
              className={`cursor-pointer flex items-center transition-colors ${
                index === selectedSuggestion ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50'
              } ${isMobile ? 'px-2 py-1.5 space-x-2' : 'px-3 py-2 space-x-2'}`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(user);
              }}
            >
              <div className={`bg-blue-500 rounded-full flex items-center justify-center text-white font-medium ${
                isMobile ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-xs'
              }`}>
                {user.username ? user.username[0].toUpperCase() : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-gray-900 ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  @{user.username}
                </div>
                {user.displayName && user.displayName !== user.username && (
                  <div className={`text-gray-500 truncate ${
                    isMobile ? 'text-xs' : 'text-xs'
                  }`}>
                    {user.displayName}
                  </div>
                )}
              </div>
              <div className={`rounded-full ${
                user.status === 'online' ? 'bg-green-500' : 
                user.status === 'away' ? 'bg-yellow-500' : 
                user.status === 'busy' ? 'bg-red-500' : 'bg-gray-500'
              } ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className={`absolute bottom-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 ${
            isMobile 
              ? 'right-0 mb-1 p-3 w-64' 
              : 'right-0 mb-2 p-4 w-80'
          }`}
        >
          <div className={`grid gap-2 ${
            isMobile ? 'grid-cols-6 gap-1' : 'grid-cols-8'
          }`}>
            {commonEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => insertEmoji(emoji)}
                className={`hover:bg-gray-100 rounded transition-colors flex items-center justify-center ${
                  isMobile 
                    ? 'p-2 text-base h-10 w-10' 
                    : 'p-3 text-xl h-12 w-12'
                }`}
                type="button"
                style={{ 
                  fontSize: isMobile ? '16px' : '20px',
                  fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reply Preview - More compact on mobile */}
      {replyingTo && (
        <div className={`border-l-4 border-blue-500 bg-blue-50 rounded-r-lg ${
          isMobile ? 'mx-3 mb-2 px-3 py-2' : 'mx-4 mb-2 px-4 py-3'
        }`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center flex-1 min-w-0 ${
              isMobile ? 'space-x-1.5' : 'space-x-2'
            }`}>
              <Reply className={`text-blue-600 flex-shrink-0 ${
                isMobile ? 'h-3 w-3' : 'h-4 w-4'
              }`} />
              <div className="flex-1 min-w-0">
                <span className={`text-blue-700 font-medium ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  Replying to {replyingTo.senderName}
                </span>
                <p className={`text-blue-600 truncate ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  {replyingTo.content}
                </p>
              </div>
            </div>
            {onCancelReply && (
              <button
                onClick={onCancelReply}
                className={`text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2 ${
                  isMobile ? 'p-0.5' : 'p-1'
                }`}
                title="Cancel reply"
              >
                <X className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleFormSubmit} className={`bg-white border-t border-gray-200 ${
        isMobile ? 'p-3' : 'p-4'
      }`}>
        <div className={`flex items-end ${isMobile ? 'space-x-2' : 'space-x-3'}`}>
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
              className={`w-full border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-5 overflow-hidden transition-all duration-200 ${
                (!connected || isSending) ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${replyingTo ? 'border-blue-300 focus:ring-blue-500' : ''} ${
                isMobile 
                  ? 'px-3 py-2 pr-16 text-sm' 
                  : 'px-4 py-3 pr-20 text-sm'
              }`}
              style={{ 
                minHeight: isMobile ? '36px' : '44px',
                maxHeight: isMobile ? (replyingTo ? '80px' : '100px') : (replyingTo ? '120px' : '150px'),
                fontSize: isMobile ? '16px' : '14px' // Prevent zoom on iOS
              }}
            />
            
            {/* Input Actions */}
            <div className={`absolute top-1/2 transform -translate-y-1/2 flex items-center ${
              isMobile ? 'right-1.5 space-x-0.5' : 'right-2 space-x-1'
            }`}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors ${
                  isMobile ? 'p-1' : 'p-1.5'
                }`}
                title="Add emoji"
              >
                <Smile className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              </button>
              
              <button
                type="button"
                className={`text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors ${
                  isMobile ? 'p-1' : 'p-1.5'
                }`}
                title="Attach file"
                disabled
              >
                <Paperclip className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              </button>
            </div>
          </div>
          
          {/* Send Button */}
          <div className="flex-shrink-0">
            <button
              type="submit"
              disabled={!connected || !message.trim() || isSending}
              className={`flex items-center justify-center rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
                replyingTo 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } ${
                isMobile 
                  ? 'w-9 h-9' 
                  : 'w-12 h-11'
              }`}
              title={replyingTo ? 'Send reply' : 'Send message'}
            >
              {isSending ? (
                <div className={`border-2 border-white border-t-transparent rounded-full animate-spin ${
                  isMobile ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              ) : (
                <Send className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              )}
            </button>
          </div>
        </div>

        {!message.trim() && !replyingTo && (
          <div className={`text-gray-400 text-center sm:text-left ${
            isMobile ? 'mt-2 text-xs' : 'mt-3 text-xs'
          }`}>
            <span>Press Enter to send • Shift+Enter for new line</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default UserMentionInput;