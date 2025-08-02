import React, { useState, useEffect } from 'react';
import { NotificationProvider } from '../context/NotificationContext';
import EnhancedChatPanel from '../components/chat/EnhancedChatPanel';
import ChatRoomsSidebar from '../components/chat/ChatRoomsSidebar';
import NotificationBell from '../components/chat/NotificationBell';
import { useAuth } from '../context/AuthContext';

const ChatIntegrationExample = () => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [stompClient, setStompClient] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Mock data for demonstration
  const mockRooms = [
    {
      id: 1,
      roomName: 'General',
      roomType: 'GROUP_CHAT',
      memberCount: 5,
      description: 'General team discussion',
      lastMessageAt: new Date()
    },
    {
      id: 2,
      roomName: 'Video Editing Project',
      roomType: 'TASK_CHAT',
      memberCount: 3,
      description: 'Task-specific chat for video editing',
      lastMessageAt: new Date()
    }
  ];

  const mockMessages = [
    {
      id: 1,
      content: 'Hello team! How is the **video editing** going?',
      senderId: 1,
      senderUsername: 'john_doe',
      senderName: 'John Doe',
      createdAt: new Date(Date.now() - 3600000),
      reactions: '{"👍":[2,3],"❤️":[2]}',
      isEdited: false
    },
    {
      id: 2,
      content: 'Great progress! The `final cut` looks amazing. @jane_smith what do you think?',
      senderId: 2,
      senderUsername: 'mike_wilson',
      senderName: 'Mike Wilson',
      createdAt: new Date(Date.now() - 1800000),
      reactions: '{}',
      isEdited: false
    },
    {
      id: 3,
      content: 'I agree! The transitions are *smooth* and the color grading is perfect. 🎨',
      senderId: 3,
      senderUsername: 'jane_smith',
      senderName: 'Jane Smith',
      createdAt: new Date(Date.now() - 900000),
      reactions: '{"🎨":[1,2]}',
      isEdited: false
    }
  ];

  const handleSendMessage = (messageData) => {
    const newMessage = {
      id: Date.now(),
      content: messageData.content,
      senderId: user?.id || 1,
      senderUsername: user?.username || 'current_user',
      senderName: user?.name || 'Current User',
      createdAt: new Date(),
      reactions: '{}',
      isEdited: false,
      ...messageData
    };

    setMessages(prev => [...prev, newMessage]);

    // Simulate real-time message broadcasting here
    console.log('Sending message:', newMessage);
  };

  const handleFileUpload = async (file) => {
    // Simulate file upload
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          url: URL.createObjectURL(file),
          name: file.name,
          type: file.type
        });
      }, 1000);
    });
  };

  const handleAddReaction = (messageId, emoji) => {
    setMessages(prev => prev.map(message => {
      if (message.id === messageId) {
        const reactions = JSON.parse(message.reactions || '{}');
        const userId = user?.id || 1;
        
        if (reactions[emoji]) {
          if (reactions[emoji].includes(userId)) {
            reactions[emoji] = reactions[emoji].filter(id => id !== userId);
            if (reactions[emoji].length === 0) {
              delete reactions[emoji];
            }
          } else {
            reactions[emoji].push(userId);
          }
        } else {
          reactions[emoji] = [userId];
        }

        return {
          ...message,
          reactions: JSON.stringify(reactions)
        };
      }
      return message;
    }));

    console.log('Reaction toggled:', { messageId, emoji });
  };

  useEffect(() => {
    // Set default room and messages
    if (mockRooms.length > 0) {
      setSelectedRoom(mockRooms[0]);
      setMessages(mockMessages);
    }
  }, []);

  return (
    <NotificationProvider>
      <div className="h-screen flex bg-gray-100">
        {/* Sidebar with chat rooms */}
        <div className="w-80 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">YTMS Chat</h1>
              <NotificationBell />
            </div>
          </div>
          
          <ChatRoomsSidebar
            rooms={mockRooms}
            selectedRoom={selectedRoom}
            onRoomSelect={setSelectedRoom}
            onlineUsers={onlineUsers}
          />
        </div>

        {/* Main chat area */}
        <div className="flex-1">
          <EnhancedChatPanel
            room={selectedRoom}
            messages={messages}
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileUpload}
            onAddReaction={handleAddReaction}
            typingUsers={typingUsers}
            stompClient={stompClient}
            onlineUsers={onlineUsers}
          />
        </div>
      </div>

      {/* Demo Information Panel */}
      <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <h3 className="font-semibold mb-2">🚀 Enhanced Chat Features</h3>
        <ul className="text-sm space-y-1">
          <li>• Rich text with **bold**, *italic*, `code`</li>
          <li>• Emoji reactions 👍❤️🎨</li>
          <li>• File attachments 📎</li>
          <li>• @mentions with notifications</li>
          <li>• Real-time typing indicators</li>
          <li>• WebSocket integration</li>
        </ul>
      </div>
    </NotificationProvider>
  );
};

export default ChatIntegrationExample;