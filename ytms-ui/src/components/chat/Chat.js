import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatRoomsSidebar from '../components/chat/ChatRoomsSidebar';
import RoomChatPanel from '../components/chat/RoomChatPanel';
import CreateDirectMessageModal from '../components/chat/CreateDirectMessageModal';
import CreateGroupChatModal from '../components/chat/CreateGroupChatModal';
import { MessageCircle, Users, Plus } from 'lucide-react';

const Chat = () => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showCreateDMModal, setShowCreateDMModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  const handleRoomSelect = (room) => {
    console.log('Selected room:', room);
    setSelectedRoom(room);
  };

  const handleCreateDirectMessage = () => {
    setShowCreateDMModal(true);
  };

  const handleCreateGroupChat = () => {
    setShowCreateGroupModal(true);
  };

  const handleDirectMessageCreated = (newRoom) => {
    setSelectedRoom(newRoom);
    setShowCreateDMModal(false);
  };

  const handleGroupChatCreated = (newRoom) => {
    setSelectedRoom(newRoom);
    setShowCreateGroupModal(false);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-1">Connect with your team in real-time</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCreateDirectMessage}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              New Message
            </button>
            
            <button
              onClick={handleCreateGroupChat}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Users className="h-4 w-4 mr-2" />
              New Channel
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ChatRoomsSidebar
          selectedRoomId={selectedRoom?.id}
          onRoomSelect={handleRoomSelect}
          currentUserId={user?.id}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedRoom ? (
            <RoomChatPanel
              room={selectedRoom}
              currentUserId={user?.id}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Select a conversation
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a conversation from the sidebar to start messaging.
                </p>
                <div className="mt-6 flex justify-center space-x-3">
                  <button
                    onClick={handleCreateDirectMessage}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    New Message
                  </button>
                  <button
                    onClick={handleCreateGroupChat}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Create Channel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateDMModal && (
        <CreateDirectMessageModal
          onClose={() => setShowCreateDMModal(false)}
          onDirectMessageCreated={handleDirectMessageCreated}
        />
      )}

      {showCreateGroupModal && (
        <CreateGroupChatModal
          onClose={() => setShowCreateGroupModal(false)}
          onGroupChatCreated={handleGroupChatCreated}
        />
      )}
    </div>
  );
};

export default Chat;