import React from 'react';

const UserPresenceIndicator = ({ status, size = 'sm', showLabel = false, className = '' }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'online':
        return {
          color: 'bg-green-500',
          label: 'Active',
          ring: 'ring-green-200'
        };
      case 'away':
        return {
          color: 'bg-yellow-500',
          label: 'Away',
          ring: 'ring-yellow-200'
        };
      case 'busy':
        return {
          color: 'bg-red-500',
          label: 'Busy',
          ring: 'ring-red-200'
        };
      case 'offline':
      default:
        return {
          color: 'bg-gray-400',
          label: 'Offline',
          ring: 'ring-gray-200'
        };
    }
  };

  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const statusInfo = getStatusInfo();

  if (showLabel) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`${sizeClasses[size]} ${statusInfo.color} rounded-full ring-2 ${statusInfo.ring} ring-opacity-50`} />
        <span className="text-sm text-gray-600">{statusInfo.label}</span>
      </div>
    );
  }

  return (
    <div 
      className={`${sizeClasses[size]} ${statusInfo.color} rounded-full ring-2 ${statusInfo.ring} ring-opacity-50 ${className}`}
      title={statusInfo.label}
    />
  );
};

export default UserPresenceIndicator;