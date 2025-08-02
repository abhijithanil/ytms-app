import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MessageWithMentions from './MessageWithMentions';

const ReplyModal = ({ message, onClose, onSend, onlineUsers = [] }) => {
  const [replyContent, setReplyContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSend = async () => {
    if (!replyContent.trim() || isSending) return;

    try {
      setIsSending(true);
      await onSend(replyContent.trim(), { parentMessageId: message.id });
      onClose();
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name, username) => {
    if (name && name.includes(' ')) {
      const parts = name.split(' ');
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return username ? username[0].toUpperCase() : '?';
  };

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Reply className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Reply to message</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Original Message */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {getInitials(message.senderName, message.senderUsername)}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {message.senderName || message.senderUsername}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                
                <div className="text-gray-800 text-sm">
                  <MessageWithMentions
                    content={message.content}
                    currentUserId={null}
                    onlineUsers={onlineUsers}
                  />
                </div>

                {/* Attachments */}
                {message.attachmentUrl && (
                  <div className="mt-2">
                    {message.attachmentType?.startsWith('image/') ? (
                      <img
                        src={message.attachmentUrl}
                        alt={message.attachmentName || 'Attachment'}
                        className="max-w-48 rounded border"
                      />
                    ) : (
                      <div className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs text-gray-700">
                        📎 {message.attachmentName || 'Attachment'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reply Input */}
          <div className="p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your reply
            </label>
            <textarea
              ref={textareaRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!replyContent.trim() || isSending}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyModal;