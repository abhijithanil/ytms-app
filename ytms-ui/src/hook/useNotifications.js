import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/NotificationService';

export const useNotifications = (currentRoom, messages, members) => {
  const { user } = useAuth();
  const lastMessageId = useRef(null);

  useEffect(() => {
    if (!user || !messages || messages.length === 0) return;

    // Get the latest message
    const latestMessage = messages[messages.length - 1];
    
    // Skip if it's the same message we already processed
    if (!latestMessage || latestMessage.id === lastMessageId.current) return;
    
    // Skip if it's our own message
    if (latestMessage.senderId === user.id) {
      lastMessageId.current = latestMessage.id;
      return;
    }

    // Skip if notifications shouldn't be shown (page is focused)
    if (!notificationService.shouldShowNotification()) {
      lastMessageId.current = latestMessage.id;
      return;
    }

    const roomName = currentRoom?.displayName || currentRoom?.roomName || 'Chat';
    
    // Check if user is mentioned
    const isMentioned = checkIfUserMentioned(latestMessage, user);
    
    // Show appropriate notification
    if (isMentioned) {
      notificationService.showMention(latestMessage, roomName);
    } else if (currentRoom?.roomType === 'DIRECT_MESSAGE') {
      const senderName = getSenderName(latestMessage, members);
      notificationService.showDirectMessage(latestMessage, senderName);
    } else {
      // Only show group chat notifications for mentions
      // Regular messages in group chats can be too noisy
    }

    lastMessageId.current = latestMessage.id;
  }, [messages, user, currentRoom, members]);

  // Check if user is mentioned in a message
  const checkIfUserMentioned = (message, currentUser) => {
    if (!message.content || !currentUser) return false;
    
    const mentionRegex = new RegExp(`@${currentUser.username}\\b`, 'i');
    return mentionRegex.test(message.content);
  };

  // Get sender display name from members list
  const getSenderName = (message, membersList) => {
    if (!Array.isArray(membersList)) return message.senderName || message.senderUsername;
    
    const sender = membersList.find(member => member.userId === message.senderId);
    return sender?.displayName || sender?.name || message.senderName || message.senderUsername;
  };

  // Manually trigger notification (for testing or special cases)
  const showTestNotification = () => {
    notificationService.showNotification('Test Notification', {
      body: 'This is a test notification from YTMS Chat',
      requireInteraction: false
    });
  };

  return {
    showTestNotification
  };
};