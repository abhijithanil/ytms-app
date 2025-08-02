// Desktop notification service for Slack-like notifications
class NotificationService {
  constructor() {
    this.permission = 'default';
    this.isSupported = 'Notification' in window;
    this.requestPermission();
  }

  async requestPermission() {
    if (!this.isSupported) {
      console.warn('Desktop notifications not supported');
      return false;
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission === 'granted';
  }

  showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      return null;
    }

    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'ytms-chat',
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);
      
      // Auto-close after 5 seconds unless requireInteraction is true
      if (!defaultOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }

  showChatMessage(message, roomName) {
    const title = roomName ? `${roomName}` : 'Direct Message';
    const body = `${message.senderName || message.senderUsername}: ${message.content}`;
    
    return this.showNotification(title, {
      body,
      icon: '/favicon.ico',
      tag: `chat-${message.chatRoomId || 'global'}`,
      data: {
        messageId: message.id,
        roomId: message.chatRoomId,
        type: 'chat-message'
      }
    });
  }

  showMention(message, roomName) {
    const title = `💬 Mention in ${roomName || 'Chat'}`;
    const body = `${message.senderName || message.senderUsername}: ${message.content}`;
    
    return this.showNotification(title, {
      body,
      icon: '/favicon.ico',
      tag: `mention-${message.chatRoomId || 'global'}`,
      requireInteraction: true,
      data: {
        messageId: message.id,
        roomId: message.chatRoomId,
        type: 'mention'
      }
    });
  }

  showDirectMessage(message, senderName) {
    const title = `💬 ${senderName || message.senderUsername}`;
    const body = message.content;
    
    return this.showNotification(title, {
      body,
      icon: '/favicon.ico',
      tag: `dm-${message.senderId}`,
      requireInteraction: true,
      data: {
        messageId: message.id,
        roomId: message.chatRoomId,
        type: 'direct-message'
      }
    });
  }

  showRoomInvite(roomName, inviterName) {
    const title = `🎉 Room Invitation`;
    const body = `${inviterName} invited you to join ${roomName}`;
    
    return this.showNotification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'room-invite',
      requireInteraction: true,
      data: {
        type: 'room-invite'
      }
    });
  }

  // Check if notifications should be shown (e.g., page is not visible)
  shouldShowNotification() {
    // Don't show notifications if the page is visible and focused
    return document.hidden || !document.hasFocus();
  }

  // Clear all notifications
  clearAllNotifications() {
    // This is not directly supported by the Notification API
    // but we can track notifications and close them individually
    console.log('Clearing all notifications');
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;