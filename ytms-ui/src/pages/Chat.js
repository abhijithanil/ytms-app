import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatRoomsSidebar from '../components/chat/ChatRoomsSidebar';
import RoomChatPanel from '../components/chat/RoomChatPanel';
import CreateDirectMessageModal from '../components/chat/CreateDirectMessageModal ';
import CreateGroupChatModal from '../components/chat/CreateGroupChatModal ';
import { MessageCircle, Users, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const Chat = () => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showCreateDMModal, setShowCreateDMModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  console.log('🎯 Chat: Render', {
    currentUserId: user?.id,
    selectedRoomId: selectedRoom?.id,
    isMobile,
    sidebarCollapsed,
    windowWidth: window.innerWidth
  });

  // Handle window resize to detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const wasMobile = isMobile;
      const nowMobile = window.innerWidth < 768;
      setIsMobile(nowMobile);
      
      // Auto-expand sidebar when going from mobile to desktop
      if (wasMobile && !nowMobile && sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, sidebarCollapsed]);

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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header - Responsive for both mobile and desktop */}
      <div className={`flex-shrink-0 bg-white border-b border-gray-200 shadow-sm ${
        isMobile ? 'px-3 py-2' : 'px-6 py-4'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Sidebar toggle for mobile */}
            {isMobile && sidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Show sidebar"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
            
            <div>
              <h1 className={`font-bold text-gray-900 ${
                isMobile ? 'text-lg' : 'text-2xl'
              }`}>
                {isMobile && selectedRoom 
                  ? (selectedRoom.displayName || selectedRoom.roomName || 'Chat')
                  : 'Messages'
                }
              </h1>
              {!isMobile && (
                <p className="text-gray-600 mt-1">Connect with your team in real-time</p>
              )}
            </div>
          </div>
          
          <div className={`flex items-center space-x-2 ${isMobile ? '' : 'space-x-3'}`}>
            <button
              onClick={handleCreateDirectMessage}
              className={`inline-flex items-center border border-gray-300 shadow-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                isMobile 
                  ? 'px-2 py-1.5 text-xs' 
                  : 'px-4 py-2 text-sm'
              }`}
            >
              <MessageCircle className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-2'}`} />
              {isMobile ? 'Message' : 'New Message'}
            </button>
            
            <button
              onClick={handleCreateGroupChat}
              className={`inline-flex items-center border border-transparent font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                isMobile 
                  ? 'px-2 py-1.5 text-xs' 
                  : 'px-4 py-2 text-sm'
              }`}
            >
              <Users className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-2'}`} />
              {isMobile ? 'Channel' : 'New Channel'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Always show both sidebar and chat in a flex layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative chat-layout">
        {/* Sidebar - Collapsible */}
        <div className={`chat-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          {/* Collapse Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="collapse-toggle"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          
          {/* Sidebar Content */}
          <div className="sidebar-content">
            <ChatRoomsSidebar
              selectedRoomId={selectedRoom?.id}
              onRoomSelect={handleRoomSelect}
              currentUserId={user?.id}
              collapsed={sidebarCollapsed}
            />
          </div>
        </div>

        {/* Chat Panel - Takes remaining space */}
        <div className="chat-main">
          {selectedRoom ? (
            <RoomChatPanel
              room={selectedRoom}
              currentUserId={user?.id}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 p-3">
              <div className={`text-center max-w-md mx-auto ${
                isMobile ? 'px-2' : 'px-6'
              }`}>
                <div className={`mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center ${
                  isMobile ? 'w-12 h-12 mb-3' : 'w-20 h-20 mb-6'
                }`}>
                  <MessageCircle className={`text-blue-600 ${
                    isMobile ? 'h-6 w-6' : 'h-10 w-10'
                  }`} />
                </div>
                <h3 className={`font-semibold text-gray-900 mb-2 ${
                  isMobile ? 'text-base' : 'text-xl'
                }`}>
                  Select a conversation
                </h3>
                <p className={`text-gray-500 mb-4 ${
                  isMobile ? 'text-sm mb-3' : 'mb-6'
                }`}>
                  Choose a conversation from the sidebar to start messaging, or create a new one.
                </p>
                <div className={`flex gap-2 justify-center ${
                  isMobile ? 'flex-col' : 'flex-col sm:flex-row gap-3'
                }`}>
                  <button
                    onClick={handleCreateDirectMessage}
                    className={`inline-flex items-center justify-center border border-gray-300 shadow-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors ${
                      isMobile 
                        ? 'px-3 py-2 text-sm' 
                        : 'px-4 py-2 text-sm'
                    }`}
                  >
                    <MessageCircle className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-2'}`} />
                    New Message
                  </button>
                  <button
                    onClick={handleCreateGroupChat}
                    className={`inline-flex items-center justify-center border border-transparent font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors ${
                      isMobile 
                        ? 'px-3 py-2 text-sm' 
                        : 'px-4 py-2 text-sm'
                    }`}
                  >
                    <Users className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-2'}`} />
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