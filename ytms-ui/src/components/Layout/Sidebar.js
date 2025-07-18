import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  Upload, 
  Users, 
  Video,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

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
    if (onNavigate) {
      onNavigate();
    }
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
        { label: "Team", onClick: () => navigate("/team") },
        { label: "My Tasks", onClick: () => navigate("/tasks") },
        ...commonItems,
      ];
    } else {
      roleSpecificItems = [
        { label: "Dashboard", onClick: () => navigate("/dashboard") },
        { label: "Team", onClick: () => navigate("/team") },
        ...commonItems,
      ];
    }

    return (
      <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-md shadow-lg border border-gray-200 z-50">
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

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Task Board',
      href: '/tasks',
      icon: KanbanSquare,
      current: location.pathname === '/tasks'
    },
    {
      name: 'Upload Video',
      href: '/upload',
      icon: Upload,
      current: location.pathname === '/upload'
    },
    {
      name: 'Team',
      href: '/team',
      icon: Users,
      current: location.pathname === '/team'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: location.pathname === '/settings'
    }
  ];

  const handleNavigation = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="flex flex-col w-full lg:w-64 bg-white shadow-lg border-r border-gray-200 h-full">
      {/* Logo - Only visible on desktop */}
      <div className="hidden lg:flex items-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-xl">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">YTManager</h1>
            <p className="text-sm text-gray-500">Video Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-1">
        
          
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            NAVIGATION
          </h3>
          
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={handleNavigation}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-3 lg:py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    item.current ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;