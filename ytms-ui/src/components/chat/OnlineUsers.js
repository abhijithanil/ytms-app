import React from 'react';
import { Users, Circle } from 'lucide-react';

const OnlineUsers = ({ users, className = '' }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'away': return 'text-yellow-500';
      case 'busy': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getInitials = (name, username) => {
    if (name && name.includes(' ')) {
      const parts = name.split(' ');
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return username ? username[0].toUpperCase() : '?';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 h-full flex flex-col ${className}`}>
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">
            Online ({users.length})
          </h3>
        </div>
      </div>

      <div className="p-2 flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No one online</p>
          </div>
        ) : (
          <div className="space-y-1">
            {users.map((user) => (
              <div key={user.userId} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {getInitials(user.displayName, user.username)}
                  </div>
                  <Circle className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${getStatusColor(user.status)} fill-current`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    @{user.username}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineUsers;