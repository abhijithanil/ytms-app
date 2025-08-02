import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const MessageWithMentions = ({ content, currentUserId, onlineUsers = [], className = '' }) => {
  // Safety checks
  if (!content) {
    return <span></span>;
  }

  if (typeof content !== 'string') {
    return <span>{String(content)}</span>;
  }

  // Ensure onlineUsers is an array
  const safeOnlineUsers = Array.isArray(onlineUsers) ? onlineUsers : [];

  // Parse message content to identify mentions
  const parseMessageContent = (text) => {
    // Regular expression to match @username patterns
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }

      // Add mention
      const username = match[1];
      const mentionedUser = safeOnlineUsers.find(user => user && user.username === username);
      const isCurrentUser = mentionedUser?.userId === currentUserId;

      parts.push({
        type: 'mention',
        content: match[0], // @username
        username: username,
        isCurrentUser: isCurrentUser,
        userExists: !!mentionedUser
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    return parts;
  };

  const messageParts = parseMessageContent(content);

  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>
      {messageParts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <span
              key={index}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-sm font-medium ${
                part.isCurrentUser
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' // Highlight current user mentions
                  : part.userExists
                  ? 'bg-gray-100 text-gray-800 border border-gray-200' // Valid user mentions
                  : 'bg-red-50 text-red-600 border border-red-200' // Invalid user mentions
              }`}
              title={
                part.isCurrentUser 
                  ? 'You were mentioned' 
                  : part.userExists 
                  ? `Mentioned user: ${part.username}` 
                  : `User not found: ${part.username}`
              }
            >
              {part.content}
            </span>
          );
        }
        
        return (
          <MarkdownRenderer 
            key={index}
            content={part.content}
            className="inline"
          />
        );
      })}
    </div>
  );
};

export default MessageWithMentions;