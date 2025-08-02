// Updated WebSocketService.js - Fix for duplicate messages

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
    this.isConnecting = false; // Add this flag
    this.messageQueue = []; // Queue for messages while connecting
  }

  async connect(token, onSuccess, onError) {
    console.log('🔌 WebSocketService: Starting connection...');
    
    // Prevent multiple simultaneous connections
    if (this.connected || this.isConnecting) {
      console.log('🔌 WebSocketService: Already connected or connecting');
      if (this.connected && onSuccess) onSuccess();
      return this.connectionPromise;
    }

    this.isConnecting = true;

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Disconnect any existing connection first
        if (this.client) {
          this.client.deactivate();
          this.client = null;
        }

        const socket = new SockJS(`${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/ws`);
        
        this.client = new Client({
          webSocketFactory: () => socket,
          connectHeaders: {
            Authorization: `Bearer ${token}`
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
            this.reconnectAttempts = 0;
            this.connectionPromise = null;

            // Set up global subscriptions
            this.setupGlobalSubscriptions();

            // Process queued messages
            this.processMessageQueue();

            if (onSuccess) onSuccess(frame);
            resolve(frame);
          },
          onStompError: (frame) => {
            console.error('🔌 WebSocketService: STOMP Error:', frame.headers['message']);
            console.error('Additional details:', frame.body);
            this.connected = false;
            this.isConnecting = false;
            this.connectionPromise = null;
            
            const error = new Error(frame.headers['message'] || 'STOMP connection failed');
            if (onError) onError(error);
            reject(error);
          },
          onWebSocketError: (event) => {
            console.error('🔌 WebSocketService: WebSocket Error:', event);
            this.connected = false;
            this.isConnecting = false;
            this.connectionPromise = null;
            
            const error = new Error('WebSocket connection failed');
            if (onError) onError(error);
            reject(error);
          },
          onDisconnect: (frame) => {
            console.log('🔌 WebSocketService: Disconnected', frame);
            this.connected = false;
            this.isConnecting = false;
            this.clearSubscriptions();
            
            // Auto-reconnect with exponential backoff
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
              console.log(`🔌 WebSocketService: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
              
              setTimeout(() => {
                this.reconnectAttempts++;
                this.connect(token, onSuccess, onError);
              }, delay);
            }
          }
        });

        this.client.activate();
        
      } catch (error) {
        console.error('🔌 WebSocketService: Connection setup failed:', error);
        this.isConnecting = false;
        this.connectionPromise = null;
        if (onError) onError(error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // Process queued messages after connection is established
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { destination, payload } = this.messageQueue.shift();
      this.sendMessage(destination, payload);
    }
  }

  setupGlobalSubscriptions() {
    console.log('🔌 WebSocketService: Setting up global subscriptions');

    // Clear any existing subscriptions first
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
  }

  subscribe(destination, subscriptionId, messageHandler) {
    if (!this.client || !this.connected) {
      console.warn('🔌 WebSocketService: Cannot subscribe - not connected');
      return false;
    }

    // Check if already subscribed
    if (this.subscriptions.has(subscriptionId)) {
      console.log(`🔌 WebSocketService: Already subscribed to ${subscriptionId}`);
      return true;
    }

    try {
      console.log(`🔌 WebSocketService: Subscribing to ${destination} with ID ${subscriptionId}`);
      
      const subscription = this.client.subscribe(destination, (message) => {
        try {
          const parsedMessage = JSON.parse(message.body);
          console.log(`🔌 WebSocketService: Received message on ${destination}:`, parsedMessage);
          messageHandler(parsedMessage);
        } catch (error) {
          console.error(`🔌 WebSocketService: Error parsing message from ${destination}:`, error);
        }
      });

      this.subscriptions.set(subscriptionId, subscription);
      return true;
    } catch (error) {
      console.error(`🔌 WebSocketService: Failed to subscribe to ${destination}:`, error);
      return false;
    }
  }

  unsubscribe(destination) {
    // Find subscription by destination
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.destination === destination) {
        console.log(`🔌 WebSocketService: Unsubscribing from ${destination}`);
        subscription.unsubscribe();
        this.subscriptions.delete(id);
        return true;
      }
    }
    return false;
  }

  setMessageHandler(handlerId, handler) {
    console.log(`🔌 WebSocketService: Setting message handler for ${handlerId}`);
    this.messageHandlers.set(handlerId, handler);
  }

  removeMessageHandler(handlerId) {
    console.log(`🔌 WebSocketService: Removing message handler for ${handlerId}`);
    this.messageHandlers.delete(handlerId);
  }

  // Send messages with deduplication
  sendMessage(destination, payload) {
    if (!this.connected) {
      console.warn('🔌 WebSocketService: Cannot send message - not connected');
      
      // Queue message if we're connecting
      if (this.isConnecting) {
        console.log('🔌 WebSocketService: Queueing message while connecting');
        this.messageQueue.push({ destination, payload });
        return true;
      }
      return false;
    }

    try {
      console.log(`🔌 WebSocketService: Sending message to ${destination}:`, payload);
      
      // Add a unique ID to prevent duplicate processing on server side
      const messageWithId = {
        ...payload,
        messageId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      this.client.publish({
        destination: destination,
        body: JSON.stringify(messageWithId)
      });
      return true;
    } catch (error) {
      console.error(`🔌 WebSocketService: Failed to send message to ${destination}:`, error);
      return false;
    }
  }

  // Chat-specific methods with deduplication
  joinChat(payload) {
    return this.sendMessage('/app/chat/join', payload);
  }

  sendChatMessage(content, taskId = null) {
    const destination = taskId ? `/app/chat/task/${taskId}` : '/app/chat/global';
    return this.sendMessage(destination, { content });
  }

  sendTypingIndicator(isTyping, taskId = null) {
    const destination = taskId ? `/app/typing/task/${taskId}` : '/app/typing/global';
    return this.sendMessage(destination, { isTyping });
  }

  updateUserStatus(status) {
    return this.sendMessage('/app/users/status', { status });
  }

  // Room-specific methods
  sendRoomMessage(roomId, payload) {
    return this.sendMessage(`/app/chat/room/${roomId}`, payload);
  }

  sendDirectMessage(recipientId, payload) {
    return this.sendMessage(`/app/chat/direct/${recipientId}`, payload);
  }

  sendRoomTypingIndicator(roomId, isTyping) {
    return this.sendMessage(`/app/typing/room/${roomId}`, { isTyping });
  }

  joinRoom(roomId) {
    return this.sendMessage(`/app/rooms/join/${roomId}`, {});
  }

  leaveRoom(roomId) {
    return this.sendMessage(`/app/rooms/leave/${roomId}`, {});
  }

  // Connection management
  disconnect() {
    console.log('🔌 WebSocketService: Disconnecting...');
    this.connected = false;
    this.isConnecting = false;
    this.connectionPromise = null;
    this.messageQueue = [];
    this.clearSubscriptions();
    this.messageHandlers.clear();
    
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  clearSubscriptions() {
    console.log('🔌 WebSocketService: Clearing all subscriptions');
    this.subscriptions.forEach((subscription, id) => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.warn(`🔌 WebSocketService: Error unsubscribing ${id}:`, error);
      }
    });
    this.subscriptions.clear();
  }

  isConnected() {
    return this.connected && this.client && this.client.connected;
  }

  // Utility methods for debugging
  getConnectionState() {
    return {
      connected: this.connected,
      isConnecting: this.isConnecting,
      clientConnected: this.client?.connected || false,
      subscriptionsCount: this.subscriptions.size,
      handlersCount: this.messageHandlers.size,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    };
  }

  listSubscriptions() {
    const subs = {};
    this.subscriptions.forEach((subscription, id) => {
      subs[id] = subscription.destination;
    });
    return subs;
  }

  listHandlers() {
    return Array.from(this.messageHandlers.keys());
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;