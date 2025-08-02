import React, { useState } from 'react';
import ChatMessage from '../components/chat/ChatMessage';
import MessageWithMentions from '../components/chat/MessageWithMentions';
import FormattingHelp from '../components/chat/FormattingHelp';
import UserMentionInput from '../components/chat/UserMentionInput';

// Demo page to showcase the enhanced chat features
const ChatDemo = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      senderId: 1,
      senderName: 'John Doe',
      senderUsername: 'john',
      content: 'Hey everyone! Check out this **bold text** and *italic text*!',
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      type: 'CHAT',
      reactions: [
        { emoji: '👍', count: 3, userIds: [2, 3, 4] },
        { emoji: '❤️', count: 1, userIds: [2] }
      ]
    },
    {
      id: 2,
      senderId: 2,
      senderName: 'Jane Smith',
      senderUsername: 'jane',
      content: 'I love the new formatting! `console.log("hello world")` works great.',
      createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      type: 'CHAT',
      reactions: [
        { emoji: '😂', count: 2, userIds: [1, 3] }
      ]
    },
    {
      id: 3,
      senderId: 3,
      senderName: 'Current User',
      senderUsername: 'currentuser',
      content: '@john thanks for the demo! Here\'s a code block:\n\n```\nfunction enhance() {\n  return "amazing chat features";\n}\n```',
      createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
      type: 'CHAT',
      edited: true
    },
    {
      id: 4,
      senderId: 1,
      senderName: 'John Doe',
      senderUsername: 'john',
      content: '@currentuser This looks **amazing**! 🎉',
      createdAt: new Date().toISOString(),
      type: 'CHAT'
    }
  ]);

  const onlineUsers = [
    { userId: 1, username: 'john', displayName: 'John Doe', status: 'online' },
    { userId: 2, username: 'jane', displayName: 'Jane Smith', status: 'online' },
    { userId: 3, username: 'currentuser', displayName: 'Current User', status: 'online' }
  ];

  const currentUserId = 3;

  const handleSendMessage = (content) => {
    const newMessage = {
      id: messages.length + 1,
      senderId: currentUserId,
      senderName: 'Current User',
      senderUsername: 'currentuser',
      content,
      createdAt: new Date().toISOString(),
      type: 'CHAT'
    };
    setMessages([...messages, newMessage]);
    return true;
  };

  const handleReaction = (messageId, emoji) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find(r => r.emoji === emoji);
          
          if (existingReaction) {
            // Toggle user reaction
            if (existingReaction.userIds.includes(currentUserId)) {
              existingReaction.userIds = existingReaction.userIds.filter(id => id !== currentUserId);
              existingReaction.count = existingReaction.userIds.length;
            } else {
              existingReaction.userIds.push(currentUserId);
              existingReaction.count = existingReaction.userIds.length;
            }
            
            // Remove reaction if no users
            return {
              ...msg,
              reactions: reactions.filter(r => r.count > 0)
            };
          } else {
            // Add new reaction
            return {
              ...msg,
              reactions: [...reactions, { emoji, count: 1, userIds: [currentUserId] }]
            };
          }
        }
        return msg;
      })
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold mb-2">Enhanced Chat Features Demo</h1>
            <p className="text-blue-100">
              Showcasing message reactions, formatting, and improved UI
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="bg-blue-50 p-4 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <span className="text-2xl mr-2">✨</span>
                <div>
                  <div className="font-medium">Message Reactions</div>
                  <div className="text-gray-600">Hover over messages to react</div>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">🎨</span>
                <div>
                  <div className="font-medium">Rich Formatting</div>
                  <div className="text-gray-600">**bold**, *italic*, `code`</div>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">💬</span>
                <div>
                  <div className="font-medium">Enhanced UI</div>
                  <div className="text-gray-600">Modern chat experience</div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto bg-gray-50">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
                currentUserId={currentUserId}
                onlineUsers={onlineUsers}
                onReaction={handleReaction}
                onEdit={(msg) => console.log('Edit message:', msg)}
                onDelete={(id) => console.log('Delete message:', id)}
                onReply={(msg) => console.log('Reply to message:', msg)}
              />
            ))}
          </div>

          {/* Input */}
          <UserMentionInput
            onSendMessage={handleSendMessage}
            onStartTyping={() => console.log('Started typing')}
            onStopTyping={() => console.log('Stopped typing')}
            connected={true}
            onlineUsers={onlineUsers}
            placeholder="Try typing **bold**, *italic*, `code`, or @username..."
          />

          {/* Examples */}
          <div className="bg-gray-50 p-4 border-t">
            <h3 className="font-semibold mb-3">Try these formatting examples:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-white p-3 rounded border">
                <div className="font-mono text-blue-600 mb-1">**This is bold text**</div>
                <div className="text-gray-600">Renders as: <strong>This is bold text</strong></div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="font-mono text-blue-600 mb-1">*This is italic*</div>
                <div className="text-gray-600">Renders as: <em>This is italic</em></div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="font-mono text-blue-600 mb-1">`code here`</div>
                <div className="text-gray-600">Renders as: <code className="bg-gray-200 px-1 rounded">code here</code></div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="font-mono text-blue-600 mb-1">@username</div>
                <div className="text-gray-600">Mentions users with highlighting</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatDemo;