import React, { useState, useRef, useEffect } from "react";
import { Upload, Eye, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const Header = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
      case "/chat":
        return "Messages";
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
      case "/chat":
        return "Connect with your team in real-time";
      case "/tasks":
        return "Manage and track your video editing tasks";
      case "/team":
        return "Manage team members and permissions";
      default:
        return "";
    }
  };

  const showActionButtons = () => {
    return location.pathname === "/dashboard" || location.pathname === "/tasks";
  };

  const ActionButton = ({ onClick, icon: Icon, children, variant = "primary" }) => (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
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
    <div className="px-6 py-4">
      <div className="flex flex-col">
        {/* Title Section */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {getPageTitle()}
          </h1>
          {getPageSubtitle() && (
            <p className="text-sm text-gray-500 mt-1 truncate">
              {getPageSubtitle()}
            </p>
          )}
        </div>

        {/* Action buttons - Below header */}
        {showActionButtons() && (
          <div className="flex items-center space-x-3 mt-4">
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
      </div>
    </div>
  );
};

export default Header;