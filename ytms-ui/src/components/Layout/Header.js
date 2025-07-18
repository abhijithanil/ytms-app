import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, Upload, Eye, ChevronDown, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const dropdownRef = useRef(null);

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/dashboard":
        return `Welcome back, ${user?.username}!`;
      case "/tasks":
        return "Task Board";
      case "/upload":
        return "Create New Task";
      case "/team":
        return "Team";
      case "/settings":
        return "Settings";
      default:
        return "YTManager";
    }
  };

  const getPageSubtitle = () => {
    switch (location.pathname) {
      case "/dashboard":
        return new Date().toLocaleDateString("en-US", {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
      default:
        return "";
    }
  };

  const showActionButtons = () => {
    return location.pathname === "/dashboard" || location.pathname === "/tasks";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const renderDropdown = () => {
    if (!isDropdownOpen) return null;

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
        { label: "My Profile", onClick: () => navigate("/settings") },
        ...commonItems,
      ];
    }

    return (
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
        <div className="py-1">
          {roleSpecificItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                setIsDropdownOpen(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const ActionButton = ({ onClick, icon: Icon, children, variant = "primary" }) => (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${variant === "primary" 
          ? "bg-primary-600 text-white hover:bg-primary-700" 
          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        }
      `}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{children}</span>
    </button>
  );

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
              {getPageTitle()}
            </h1>
            {getPageSubtitle() && (
              <p className="text-sm text-gray-500 mt-1 hidden sm:block">
                {getPageSubtitle()}
              </p>
            )}
          </div>

          {/* Right side - Actions and profile */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search - Desktop */}
            {(location.pathname === "/tasks" || location.pathname === "/dashboard") && (
              <>
                <div className="hidden md:block flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Search - Mobile */}
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="md:hidden p-2 text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Action buttons */}
            {showActionButtons() && (
              <div className="flex items-center space-x-2">
                {location.pathname === "/dashboard" && (
                  <>
                    <ActionButton
                      onClick={() => navigate("/upload")}
                      icon={Upload}
                    >
                      Upload Video
                    </ActionButton>
                    <ActionButton
                      onClick={() => navigate("/tasks")}
                      icon={Eye}
                      variant="secondary"
                    >
                      View Board
                    </ActionButton>
                  </>
                )}
                
                {location.pathname === "/tasks" && (
                  <ActionButton
                    onClick={() => navigate("/upload")}
                    icon={Plus}
                  >
                    New Task
                  </ActionButton>
                )}
              </div>
            )}

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500"></span>
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="flex items-center justify-center w-8 h-8 bg-primary-600 rounded-full text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.username || "Anonymous"}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role?.toLowerCase() || "User"}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform ${
                    isDropdownOpen ? "transform rotate-180" : ""
                  }`}
                />
              </button>
              {renderDropdown()}
            </div>
          </div>
        </div>
        
        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="mt-4 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;