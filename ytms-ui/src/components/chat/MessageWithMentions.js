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

  // Parse message content to identify mentions and formatting
  const parseMessageContent = (text) => {
    // Enhanced regex patterns for mentions and basic formatting
    const patterns = {
      mention: /@(\w+)/g,
      bold: /\*\*(.*?)\*\*/g,
      italic: /\*(.*?)\*/g,
      code: /`(.*?)`/g,
      codeBlock: /```([\s\S]*?)```/g
    };

    const parts = [];
    let lastIndex = 0;
    
    // Find all matches for all patterns
    const allMatches = [];
    
    // Find mentions
    let match;
    while ((match = patterns.mention.exec(text)) !== null) {
      allMatches.push({
        type: 'mention',
        start: match.index,
        end: match.index + match[0].length,
        content: match[0],
        username: match[1]
      });
    }
    
    // Find bold text
    patterns.bold.lastIndex = 0;
    while ((match = patterns.bold.exec(text)) !== null) {
      allMatches.push({
        type: 'bold',
        start: match.index,
        end: match.index + match[0].length,
        content: match[0],
        innerText: match[1]
      });
    }
    
    // Find italic text (but not if it's part of bold)
    patterns.italic.lastIndex = 0;
    while ((match = patterns.italic.exec(text)) !== null) {
      // Check if this italic is part of a bold pattern
      const isBold = allMatches.some(m => 
        m.type === 'bold' && match.index >= m.start && match.index + match[0].length <= m.end
      );
      if (!isBold) {
        allMatches.push({
          type: 'italic',
          start: match.index,
          end: match.index + match[0].length,
          content: match[0],
          innerText: match[1]
        });
      }
    }
    
    // Find code
    patterns.code.lastIndex = 0;
    while ((match = patterns.code.exec(text)) !== null) {
      allMatches.push({
        type: 'code',
        start: match.index,
        end: match.index + match[0].length,
        content: match[0],
        innerText: match[1]
      });
    }
    
    // Find code blocks
    patterns.codeBlock.lastIndex = 0;
    while ((match = patterns.codeBlock.exec(text)) !== null) {
      allMatches.push({
        type: 'codeBlock',
        start: match.index,
        end: match.index + match[0].length,
        content: match[0],
        innerText: match[1]
      });
    }

    // Sort matches by start position
    allMatches.sort((a, b) => a.start - b.start);
    
    // Remove overlapping matches (keep the first one)
    const nonOverlapping = [];
    for (const current of allMatches) {
      const hasOverlap = nonOverlapping.some(existing => 
        (current.start < existing.end && current.end > existing.start)
      );
      if (!hasOverlap) {
        nonOverlapping.push(current);
      }
    }

    // Build parts array
    for (const match of nonOverlapping) {
      // Add text before this match
      if (match.start > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.start)
        });
      }

      // Add the match
      if (match.type === 'mention') {
        const mentionedUser = safeOnlineUsers.find(user => user && user.username === match.username);
        const isCurrentUser = mentionedUser?.userId === currentUserId;
        
        parts.push({
          type: 'mention',
          content: match.content,
          username: match.username,
          isCurrentUser: isCurrentUser,
          userExists: !!mentionedUser
        });
      } else {
        parts.push({
          type: match.type,
          content: match.content,
          innerText: match.innerText
        });
      }

      lastIndex = match.end;
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
    <span className="whitespace-pre-wrap break-words">
      {messageParts.map((part, index) => {
        switch (part.type) {
          case 'mention':
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
          
          case 'bold':
            return (
              <strong key={index} className="font-bold">
                {part.innerText}
              </strong>
            );
          
          case 'italic':
            return (
              <em key={index} className="italic">
                {part.innerText}
              </em>
            );
          
          case 'code':
            return (
              <code key={index} className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
                {part.innerText}
              </code>
            );
          
          case 'codeBlock':
            return (
              <pre key={index} className="bg-gray-800 text-gray-100 p-3 rounded-lg mt-2 mb-2 overflow-x-auto">
                <code className="text-sm font-mono whitespace-pre">
                  {part.innerText}
                </code>
              </pre>
            );
          
          case 'text':
          default:
            return (
              <span key={index}>
                {part.content}
              </span>
            );
        }
      })}
    </span>
  );
};

export default MessageWithMentions;