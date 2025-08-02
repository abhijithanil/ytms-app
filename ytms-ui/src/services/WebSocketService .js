// Enhanced WebSocketService.js - Add to your existing WebSocketService

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnecting = false;
    this.messageQueue = [];
  }

  // ... (keep all your existing methods: connect, setupGlobalSubscriptions, etc.)

  setupGlobalSubscriptions() {
    console.log('🔌 WebSocketService: Setting up global subscriptions');

    this.clearSubscriptions();

    // Global chat messages
    this.subscribe('/topic/chat/global', 'globalChat', (message) => {
      const handler = this.messageHandlers.get('globalChat');
      if (handler) handler(message);
    });

    // Online users updates
    this.subscribe('/topic/users/online', 'onlineUsers', (users) => {
      const handler = this.messageHandlers.get('onlineUsers');
      if (handler) handler(users);
    });

    // User status changes
    this.subscribe('/topic/users/status', 'userStatus', (statusUpdate) => {
      const handler = this.messageHandlers.get('userStatus');
      if (handler) handler(statusUpdate);
    });

    // Global typing indicators
    this.subscribe('/topic/typing/global', 'globalTyping', (typingData) => {
      const handler = this.messageHandlers.get('globalTyping');
      if (handler) handler(typingData);
    });

    // Room updates
    this.subscribe('/topic/rooms/updates', 'roomUpdates', (roomUpdate) => {
      const handler = this.messageHandlers.get('roomUpdates');
      if (handler) handler(roomUpdate);
    });

    // NEW: Message reactions
    this.subscribe('/topic/messages/reactions', 'messageReactions', (reactionUpdate) => {
      const handler = this.messageHandlers.get('messageReactions');
      if (handler) handler(reactionUpdate);
    });

    // NEW: Message updates (edits, deletes)
    this.subscribe('/topic/messages/updates', 'messageUpdates', (messageUpdate) => {
      const handler = this.messageHandlers.get('messageUpdates');
      if (handler) handler(messageUpdate);
    });

    // NEW: User mentions
    this.subscribe('/topic/mentions', 'mentions', (mention) => {
      const handler = this.messageHandlers.get('mentions');
      if (handler) handler(mention);
    });
  }

  // Enhanced room subscription with reaction support
  subscribeToRoom(roomId) {
    if (!this.connected || !roomId) return false;

    console.log(`🔌 WebSocketService: Subscribing to room ${roomId} with enhanced features`);

    // Room messages
    this.subscribe(`/topic/chat/room/${roomId}`, `roomChat_${roomId}`, (message) => {
      const handler = this.messageHandlers.get(`roomChat_${roomId}`);
      if (handler) handler(message);
    });

    // Room typing indicators
    this.subscribe(`/topic/typing/room/${roomId}`, `roomTyping_${roomId}`, (typingData) => {
      const handler = this.messageHandlers.get(`roomTyping_${roomId}`);
      if (handler) handler(typingData);
    });

    // Room member updates
    this.subscribe(`/topic/rooms/${roomId}/members`, `roomMembers_${roomId}`, (memberUpdate) => {
      const handler = this.messageHandlers.get(`roomMembers_${roomId}`);
      if (handler) handler(memberUpdate);
    });

    // Room read status updates
    this.subscribe(`/topic/rooms/${roomId}/read-status`, `roomReadStatus_${roomId}`, (readStatus) => {
      const handler = this.messageHandlers.get(`roomReadStatus_${roomId}`);
      if (handler) handler(readStatus);
    });

    // NEW: Room-specific message reactions
    this.subscribe(`/topic/rooms/${roomId}/reactions`, `roomReactions_${roomId}`, (reactionUpdate) => {
      const handler = this.messageHandlers.get(`roomReactions_${roomId}`);
      if (handler) handler(reactionUpdate);
    });

    // NEW: Room-specific message updates
    this.subscribe(`/topic/rooms/${roomId}/message-updates`, `roomMessageUpdates_${roomId}`, (messageUpdate) => {
      const handler = this.messageHandlers.get(`roomMessageUpdates_${roomId}`);
      if (handler) handler(messageUpdate);
    });

    // NEW: Thread updates for room
    this.subscribe(`/topic/rooms/${roomId}/threads`, `roomThreads_${roomId}`, (threadUpdate) => {
      const handler = this.messageHandlers.get(`roomThreads_${roomId}`);
      if (handler) handler(threadUpdate);
    });

    return true;
  }

  // Unsubscribe from room
  unsubscribeFromRoom(roomId) {
    if (!roomId) return;

    console.log(`🔌 WebSocketService: Unsubscribing from room ${roomId}`);
    
    this.unsubscribe(`/topic/chat/room/${roomId}`);
    this.unsubscribe(`/topic/typing/room/${roomId}`);
    this.unsubscribe(`/topic/rooms/${roomId}/members`);
    this.unsubscribe(`/topic/rooms/${roomId}/read-status`);
    this.unsubscribe(`/topic/rooms/${roomId}/reactions`);
    this.unsubscribe(`/topic/rooms/${roomId}/message-updates`);
    this.unsubscribe(`/topic/rooms/${roomId}/threads`);
  }

  // NEW: Enhanced message sending methods

  // Send message with reaction support metadata
  sendEnhancedMessage(destination, payload) {
    const enhancedPayload = {
      ...payload,
      messageId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      clientVersion: '2.0' // For future compatibility
    };

    return this.sendMessage(destination, enhancedPayload);
  }

  // Send room message with enhanced features
  sendRoomMessage(roomId, payload) {
    return this.sendEnhancedMessage(`/app/chat/room/${roomId}`, payload);
  }

  // Send direct message with enhanced features
  sendDirectMessage(recipientId, payload) {
    return this.sendEnhancedMessage(`/app/chat/direct/${recipientId}`, payload);
  }

  // NEW: Message reaction methods
  sendReaction(messageId, reactionType, roomId = null) {
    const destination = roomId 
      ? `/app/chat/room/${roomId}/react`
      : '/app/chat/react';
    
    return this.sendMessage(destination, {
      messageId: messageId,
      reactionType: reactionType,
      action: 'toggle' // toggle, add, remove
    });
  }

  removeReaction(messageId, reactionType, roomId = null) {
    const destination = roomId 
      ? `/app/chat/room/${roomId}/react`
      : '/app/chat/react';
    
    return this.sendMessage(destination, {
      messageId: messageId,
      reactionType: reactionType,
      action: 'remove'
    });
  }

  // NEW: Message action methods
  editMessage(messageId, newContent, roomId = null) {
    const destination = roomId 
      ? `/app/chat/room/${roomId}/edit`
      : '/app/chat/edit';
    
    return this.sendMessage(destination, {
      messageId: messageId,
      newContent: newContent
    });
  }

  deleteMessage(messageId, roomId = null) {
    const destination = roomId 
      ? `/app/chat/room/${roomId}/delete`
      : '/app/chat/delete';
    
    return this.sendMessage(destination, {
      messageId: messageId
    });
  }

  pinMessage(messageId, roomId) {
    return this.sendMessage(`/app/chat/room/${roomId}/pin`, {
      messageId: messageId,
      action: 'pin'
    });
  }

  unpinMessage(messageId, roomId) {
    return this.sendMessage(`/app/chat/room/${roomId}/pin`, {
      messageId: messageId,
      action: 'unpin'
    });
  }

  // NEW: Thread/reply methods
  sendReply(parentMessageId, content, roomId) {
    return this.sendMessage(`/app/chat/room/${roomId}/reply`, {
      parentMessageId: parentMessageId,
      content: content
    });
  }

  // NEW: Enhanced typing indicators with context
  sendEnhancedTyping(isTyping, roomId = null, context = {}) {
    const destination = roomId 
      ? `/app/typing/room/${roomId}`
      : '/app/typing/global';
    
    return this.sendMessage(destination, {
      isTyping: isTyping,
      context: context, // Can include reply context, etc.
      timestamp: new Date().toISOString()
    });
  }

  // NEW: Presence and status methods
  updatePresence(status, statusMessage = null) {
    return this.sendMessage('/app/presence/update', {
      status: status,
      statusMessage: statusMessage,
      timestamp: new Date().toISOString()
    });
  }

  // NEW: Notification acknowledgment
  acknowledgeNotification(notificationId) {
    return this.sendMessage('/app/notifications/ack', {
      notificationId: notificationId
    });
  }

  // NEW: Room management via WebSocket
  createRoom(roomData) {
    return this.sendMessage('/app/rooms/create', roomData);
  }

  updateRoom(roomId, updateData) {
    return this.sendMessage(`/app/rooms/${roomId}/update`, updateData);
  }

  inviteToRoom(roomId, userIds) {
    return this.sendMessage(`/app/rooms/${roomId}/invite`, {
      userIds: userIds
    });
  }

  leaveRoom(roomId) {
    return this.sendMessage(`/app/rooms/${roomId}/leave`, {});
  }

  // NEW: Enhanced subscription management
  subscribeToUserUpdates(userId) {
    return this.subscribe(`/user/${userId}/queue/updates`, `userUpdates_${userId}`, (update) => {
      const handler = this.messageHandlers.get(`userUpdates_${userId}`);
      if (handler) handler(update);
    });
  }

  subscribeToMentions(userId) {
    return this.subscribe(`/user/${userId}/queue/mentions`, `userMentions_${userId}`, (mention) => {
      const handler = this.messageHandlers.get(`userMentions_${userId}`);
      if (handler) handler(mention);
    });
  }

  subscribeToNotifications(userId) {
    return this.subscribe(`/user/${userId}/queue/notifications`, `userNotifications_${userId}`, (notification) => {
      const handler = this.messageHandlers.get(`userNotifications_${userId}`);
      if (handler) handler(notification);
    });
  }

  // NEW: Batch operations
  sendBatchReactions(reactions) {
    return this.sendMessage('/app/chat/reactions/batch', {
      reactions: reactions
    });
  }

  markMultipleAsRead(messageIds, roomId) {
    return this.sendMessage(`/app/chat/room/${roomId}/read-batch`, {
      messageIds: messageIds
    });
  }

  // NEW: File sharing via WebSocket
  notifyFileUpload(roomId, fileInfo) {
    return this.sendMessage(`/app/chat/room/${roomId}/file-upload`, {
      fileName: fileInfo.name,
      fileSize: fileInfo.size,
      fileType: fileInfo.type,
      uploadStatus: 'started'
    });
  }

  notifyFileUploadComplete(roomId, fileInfo, fileUrl) {
    return this.sendMessage(`/app/chat/room/${roomId}/file-upload`, {
      fileName: fileInfo.name,
      fileUrl: fileUrl,
      uploadStatus: 'completed'
    });
  }

  // NEW: Voice message support
  sendVoiceMessage(roomId, audioBlob, duration) {
    // This would typically upload the audio first, then send the message
    return this.sendMessage(`/app/chat/room/${roomId}/voice`, {
      audioUrl: audioBlob, // This would be a URL after upload
      duration: duration,
      type: 'voice_message'
    });
  }

  // NEW: Screen sharing notifications
  startScreenShare(roomId, shareId) {
    return this.sendMessage(`/app/chat/room/${roomId}/screen-share`, {
      action: 'start',
      shareId: shareId
    });
  }

  stopScreenShare(roomId, shareId) {
    return this.sendMessage(`/app/chat/room/${roomId}/screen-share`, {
      action: 'stop',
      shareId: shareId
    });
  }

  // Enhanced connection state with more details
  getEnhancedConnectionState() {
    return {
      connected: this.connected,
      isConnecting: this.isConnecting,
      clientConnected: this.client?.connected || false,
      subscriptionsCount: this.subscriptions.size,
      handlersCount: this.messageHandlers.size,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      lastHeartbeat: this.client?.lastHeartbeat || null,
      connectionUptime: this.connected ? Date.now() - this.connectionStartTime : 0
    };
  }

  // Enhanced debugging methods
  listActiveSubscriptions() {
    const subscriptions = {};
    this.subscriptions.forEach((subscription, id) => {
      subscriptions[id] = {
        destination: subscription.destination,
        active: subscription.active,
        id: subscription.id
      };
    });
    return subscriptions;
  }

  getSubscriptionStats() {
    const stats = {
      total: this.subscriptions.size,
      byType: {},
      handlers: this.messageHandlers.size
    };

    this.subscriptions.forEach((subscription, id) => {
      const type = id.split('_')[0];
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }

  // ... (keep all other existing methods: disconnect, clearSubscriptions, etc.)
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;