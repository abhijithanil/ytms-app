// Complete WebSocketService.js - Fixed version with all missing methods

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
    this.connectionStartTime = null;
  }

  // Connect to WebSocket
  async connect(token, onSuccess, onError) {
    if (this.connected || this.isConnecting) {
      console.log('🔌 WebSocketService: Already connected or connecting');
      if (onSuccess) onSuccess();
      return Promise.resolve();
    }

    console.log('🔌 WebSocketService: Starting connection...');
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        const socket = new SockJS('http://localhost:8080/ws');
        
        this.client = new Client({
          webSocketFactory: () => socket,
          connectHeaders: {
            Authorization: `Bearer ${token}`,
          },
          debug: (str) => {
            console.log('🔌 STOMP Debug:', str);
          },
          reconnectDelay: this.reconnectDelay,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          onConnect: (frame) => {
            console.log('🔌 WebSocketService: Connected successfully!', frame);
            this.connected = true;
            this.isConnecting = false;
            this.connectionStartTime = Date.now();
            this.reconnectAttempts = 0;
            this.setupGlobalSubscriptions();
            this.processMessageQueue();
            
            if (onSuccess) onSuccess(frame);
            resolve(frame);
          },
          onStompError: (frame) => {
            console.error('🔌 WebSocketService: STOMP error:', frame);
            this.connected = false;
            this.isConnecting = false;
            const error = new Error(`STOMP error: ${frame.headers.message}`);
            if (onError) onError(error);
            reject(error);
          },
          onWebSocketError: (error) => {
            console.error('🔌 WebSocketService: WebSocket error:', error);
            this.connected = false;
            this.isConnecting = false;
            if (onError) onError(error);
            reject(error);
          },
          onDisconnect: () => {
            console.log('🔌 WebSocketService: Disconnected');
            this.connected = false;
            this.isConnecting = false;
          }
        });

        this.client.activate();
        
      } catch (error) {
        console.error('🔌 WebSocketService: Connection error:', error);
        this.connected = false;
        this.isConnecting = false;
        if (onError) onError(error);
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket
  disconnect() {
    console.log('🔌 WebSocketService: Disconnecting...');
    
    if (this.client) {
      this.clearSubscriptions();
      this.client.deactivate();
      this.client = null;
    }
    
    this.connected = false;
    this.isConnecting = false;
    this.messageHandlers.clear();
    this.messageQueue = [];
    this.connectionStartTime = null;
    
    console.log('🔌 WebSocketService: Disconnected');
  }

  // Check if connected
  isConnected() {
    return this.connected && this.client?.connected;
  }

  // Subscribe to a topic
  subscribe(destination, id, handler) {
    if (!this.connected || !this.client) {
      console.warn(`🔌 WebSocketService: Cannot subscribe to ${destination} - not connected`);
      return false;
    }

    try {
      console.log(`🔌 WebSocketService: Subscribing to ${destination} with id ${id}`);
      
      // Unsubscribe existing subscription with same id
      if (this.subscriptions.has(id)) {
        this.unsubscribe(destination);
      }

      const subscription = this.client.subscribe(destination, (message) => {
        try {
          const parsedMessage = JSON.parse(message.body);
          console.log(`🔌 WebSocketService: Received message on ${destination}:`, parsedMessage);
          if (handler) {
            handler(parsedMessage);
          }
        } catch (error) {
          console.error('🔌 WebSocketService: Error parsing message:', error);
        }
      });

      this.subscriptions.set(id, {
        subscription: subscription,
        destination: destination,
        handler: handler,
        active: true,
        id: subscription.id
      });

      console.log(`🔌 WebSocketService: Successfully subscribed to ${destination}`);
      return true;
    } catch (error) {
      console.error(`🔌 WebSocketService: Error subscribing to ${destination}:`, error);
      return false;
    }
  }

  // Unsubscribe from a topic
  unsubscribe(destination) {
    console.log(`🔌 WebSocketService: Unsubscribing from ${destination}`);
    
    // Find subscription by destination
    let subscriptionKey = null;
    for (const [key, sub] of this.subscriptions.entries()) {
      if (sub.destination === destination) {
        subscriptionKey = key;
        break;
      }
    }

    if (subscriptionKey && this.subscriptions.has(subscriptionKey)) {
      const subscription = this.subscriptions.get(subscriptionKey);
      try {
        if (subscription.subscription && subscription.subscription.unsubscribe) {
          subscription.subscription.unsubscribe();
        }
        this.subscriptions.delete(subscriptionKey);
        console.log(`🔌 WebSocketService: Successfully unsubscribed from ${destination}`);
        return true;
      } catch (error) {
        console.error(`🔌 WebSocketService: Error unsubscribing from ${destination}:`, error);
        this.subscriptions.delete(subscriptionKey);
        return false;
      }
    } else {
      console.warn(`🔌 WebSocketService: No subscription found for ${destination}`);
      return false;
    }
  }

  // Clear all subscriptions
  clearSubscriptions() {
    console.log('🔌 WebSocketService: Clearing all subscriptions');
    
    for (const [key, subscription] of this.subscriptions.entries()) {
      try {
        if (subscription.subscription && subscription.subscription.unsubscribe) {
          subscription.subscription.unsubscribe();
        }
      } catch (error) {
        console.error(`🔌 WebSocketService: Error unsubscribing ${key}:`, error);
      }
    }
    
    this.subscriptions.clear();
    console.log('🔌 WebSocketService: All subscriptions cleared');
  }

  // Send a message
  sendMessage(destination, payload) {
    if (!this.connected || !this.client) {
      console.warn(`🔌 WebSocketService: Cannot send message to ${destination} - not connected`);
      this.messageQueue.push({ destination, payload });
      return false;
    }

    try {
      console.log(`🔌 WebSocketService: Sending message to ${destination}:`, payload);
      this.client.publish({
        destination: destination,
        body: JSON.stringify(payload)
      });
      return true;
    } catch (error) {
      console.error(`🔌 WebSocketService: Error sending message to ${destination}:`, error);
      return false;
    }
  }

  // Process queued messages
  processMessageQueue() {
    console.log(`🔌 WebSocketService: Processing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const { destination, payload } = this.messageQueue.shift();
      this.sendMessage(destination, payload);
    }
  }

  // Set message handler
  setMessageHandler(type, handler) {
    console.log(`🔌 WebSocketService: Setting message handler for ${type}`);
    this.messageHandlers.set(type, handler);
  }

  // Remove message handler
  removeMessageHandler(type) {
    console.log(`🔌 WebSocketService: Removing message handler for ${type}`);
    this.messageHandlers.delete(type);
  }

  // Setup global subscriptions
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

    // Message reactions
    this.subscribe('/topic/messages/reactions', 'messageReactions', (reactionUpdate) => {
      const handler = this.messageHandlers.get('messageReactions');
      if (handler) handler(reactionUpdate);
    });

    // Message updates (edits, deletes)
    this.subscribe('/topic/messages/updates', 'messageUpdates', (messageUpdate) => {
      const handler = this.messageHandlers.get('messageUpdates');
      if (handler) handler(messageUpdate);
    });

    // User mentions
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

    // Room-specific message reactions
    this.subscribe(`/topic/rooms/${roomId}/reactions`, `roomReactions_${roomId}`, (reactionUpdate) => {
      const handler = this.messageHandlers.get(`roomReactions_${roomId}`);
      if (handler) handler(reactionUpdate);
    });

    // Room-specific message updates
    this.subscribe(`/topic/rooms/${roomId}/message-updates`, `roomMessageUpdates_${roomId}`, (messageUpdate) => {
      const handler = this.messageHandlers.get(`roomMessageUpdates_${roomId}`);
      if (handler) handler(messageUpdate);
    });

    // Thread updates for room
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

  // Basic chat methods
  joinChat(userData) {
    console.log('🔌 WebSocketService: Joining chat with user data:', userData);
    return this.sendMessage('/app/chat/join', userData);
  }

  sendChatMessage(content, taskId = null) {
    console.log('🔌 WebSocketService: Sending chat message:', { content, taskId });
    const destination = taskId ? `/app/chat/task/${taskId}` : '/app/chat/global';
    return this.sendMessage(destination, { content: content });
  }

  sendTypingIndicator(isTyping, taskId = null) {
    console.log('🔌 WebSocketService: Sending typing indicator:', { isTyping, taskId });
    const destination = taskId ? `/app/typing/task/${taskId}` : '/app/typing/global';
    return this.sendMessage(destination, { isTyping: isTyping });
  }

  updateUserStatus(status) {
    console.log('🔌 WebSocketService: Updating user status:', status);
    return this.sendMessage('/app/user/status', { status: status });
  }

  // Enhanced message sending methods
  sendEnhancedMessage(destination, payload) {
    const enhancedPayload = {
      ...payload,
      messageId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      clientVersion: '2.0'
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

  // Message reaction methods
  sendReaction(messageId, reactionType, roomId = null) {
    const destination = roomId 
      ? `/app/chat/room/${roomId}/react`
      : '/app/chat/react';
    
    return this.sendMessage(destination, {
      messageId: messageId,
      reactionType: reactionType,
      action: 'toggle'
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

  // Message action methods
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

  // Thread/reply methods
  sendReply(parentMessageId, content, roomId) {
    return this.sendMessage(`/app/chat/room/${roomId}/reply`, {
      parentMessageId: parentMessageId,
      content: content
    });
  }

  // Enhanced typing indicators with context
  sendEnhancedTyping(isTyping, roomId = null, context = {}) {
    const destination = roomId 
      ? `/app/typing/room/${roomId}`
      : '/app/typing/global';
    
    return this.sendMessage(destination, {
      isTyping: isTyping,
      context: context,
      timestamp: new Date().toISOString()
    });
  }

  // Room-specific typing indicators
  sendRoomTypingIndicator(roomId, isTyping) {
    console.log(`🔌 WebSocketService: Sending room typing indicator for ${roomId}:`, isTyping);
    return this.sendMessage(`/app/typing/room/${roomId}`, { isTyping: isTyping });
  }

  // Presence and status methods
  updatePresence(status, statusMessage = null) {
    return this.sendMessage('/app/presence/update', {
      status: status,
      statusMessage: statusMessage,
      timestamp: new Date().toISOString()
    });
  }

  // Room management via WebSocket
  joinRoom(roomId) {
    console.log(`🔌 WebSocketService: Joining room ${roomId}`);
    return this.sendMessage(`/app/rooms/${roomId}/join`, {});
  }

  leaveRoom(roomId) {
    console.log(`🔌 WebSocketService: Leaving room ${roomId}`);
    return this.sendMessage(`/app/rooms/${roomId}/leave`, {});
  }

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

  // Enhanced subscription management
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
      connectionUptime: this.connected && this.connectionStartTime ? Date.now() - this.connectionStartTime : 0
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
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;