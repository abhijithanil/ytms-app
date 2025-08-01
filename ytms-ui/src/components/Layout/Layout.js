import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatWidget from '../chat/ChatWidget';
import { Menu, X, ChevronDown, Bell, MessageCircle, Users, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRoomChat } from '../../hook/useRoomChat'; 

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3); // Example count
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const profileDropdownRef = useRef(null);

  // Enhanced chat integration
  const { rooms, loading: chatLoading } = useRoomChat();
  const chatNotificationCount = rooms?.totalUnreadCount || 0;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const toggleChatPanel = () => {
    setIsChatPanelOpen(!isChatPanelOpen);
  };

  const openFullChat = () => {
    navigate('/chat');
    setIsChatPanelOpen(false); // Close panel when opening full chat
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    
    if (isProfileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  const handleProfileDropdownToggle = (e) => {
    e.stopPropagation();
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleProfileDropdownItemClick = (action) => {
    setIsProfileDropdownOpen(false);
    action();
  };

  const renderProfileDropdown = () => {
    if (!isProfileDropdownOpen) return null;

    const commonItems = [
      { label: "Settings", onClick: () => navigate("/settings") },
      { label: "Log out", onClick: logout },
    ];

    let roleSpecificItems = [];
    if (user?.role === "ADMIN") {
      roleSpecificItems = [
        { label: "Dashboard", onClick: () => navigate("/dashboard") },
        { label: "Team Management", onClick: () => navigate("/team") },
        { label: "Messages", onClick: () => navigate("/chat"), icon: MessageCircle },
        ...commonItems,
      ];
    } else if (user?.role === "EDITOR") {
      roleSpecificItems = [
        { label: "Dashboard", onClick: () => navigate("/dashboard") },
        { label: "My Tasks", onClick: () => navigate("/tasks") },
        { label: "Messages", onClick: () => navigate("/chat"), icon: MessageCircle },
        ...commonItems,
      ];
    } else {
      roleSpecificItems = [
        { label: "Dashboard", onClick: () => navigate("/dashboard") },
        { label: "Messages", onClick: () => navigate("/chat"), icon: MessageCircle },
        ...commonItems,
      ];
    }

    return (
      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
        <div className="py-1">
          {roleSpecificItems.map((item, index) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  handleProfileDropdownItemClick(item.onClick);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
              >
                {ItemIcon && <ItemIcon className="h-4 w-4 mr-2" />}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Don't show chat widget on the dedicated chat page
  const showChatWidget = location.pathname !== '/chat';
  const isOnChatPage = location.pathname === '/chat';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={closeSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <Sidebar onNavigate={closeSidebar} />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header with Menu Button, Chat, Notification Bell and Profile */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <h1 className="text-lg font-semibold">YTManager</h1>

          {/* Right side container with chat, notification bell and profile */}
          <div className="flex items-center space-x-2">
            {/* Mobile Chat Button */}
            <button 
              onClick={openFullChat}
              className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors"
              title="Messages"
            >
              <MessageCircle className="h-5 w-5" />
              {chatNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {chatNotificationCount > 9 ? '9+' : chatNotificationCount}
                </span>
              )}
            </button>

            {/* Mobile Notification Bell */}
            <button 
              className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {/* Mobile Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={handleProfileDropdownToggle}
              >
                <div className="flex items-center justify-center w-8 h-8 bg-primary-600 rounded-full text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.username || "Anonymous"}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role?.toLowerCase() || "User"}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform ${
                    isProfileDropdownOpen ? "transform rotate-180" : ""
                  }`}
                />
              </button>
              {renderProfileDropdown()}
            </div>
          </div>
        </div>
        
        {/* Desktop Header - FIXED: Clean header with separate chat controls */}
        <div className="hidden lg:block">
          <div className="flex bg-white border-b border-gray-200">
            {/* Main Header Content */}
            <div className="flex-1">
              <Header />
            </div>

            {/* Chat and User Controls - Separate Section */}
            <div className="flex items-center px-6 py-4 space-x-4 border-l border-gray-200">
              {/* Chat Toggle Button (only show if not on chat page) */}
              {!isOnChatPage && (
                <button
                  onClick={toggleChatPanel}
                  className={`relative p-2 transition-colors rounded-lg ${
                    isChatPanelOpen 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'
                  }`}
                  title={isChatPanelOpen ? "Close Chat Panel" : "Open Chat Panel"}
                >
                  <MessageCircle className="h-5 w-5" />
                  {chatNotificationCount > 0 && !isChatPanelOpen && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                      {chatNotificationCount > 9 ? '9+' : chatNotificationCount}
                    </span>
                  )}
                </button>
              )}

              {/* Full Chat Button */}
              <button
                onClick={openFullChat}
                className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isOnChatPage
                    ? 'border-blue-500 text-blue-700 bg-blue-50'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                {isOnChatPage ? (
                  <>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat Active
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Open Chat
                  </>
                )}
              </button>

              {/* Notification Bell */}
              <button 
                className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors rounded-lg hover:bg-gray-100"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>

              {/* Desktop Profile Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={handleProfileDropdownToggle}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-primary-600 rounded-full text-white text-sm font-medium">
                    {user?.username?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.username || "Anonymous"}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.role?.toLowerCase() || "User"}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform ${
                      isProfileDropdownOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </button>
                {renderProfileDropdown()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content with Optional Chat Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Page Content */}
          <main className={`flex-1 overflow-y-auto transition-all duration-300 ${
            isChatPanelOpen && !isOnChatPage ? 'lg:mr-80' : ''
          }`}>
            <div className="p-4 lg:p-6 max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          {/* Desktop Chat Side Panel (only show if not on chat page) */}
          {isChatPanelOpen && !isOnChatPage && (
            <div className="hidden lg:block w-80 bg-white border-l border-gray-200 flex-shrink-0 z-30">
              <div className="h-full flex flex-col">
                {/* Chat Panel Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-900">Team Chat</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={openFullChat}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
                      title="Open in full view"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsChatPanelOpen(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
                      title="Close chat panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Chat Panel Content */}
                <div className="flex-1 overflow-hidden">
                  <ChatWidget 
                    taskId={null} 
                    isEmbedded={true}
                    onOpenFullChat={openFullChat}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Widget (shows when panel is closed and not on chat page) */}
      {showChatWidget && !isChatPanelOpen && (
        <ChatWidget 
          taskId={null}
          onOpenFullChat={openFullChat}
        />
      )}

      {/* Chat Panel Mobile Overlay (alternative to widget on mobile) */}
      {isChatPanelOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white">
          <div className="h-full flex flex-col">
            {/* Mobile Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-500 text-white">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <h3 className="font-semibold">Team Chat</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={openFullChat}
                  className="p-1 text-white hover:bg-blue-600 transition-colors rounded"
                  title="Open full chat"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsChatPanelOpen(false)}
                  className="p-1 text-white hover:bg-blue-600 transition-colors rounded"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mobile Chat Content */}
            <div className="flex-1 overflow-hidden">
              <ChatWidget 
                taskId={null} 
                isEmbedded={true}
                onOpenFullChat={openFullChat}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;