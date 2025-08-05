import React from 'react';

const MessageWithMentions = ({ content, currentUserId, onlineUsers = [] }) => {
  // Safety checks
  if (!content) {
    return <span></span>;
  }

  if (typeof content !== 'string') {
    return <span>{String(content)}</span>;
  }

  // Ensure onlineUsers is an array
  const safeOnlineUsers = Array.isArray(onlineUsers) ? onlineUsers : [];

  // Parse message content to identify mentions and emojis
  const parseMessageContent = (text) => {
    // Updated regex to handle both @username mentions and emoji rendering
    const mentionAndEmojiRegex = /@(\w+)|(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionAndEmojiRegex.exec(text)) !== null) {
      // Add text before mention/emoji
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }

      if (match[1]) {
        // This is a mention (@username)
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
      } else if (match[2]) {
        // This is an emoji
        parts.push({
          type: 'emoji',
          content: match[2]
        });
      }

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
    <span 
      className="whitespace-pre-wrap break-words"
      style={{ 
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
        fontSize: '14px',
        lineHeight: '1.5'
      }}
    >
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
        } else if (part.type === 'emoji') {
          return (
            <span
              key={index}
              className="inline-block"
              style={{
                fontSize: '18px',
                fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                lineHeight: '1.2'
              }}
            >
              {part.content}
            </span>
          );
        }
        
        return (
          <span key={index}>
            {part.content}
          </span>
        );
      })}
    </span>
  );
};

export default MessageWithMentions;