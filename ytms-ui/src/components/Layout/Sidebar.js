import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  Upload, 
  Users, 
  Video,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

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
    }
  ];

  const quickStats = [
    { name: 'Active Tasks', count: 0, color: 'text-blue-600' },
    { name: 'In Review', count: 0, color: 'text-yellow-600' },
    { name: 'Ready', count: 0, color: 'text-green-600' }
  ];

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-xl">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">YTManager</h1>
            <p className="text-sm text-gray-500">Video Management Studio</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
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
                className={({ isActive }) =>
                  `sidebar-item group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon
                  className={`mr-3 h-5 w-5 ${
                    item.current ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </NavLink>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            QUICK STATS
          </h3>
          
          <div className="space-y-2">
            {quickStats.map((stat) => (
              <div key={stat.name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-gray-600">{stat.name}</span>
                <span className={`font-semibold ${stat.color}`}>{stat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-full text-white font-medium">
            {user?.username?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.username || 'Anonymous'}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role?.toLowerCase() || 'User'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;