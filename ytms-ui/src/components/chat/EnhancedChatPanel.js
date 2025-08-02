import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatMessage from './ChatMessage';
import RichTextEditor from './RichTextEditor';
import MessageReactions from './MessageReactions';
import TypingIndicator from './TypingIndicator';
import { Send, Paperclip } from 'lucide-react';

const EnhancedChatPanel = ({ 
  room, 
  messages = [], 
  onSendMessage, 
  onFileUpload,
  onAddReaction,
  typingUsers = [],
  stompClient,
  onlineUsers = []
}) => {
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!messageText.trim() && !selectedFile) return;

    const messageData = {
      content: messageText.trim(),
      chatRoomId: room.id,
      attachmentUrl: selectedFile?.url,
      attachmentName: selectedFile?.name,
      attachmentType: selectedFile?.type,
      messageId: Date.now().toString() // For deduplication
    };

    onSendMessage(messageData);
    setMessageText('');
    setSelectedFile(null);
    handleStopTyping();
  };

  const handleTyping = () => {
    if (!isTyping && stompClient && room) {
      setIsTyping(true);
      stompClient.send(`/app/typing/room/${room.id}`, {}, JSON.stringify({
        isTyping: true
      }));

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        handleStopTyping();
      }, 2000);
    }
  };

  const handleStopTyping = () => {
    if (isTyping && stompClient && room) {
      setIsTyping(false);
      stompClient.send(`/app/typing/room/${room.id}`, {}, JSON.stringify({
        isTyping: false
      }));

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    try {
      // Upload file and get URL
      if (onFileUpload) {
        const fileData = await onFileUpload(file);
        setSelectedFile(fileData);
      }
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  const handleReactionAdd = (messageId, emoji) => {
    if (onAddReaction) {
      onAddReaction(messageId, emoji);
    }
  };

  const handleKeyPress = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">No chat selected</div>
          <div className="text-gray-400">Choose a conversation to start messaging</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {room.roomType === 'DIRECT_MESSAGE' ? (
                <span>💬 {room.roomName}</span>
              ) : room.roomType === 'TASK_CHAT' ? (
                <span>📋 Task: {room.roomName}</span>
              ) : (
                <span>🏠 {room.roomName}</span>
              )}
            </h2>
            <div className="text-sm text-gray-500">
              {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
              {room.description && ` • ${room.description}`}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-lg mb-2">No messages yet</div>
              <div className="text-sm">Be the first to send a message!</div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className="relative">
                <ChatMessage
                  message={message}
                  isOwn={message.senderId === user?.id}
                  currentUserId={user?.id}
                  onlineUsers={onlineUsers}
                />
                
                {/* Message Reactions */}
                <MessageReactions
                  reactions={message.reactions}
                  messageId={message.id}
                  onAddReaction={handleReactionAdd}
                  currentUserId={user?.id}
                  className="mt-1 ml-11"
                />
              </div>
            ))}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator typingUsers={typingUsers} />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="px-6 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Paperclip size={16} className="text-blue-500" />
              <span className="text-sm text-blue-700">{selectedFile.name}</span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-blue-500 hover:text-blue-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
        <RichTextEditor
          value={messageText}
          onChange={(value) => {
            setMessageText(value);
            if (value.trim()) {
              handleTyping();
            } else {
              handleStopTyping();
            }
          }}
          onSubmit={handleSendMessage}
          onFileUpload={handleFileSelect}
          placeholder={`Message ${room.roomName}...`}
          disabled={!room}
        />

        {/* Quick action buttons */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">
            <span className="font-medium">Tip:</span> Use **bold**, *italic*, `code` formatting
          </div>
          <div className="text-xs text-gray-400">
            Press Ctrl+Enter to send
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedChatPanel;