import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimer = null;
  }

  connect(token, onConnected, onError) {
    if (this.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.client = new Client({
          webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
          connectHeaders: {
            Authorization: `Bearer ${token}`
          },
          debug: (str) => {
            console.log('STOMP Debug:', str);
          },
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          onConnect: (frame) => {
            console.log('Connected to WebSocket:', frame);
            this.connected = true;
            this.reconnectAttempts = 0;
            
            // Clear any existing reconnect timer
            if (this.reconnectTimer) {
              clearTimeout(this.reconnectTimer);
              this.reconnectTimer = null;
            }
            
            // Subscribe to default channels
            this.subscribeToDefaultChannels();
            
            if (onConnected) onConnected();
            resolve();
          },
          onStompError: (frame) => {
            console.error('STOMP error:', frame);
            this.connected = false;
            if (onError) onError(frame);
            reject(frame);
          },
          onWebSocketClose: () => {
            console.log('WebSocket connection closed');
            this.connected = false;
            this.handleReconnect();
          },
          onWebSocketError: (error) => {
            console.error('WebSocket error:', error);
            this.connected = false;
            if (onError) onError(error);
          }
        });

        this.client.activate();
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        reject(error);
      }
    });
  }

  subscribeToDefaultChannels() {
    // Subscribe to global chat
    this.subscribe('/topic/chat/global', 'globalChat');
    
    // Subscribe to online users updates
    this.subscribe('/topic/users/online', 'onlineUsers');
    
    // Subscribe to user status changes
    this.subscribe('/topic/users/status', 'userStatus');
    
    // Subscribe to global typing indicators
    this.subscribe('/topic/typing/global', 'globalTyping');
  }

  subscribe(destination, handlerKey, callback) {
    if (!this.connected || !this.client) {
      console.warn('WebSocket not connected, cannot subscribe to:', destination);
      return null;
    }

    try {
      const subscription = this.client.subscribe(destination, (message) => {
        const data = JSON.parse(message.body);
        
        // Call specific callback if provided
        if (callback) {
          callback(data);
        }
        
        // Call registered handler
        const handler = this.messageHandlers.get(handlerKey);
        if (handler) {
          handler(data);
        }
      });

      this.subscriptions.set(destination, subscription);
      console.log('Subscribed to:', destination);
      return subscription;
    } catch (error) {
      console.error('Error subscribing to:', destination, error);
      return null;
    }
  }

  unsubscribe(destination) {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
      console.log('Unsubscribed from:', destination);
    }
  }

  setMessageHandler(handlerKey, handler) {
    this.messageHandlers.set(handlerKey, handler);
  }

  removeMessageHandler(handlerKey) {
    this.messageHandlers.delete(handlerKey);
  }

  sendMessage(destination, message) {
    if (!this.connected || !this.client) {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(message)
      });
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  joinChat(userInfo = {}) {
    return this.sendMessage('/app/chat.join', userInfo);
  }

  sendChatMessage(content, taskId = null) {
    return this.sendMessage('/app/chat.send', { content, taskId });
  }

  sendTypingIndicator(isTyping, taskId = null) {
    return this.sendMessage('/app/chat.typing', { isTyping, taskId });
  }

  updateUserStatus(status) {
    return this.sendMessage('/app/chat.status', { status });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        if (!this.connected && this.client) {
          this.client.activate();
        }
      }, 5000 * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.client) {
      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Unsubscribe from all subscriptions
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();
      this.messageHandlers.clear();
      
      this.client.deactivate();
      this.connected = false;
      console.log('Disconnected from WebSocket');
    }
  }

  isConnected() {
    return this.connected;
  }
}

export default new WebSocketService();