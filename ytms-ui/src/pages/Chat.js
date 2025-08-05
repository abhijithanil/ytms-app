import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatRoomsSidebar from '../components/chat/ChatRoomsSidebar';
import RoomChatPanel from '../components/chat/RoomChatPanel';
import CreateDirectMessageModal from '../components/chat/CreateDirectMessageModal ';
import CreateGroupChatModal from '../components/chat/CreateGroupChatModal ';
import { MessageCircle, Users, Plus, Menu, X } from 'lucide-react';

const Chat = () => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showCreateDMModal, setShowCreateDMModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  console.log('🎯 Chat: Render', {
    currentUserId: user?.id,
    selectedRoomId: selectedRoom?.id,
    isMobileSidebarOpen,
  });

  const handleRoomSelect = (room) => {
    console.log('Selected room:', room);
    setSelectedRoom(room);
    // Close mobile sidebar when room is selected
    setIsMobileSidebarOpen(false);
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

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileSidebarOpen && window.innerWidth < 768) {
        const sidebar = document.getElementById('mobile-chat-sidebar');
        if (sidebar && !sidebar.contains(event.target) && !event.target.closest('.mobile-menu-toggle')) {
          setIsMobileSidebarOpen(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileSidebarOpen]);

  // Close mobile sidebar on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleMobileSidebar}
            className="mobile-menu-toggle p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isMobileSidebarOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {selectedRoom ? selectedRoom.displayName || selectedRoom.roomName : 'Messages'}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCreateDirectMessage}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="New Message"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            onClick={handleCreateGroupChat}
            className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            title="New Channel"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-1">Connect with your team in real-time</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCreateDirectMessage}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              New Message
            </button>
            
            <button
              onClick={handleCreateGroupChat}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Users className="h-4 w-4 mr-2" />
              New Channel
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" />
        )}

        {/* Sidebar */}
        <div
          id="mobile-chat-sidebar"
          className={`
            md:relative md:translate-x-0 md:w-80 md:flex-shrink-0
            ${isMobileSidebarOpen 
              ? 'fixed inset-y-0 left-0 w-80 z-50 transform translate-x-0' 
              : 'fixed inset-y-0 left-0 w-80 z-50 transform -translate-x-full'
            }
            transition-transform duration-300 ease-in-out
            md:transition-none
          `}
        >
          <ChatRoomsSidebar
            selectedRoomId={selectedRoom?.id}
            onRoomSelect={handleRoomSelect}
            currentUserId={user?.id}
          />
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
          {selectedRoom ? (
            <RoomChatPanel
              room={selectedRoom}
              currentUserId={user?.id}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
              <div className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-500 mb-6">
                  Choose a conversation from the sidebar to start messaging, or create a new one.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleCreateDirectMessage}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    New Message
                  </button>
                  <button
                    onClick={handleCreateGroupChat}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
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