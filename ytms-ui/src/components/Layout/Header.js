import React, { useState, useRef, useEffect } from "react";
import { Bell, Upload, Eye, ChevronDown, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
    
    // Only add listener when dropdown is open
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleDropdownItemClick = (action) => {
    setIsDropdownOpen(false);
    action();
  };

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
                handleDropdownItemClick(item.onClick);
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
          {/* Left side - Title with controlled width */}
          <div className="flex-1 min-w-0" style={{ maxWidth: 'calc(100% - 120px)' }}>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
              {getPageTitle()}
            </h1>
            {getPageSubtitle() && (
              <p className="text-sm text-gray-500 mt-1 hidden sm:block truncate">
                {getPageSubtitle()}
              </p>
            )}
          </div>

          {/* Right side - Fixed width to guarantee space */}
          <div 
            className="flex items-center space-x-1 sm:space-x-2" 
            style={{ 
              width: '120px',
              minWidth: '120px',
              maxWidth: '120px',
              flexShrink: 0,
              flexGrow: 0
            }}
          >
            {/* Notifications - GUARANTEED VISIBLE */}
            <button 
              className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors"
              style={{ 
                width: '40px',
                height: '40px',
                flexShrink: 0,
                flexGrow: 0,
                minWidth: '40px',
                minHeight: '40px'
              }}
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500"></span>
            </button>

            {/* Profile dropdown - GUARANTEED VISIBLE */}
            <div 
              className="relative" 
              ref={dropdownRef}
              style={{ 
                width: '72px',
                minWidth: '72px',
                flexShrink: 0,
                flexGrow: 0
              }}
            >
              <button
                className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={handleDropdownToggle}
                style={{ 
                  width: '100%',
                  height: '40px'
                }}
              >
                <div className="flex items-center justify-center w-8 h-8 bg-primary-600 rounded-full text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || "A"}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform ml-1 ${
                    isDropdownOpen ? "transform rotate-180" : ""
                  }`}
                />
              </button>
              {renderDropdown()}
            </div>
          </div>
        </div>

        {/* Action buttons - Below header */}
        {showActionButtons() && (
          <div className="flex items-center space-x-2 mt-4">
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
            
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;