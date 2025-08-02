import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    if (notification.type === 'mention') {
      toast(`💬 ${notification.title}`, {
        duration: 5000,
        style: {
          background: '#FEF3C7',
          color: '#92400E',
          border: '1px solid #F59E0B'
        }
      });
    } else if (notification.type === 'dm') {
      toast(`📨 ${notification.title}`, {
        duration: 4000,
        style: {
          background: '#DBEAFE',
          color: '#1E40AF',
          border: '1px solid #3B82F6'
        }
      });
    } else {
      toast(notification.title, {
        duration: 3000
      });
    }

    // Show browser notification if permission granted
    if (Notification.permission === 'granted' && !document.hasFocus()) {
      const browserNotification = new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico',
        tag: notification.id
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.onClick) {
          notification.onClick();
        }
        browserNotification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => browserNotification.close(), 5000);
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Utility functions for specific notification types
  const notifyMention = (user, message, chatRoom, onClick) => {
    addNotification({
      type: 'mention',
      title: `${user} mentioned you`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      chatRoom: chatRoom,
      onClick: onClick
    });
  };

  const notifyDirectMessage = (user, message, onClick) => {
    addNotification({
      type: 'dm',
      title: `New message from ${user}`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      onClick: onClick
    });
  };

  const notifyReaction = (user, emoji, message) => {
    addNotification({
      type: 'reaction',
      title: `${user} reacted with ${emoji}`,
      body: message.length > 50 ? message.substring(0, 50) + '...' : message
    });
  };

  const notifyTaskUpdate = (taskName, update, onClick) => {
    addNotification({
      type: 'task',
      title: `Task Update: ${taskName}`,
      body: update,
      onClick: onClick
    });
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    notifyMention,
    notifyDirectMessage,
    notifyReaction,
    notifyTaskUpdate
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;