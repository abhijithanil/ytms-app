// Create this as a temporary debug version of your WebSocket service
// Replace your current WebSocketService with this debug version

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class DebugWebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
    this.connectionPromise = null;
    this.reconnectTimer = null;
    
    console.log('🔧 WebSocketService: Constructor called');
  }

  async connect(token, onConnect, onError) {
    console.log('🔧 WebSocketService.connect: Called with token:', token ? 'present' : 'missing');
    
    if (this.connectionPromise) {
      console.log('🔧 WebSocketService.connect: Connection already in progress');
      return this.connectionPromise;
    }

    if (!token || token === 'undefined' || token === 'null') {
      console.error('🔧 WebSocketService.connect: Invalid token provided');
      if (onError) onError(new Error('Invalid authentication token'));
      return Promise.reject(new Error('Invalid authentication token'));
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log('🔧 WebSocketService.connect: Starting connection process');
        
        // Clean up any existing connection
        this.disconnect();

        const serverURL = process.env.NODE_ENV === 'production' 
          ? 'http://34.173.178.188:8080/ws'
          : 'http://localhost:8080/ws';

        console.log('🔧 WebSocketService.connect: Server URL:', serverURL);

        // Create WebSocket with SockJS fallback
        const socket = new SockJS(serverURL);
        
        this.client = new Client({
          webSocketFactory: () => socket,
          connectHeaders: {
            Authorization: `Bearer ${token}`
          },
          debug: (str) => {
            console.log('🔧 STOMP Debug:', str);
          },
          reconnectDelay: this.reconnectInterval,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          onConnect: (frame) => {
            console.log('🔧 WebSocketService.onConnect: Connection successful!', frame);
            this.connected = true;
            this.reconnectAttempts = 0;
            this.connectionPromise = null;
            
            // Clear any pending reconnect timer
            if (this.reconnectTimer) {
              clearTimeout(this.reconnectTimer);
              this.reconnectTimer = null;
            }

            // Setup default subscriptions immediately
            console.log('🔧 WebSocketService.onConnect: Setting up default subscriptions');
            this.setupDefaultSubscriptions();
            
            console.log('🔧 WebSocketService.onConnect: Calling onConnect callback');
            if (onConnect) onConnect(frame);
            resolve(frame);
          },
          onDisconnect: (frame) => {
            console.log('🔧 WebSocketService.onDisconnect:', frame);
            this.connected = false;
            this.connectionPromise = null;
            this.handleDisconnection(onConnect, onError);
          },
          onStompError: (frame) => {
            console.error('🔧 WebSocketService.onStompError:', frame);
            this.connected = false;
            this.connectionPromise = null;
            
            const error = new Error(`WebSocket error: ${frame.headers?.message || 'Unknown error'}`);
            if (onError) onError(error);
            reject(error);
          },
          onWebSocketError: (error) => {
            console.error('🔧 WebSocketService.onWebSocketError:', error);
            this.connected = false;
            this.connectionPromise = null;
            
            if (onError) onError(error);
            reject(error);
          }
        });

        console.log('🔧 WebSocketService.connect: Activating client');
        this.client.activate();

      } catch (error) {
        console.error('🔧 WebSocketService.connect: Exception during initialization:', error);
        this.connectionPromise = null;
        if (onError) onError(error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  setupDefaultSubscriptions() {
    console.log('🔧 WebSocketService.setupDefaultSubscriptions: Called');
    
    // Global chat messages
    if (this.messageHandlers.has('globalChat')) {
      console.log('🔧 WebSocketService: Setting up globalChat subscription');
      this.subscribe('/topic/chat/global', 'globalChat', this.messageHandlers.get('globalChat'));
    }

    // Online users updates
    if (this.messageHandlers.has('onlineUsers')) {
      console.log('🔧 WebSocketService: Setting up onlineUsers subscription');
      this.subscribe('/topic/users/online', 'onlineUsers', this.messageHandlers.get('onlineUsers'));
    }

    // User status changes
    if (this.messageHandlers.has('userStatus')) {
      console.log('🔧 WebSocketService: Setting up userStatus subscription');
      this.subscribe('/topic/users/status', 'userStatus', this.messageHandlers.get('userStatus'));
    }

    // Global typing indicators
    if (this.messageHandlers.has('globalTyping')) {
      console.log('🔧 WebSocketService: Setting up globalTyping subscription');
      this.subscribe('/topic/typing/global', 'globalTyping', this.messageHandlers.get('globalTyping'));
    }
  }

  setMessageHandler(type, handler) {
    console.log('🔧 WebSocketService.setMessageHandler:', type);
    this.messageHandlers.set(type, handler);
    
    // If already connected, set up subscription immediately
    if (this.connected) {
      console.log('🔧 WebSocketService: Already connected, setting up subscription for', type);
      this.setupDefaultSubscriptions();
    }
  }

  subscribe(destination, handlerKey, callback) {
    console.log('🔧 WebSocketService.subscribe:', destination, 'with key:', handlerKey);
    
    if (!this.client || !this.connected) {
      console.warn('🔧 WebSocketService.subscribe: Not connected, storing subscription for later');
      this.subscriptions.set(destination, { handlerKey, callback });
      return null;
    }

    try {
      const subscription = this.client.subscribe(destination, (message) => {
        console.log('🔧 WebSocketService: Received message on', destination, ':', message.body);
        try {
          const data = JSON.parse(message.body);
          callback(data);
        } catch (error) {
          console.error('🔧 WebSocketService: Error parsing message:', error);
          callback(message.body);
        }
      });

      this.subscriptions.set(destination, { handlerKey, callback, subscription });
      console.log('🔧 WebSocketService: Successfully subscribed to', destination);
      return subscription;
    } catch (error) {
      console.error('🔧 WebSocketService: Failed to subscribe to', destination, ':', error);
      return null;
    }
  }

  sendMessage(destination, message) {
    console.log('🔧 WebSocketService.sendMessage:', destination, message);
    
    if (!this.client || !this.connected) {
      console.error('🔧 WebSocketService.sendMessage: Not connected');
      return false;
    }

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(message)
      });
      console.log('🔧 WebSocketService.sendMessage: Message sent successfully');
      return true;
    } catch (error) {
      console.error('🔧 WebSocketService.sendMessage: Failed to send:', error);
      return false;
    }
  }

  joinChat(userInfo) {
    console.log('🔧 WebSocketService.joinChat:', userInfo);
    return this.sendMessage('/app/chat/join', userInfo);
  }

  isConnected() {
    const isConnected = this.connected && this.client && this.client.connected;
    console.log('🔧 WebSocketService.isConnected:', isConnected);
    return isConnected;
  }

  disconnect() {
    console.log('🔧 WebSocketService.disconnect: Called');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client && this.client.connected) {
      try {
        this.client.deactivate();
      } catch (error) {
        console.error('🔧 WebSocketService.disconnect: Error during disconnection:', error);
      }
    }
    
    this.connected = false;
    this.client = null;
    this.connectionPromise = null;
    this.subscriptions.clear();
  }

  // Convenience methods
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

  removeMessageHandler(type) {
    console.log('🔧 WebSocketService.removeMessageHandler:', type);
    this.messageHandlers.delete(type);
  }

  handleDisconnection(onConnect, onError) {
    // Simplified for debugging - don't auto-reconnect
    console.log('🔧 WebSocketService.handleDisconnection: Connection lost');
  }

  restoreSubscriptions() {
    console.log('🔧 WebSocketService.restoreSubscriptions: Called');
    // Simplified for debugging
  }

  unsubscribe(destination) {
    console.log('🔧 WebSocketService.unsubscribe:', destination);
    const subInfo = this.subscriptions.get(destination);
    if (subInfo && subInfo.subscription) {
      try {
        subInfo.subscription.unsubscribe();
      } catch (error) {
        console.error('🔧 WebSocketService.unsubscribe: Error:', error);
      }
    }
    this.subscriptions.delete(destination);
  }
}

// Export singleton instance
const DebugWebSocketServiceInstance = new DebugWebSocketService();
export default DebugWebSocketServiceInstance;