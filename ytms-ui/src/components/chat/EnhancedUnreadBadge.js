import React from 'react';

const EnhancedUnreadBadge = ({ count, variant = 'default', size = 'sm', className = '' }) => {
  if (!count || count === 0) return null;

  const getVariantClasses = () => {
    switch (variant) {
      case 'mention':
        return 'bg-red-600 text-white ring-2 ring-red-100';
      case 'urgent':
        return 'bg-orange-500 text-white ring-2 ring-orange-100 animate-pulse';
      case 'muted':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-red-500 text-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'text-xs px-1.5 py-0.5 min-w-[1rem] h-4';
      case 'sm':
        return 'text-xs px-2 py-0.5 min-w-[1.25rem] h-5';
      case 'md':
        return 'text-sm px-2.5 py-1 min-w-[1.5rem] h-6';
      default:
        return 'text-xs px-2 py-0.5 min-w-[1.25rem] h-5';
    }
  };

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <span 
      className={`
        inline-flex items-center justify-center 
        rounded-full font-medium 
        ${getVariantClasses()} 
        ${getSizeClasses()} 
        ${className}
      `}
      title={`${count} unread message${count > 1 ? 's' : ''}`}
    >
      {displayCount}
    </span>
  );
};

export default EnhancedUnreadBadge;