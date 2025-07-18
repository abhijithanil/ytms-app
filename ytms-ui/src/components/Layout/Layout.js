import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { Menu, X, ChevronDown, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3); // Example count
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const profileDropdownRef = useRef(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
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
        ...commonItems,
      ];
    } else if (user?.role === "EDITOR") {
      roleSpecificItems = [
        { label: "Dashboard", onClick: () => navigate("/dashboard") },
        { label: "My Tasks", onClick: () => navigate("/tasks") },
        ...commonItems,
      ];
    } else {
      roleSpecificItems = [
        { label: "Dashboard", onClick: () => navigate("/dashboard") },
        ...commonItems,
      ];
    }

    return (
      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
        <div className="py-1">
          {roleSpecificItems.map((item, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                handleProfileDropdownItemClick(item.onClick);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

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
        {/* Mobile Header with Menu Button, Notification Bell and Profile */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <h1 className="text-lg font-semibold">YTManager</h1>

          {/* Right side container with notification bell and profile */}
          <div className="flex items-center space-x-2">
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
        
        {/* Desktop Header */}
        <div className="hidden lg:block">
          <Header />
        </div>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;