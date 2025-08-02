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
    this.reconnectInterval = 5000;
  }

  connect(token) {
    if (this.connected) {
      console.log('WebSocket already connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const socket = new SockJS('http://localhost:8080/chat-websocket');
      
      this.client = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        debug: (str) => {
          console.log('WebSocket debug:', str);
        },
        reconnectDelay: this.reconnectInterval,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: (frame) => {
          console.log('WebSocket connected:', frame);
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        },
        onStompError: (frame) => {
          console.error('WebSocket STOMP error:', frame.headers['message']);
          console.error('Details:', frame.body);
          this.connected = false;
          reject(new Error(frame.headers['message']));
        },
        onWebSocketError: (error) => {
          console.error('WebSocket error:', error);
          this.connected = false;
          reject(error);
        },
        onDisconnect: () => {
          console.log('WebSocket disconnected');
          this.connected = false;
          this.handleReconnect();
        }
      });

      this.client.activate();
    });
  }

  disconnect() {
    if (this.client && this.connected) {
      this.subscriptions.clear();
      this.messageHandlers.clear();
      this.client.deactivate();
      this.connected = false;
      console.log('WebSocket disconnected');
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        const token = localStorage.getItem('token');
        if (token) {
          this.connect(token).catch(() => {
            this.handleReconnect();
          });
        }
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  subscribeToChannel(channelId, messageHandler) {
    if (!this.connected || !this.client) {
      console.error('WebSocket not connected');
      return null;
    }

    const destination = `/topic/channel/${channelId}`;
    
    if (this.subscriptions.has(destination)) {
      console.log(`Already subscribed to channel ${channelId}`);
      return this.subscriptions.get(destination);
    }

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const messageData = JSON.parse(message.body);
        console.log(`Received message in channel ${channelId}:`, messageData);
        messageHandler(messageData);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.subscriptions.set(destination, subscription);
    this.messageHandlers.set(destination, messageHandler);
    console.log(`Subscribed to channel ${channelId}`);
    
    return subscription;
  }

  subscribeToTyping(channelId, typingHandler) {
    if (!this.connected || !this.client) {
      console.error('WebSocket not connected');
      return null;
    }

    const destination = `/topic/channel/${channelId}/typing`;
    
    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const typingData = JSON.parse(message.body);
        console.log(`Typing indicator in channel ${channelId}:`, typingData);
        typingHandler(typingData);
      } catch (error) {
        console.error('Error parsing typing indicator:', error);
      }
    });

    return subscription;
  }

  unsubscribeFromChannel(channelId) {
    const destination = `/topic/channel/${channelId}`;
    const subscription = this.subscriptions.get(destination);
    
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
      this.messageHandlers.delete(destination);
      console.log(`Unsubscribed from channel ${channelId}`);
    }
  }

  sendMessage(channelId, messageData) {
    if (!this.connected || !this.client) {
      console.error('WebSocket not connected');
      return false;
    }

    try {
      this.client.publish({
        destination: `/app/channel/${channelId}/send`,
        body: JSON.stringify(messageData)
      });
      console.log(`Sent message to channel ${channelId}:`, messageData);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  sendTypingIndicator(channelId, status) {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      this.client.publish({
        destination: `/app/channel/${channelId}/typing`,
        body: status
      });
      return true;
    } catch (error) {
      console.error('Error sending typing indicator:', error);
      return false;
    }
  }

  subscribeToErrors(errorHandler) {
    if (!this.connected || !this.client) {
      console.error('WebSocket not connected');
      return null;
    }

    return this.client.subscribe('/user/queue/errors', (message) => {
      console.error('WebSocket error received:', message.body);
      errorHandler(message.body);
    });
  }

  isConnected() {
    return this.connected && this.client && this.client.connected;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;