import React, { useState, useRef } from 'react';
import { EmojiButton } from './EmojiPicker';
import { Bold, Italic, Code, Paperclip, Send } from 'lucide-react';

const RichTextEditor = ({ 
  value, 
  onChange, 
  onSubmit, 
  onFileUpload, 
  placeholder = "Type a message...",
  disabled = false 
}) => {
  const textareaRef = useRef(null);
  const [showFormatting, setShowFormatting] = useState(false);

  const insertText = (before, after = '') => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);
    
    // Set cursor position
    setTimeout(() => {
      const newPosition = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    // Handle Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
      return;
    }

    // Handle Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      insertText('**', '**');
      return;
    }

    // Handle Ctrl/Cmd + I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      insertText('*', '*');
      return;
    }

    // Handle ` for code
    if (e.key === '`' && !e.ctrlKey && !e.metaKey) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start !== end) {
        e.preventDefault();
        insertText('`', '`');
      }
    }
  };

  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const newText = value.substring(0, start) + emoji + value.substring(start);
    onChange(newText);
    
    setTimeout(() => {
      const newPosition = start + emoji.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  const formatButtons = [
    { icon: Bold, action: () => insertText('**', '**'), title: 'Bold (Ctrl+B)' },
    { icon: Italic, action: () => insertText('*', '*'), title: 'Italic (Ctrl+I)' },
    { icon: Code, action: () => insertText('`', '`'), title: 'Code' },
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Formatting toolbar */}
      {showFormatting && (
        <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
          <div className="flex items-center space-x-1">
            {formatButtons.map((button, index) => (
              <button
                key={index}
                onClick={button.action}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                title={button.title}
              >
                <button.icon size={16} />
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500">
            **bold** *italic* `code` Ctrl+Enter to send
          </div>
        </div>
      )}

      {/* Text input area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowFormatting(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full p-3 resize-none border-0 focus:ring-0 focus:outline-none"
          rows={3}
          style={{ minHeight: '80px', maxHeight: '200px' }}
        />
        
        {/* Bottom toolbar */}
        <div className="flex items-center justify-between p-2 bg-gray-50">
          <div className="flex items-center space-x-2">
            <EmojiButton onEmojiSelect={handleEmojiSelect} />
            
            {onFileUpload && (
              <label className="cursor-pointer p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <Paperclip size={20} />
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => onFileUpload(e.target.files[0])}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                />
              </label>
            )}
          </div>
          
          <button
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;