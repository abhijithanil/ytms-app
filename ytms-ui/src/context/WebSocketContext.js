// Create src/context/WebSocketContext.js - Centralized WebSocket management

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import WebSocketService from '../services/WebSocketService '; // Note the space in filename
import { chatAPI } from '../services/api';
import toast from 'react-hot-toast';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  
  const connectionInitialized = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const onlineUsersInterval = useRef(null);
  const mountedRef = useRef(true);
  const connectionCheckInterval = useRef(null);

  console.log('🌐 WebSocketContext: Render', {
    user: !!user,
    token: !!token,
    isConnected,
    isConnecting,
    onlineUsersCount: onlineUsers.length,
    connectionInitialized: connectionInitialized.current
  });

  // Load online users via API
  const loadOnlineUsers = useCallback(async () => {
    try {
      console.log('🌐 WebSocketContext: Loading online users via API');
      const response = await chatAPI.getOnlineUsers();
      debugger
      
      if (mountedRef.current) {
        console.log('🌐 WebSocketContext: Loaded', response.data.length, 'online users');
        setOnlineUsers(response.data);
      }
    } catch (error) {
      console.error('🌐 WebSocketContext: Failed to load online users:', error);
    }
  }, []);

  // Start polling online users as fallback
  const startOnlineUsersPolling = useCallback(() => {
    // Clear existing interval
    if (onlineUsersInterval.current) {
      clearInterval(onlineUsersInterval.current);
    }

    // Load immediately
    loadOnlineUsers();

    // Poll every 30 seconds
    onlineUsersInterval.current = setInterval(() => {
      if (mountedRef.current && isConnected) {
        loadOnlineUsers();
      }
    }, 30000);
  }, [isConnected, loadOnlineUsers]);

  // Stop online users polling
  const stopOnlineUsersPolling = useCallback(() => {
    if (onlineUsersInterval.current) {
      clearInterval(onlineUsersInterval.current);
      onlineUsersInterval.current = null;
    }
  }, []);

  // Set up global WebSocket subscriptions
  const setupGlobalSubscriptions = useCallback(() => {
    console.log('🌐 WebSocketContext: Setting up global subscriptions');

    // Online users updates
    WebSocketService.subscribe('/topic/users/online', 'globalOnlineUsers', (users) => {
      console.log('🌐 WebSocketContext: Received online users update:', users?.length || 0);
      if (mountedRef.current && Array.isArray(users)) {
        setOnlineUsers(users);
      }
    });

    // User status changes
    WebSocketService.subscribe('/topic/users/status', 'globalUserStatus', (statusUpdate) => {
      console.log('🌐 WebSocketContext: User status change:', statusUpdate);
      if (mountedRef.current) {
        setOnlineUsers(prev => prev.map(u => 
          u.userId === statusUpdate.userId 
            ? { ...u, status: statusUpdate.status }
            : u
        ));
      }
    });

    // Connection health check
    WebSocketService.subscribe('/topic/system/heartbeat', 'systemHeartbeat', (heartbeat) => {
      console.log('🌐 WebSocketContext: Received heartbeat');
      // Update connection health if needed
    });
  }, []);

  // Initialize WebSocket connection
  const initializeConnection = useCallback(async () => {
    if (!user || !token || token === 'undefined' || token === 'null') {
      console.log('🌐 WebSocketContext: Missing auth requirements');
      return;
    }

    if (connectionInitialized.current || isConnecting) {
      console.log('🌐 WebSocketContext: Connection already initialized or connecting');
      return;
    }

    console.log('🌐 WebSocketContext: Initializing WebSocket connection');
    connectionInitialized.current = true;
    setIsConnecting(true);
    setConnectionError(null);

    try {
      await WebSocketService.connect(
        token,
        (frame) => {
          console.log('🌐 WebSocketContext: Connection successful');
          if (mountedRef.current) {
            setIsConnected(true);
            setIsConnecting(false);
            setConnectionError(null);
            reconnectAttempts.current = 0;
            
            // Join chat
            WebSocketService.joinChat({ userId: user.id });
            
            // Set up global subscriptions
            setupGlobalSubscriptions();
            
            // Start online users polling
            startOnlineUsersPolling();
          }
        },
        (error) => {
          console.error('🌐 WebSocketContext: Connection failed:', error);
          if (mountedRef.current) {
            setIsConnected(false);
            setIsConnecting(false);
            setConnectionError(error.message);
            handleReconnect();
          }
        }
      );
    } catch (error) {
      console.error('🌐 WebSocketContext: Connection initialization failed:', error);
      if (mountedRef.current) {
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionError(error.message);
        handleReconnect();
      }
    }
  }, [user, token, isConnecting, setupGlobalSubscriptions, startOnlineUsersPolling]);

  // Handle reconnection with exponential backoff
  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('🌐 WebSocketContext: Max reconnect attempts reached');
      toast.error('Connection failed. Please refresh the page.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    console.log(`🌐 WebSocketContext: Scheduling reconnect attempt ${reconnectAttempts.current + 1} in ${delay}ms`);
    
    setTimeout(() => {
      if (mountedRef.current) {
        reconnectAttempts.current++;
        connectionInitialized.current = false;
        initializeConnection();
      }
    }, delay);
  }, [initializeConnection]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('🌐 WebSocketContext: Manual reconnect requested');
    reconnectAttempts.current = 0;
    connectionInitialized.current = false;
    
    // Disconnect and reconnect
    WebSocketService.disconnect();
    setTimeout(() => {
      if (mountedRef.current) {
        initializeConnection();
      }
    }, 1000);
  }, [initializeConnection]);

  // Update user status
  const updateUserStatus = useCallback((status) => {
    console.log('🌐 WebSocketContext: Updating user status to:', status);
    return WebSocketService.updateUserStatus(status);
  }, []);

  // Initialize connection when auth is ready
  useEffect(() => {
    if (user && token && !connectionInitialized.current) {
      initializeConnection();
    }
  }, [user, token, initializeConnection]);

  // Monitor WebSocket connection state
  useEffect(() => {
    const checkConnection = () => {
      const wsConnected = WebSocketService.isConnected();
      if (wsConnected !== isConnected) {
        console.log('🌐 WebSocketContext: Connection state changed:', wsConnected);
        setIsConnected(wsConnected);
        
        if (!wsConnected && mountedRef.current) {
          setConnectionError('Connection lost');
          stopOnlineUsersPolling();
        } else if (wsConnected && mountedRef.current) {
          setConnectionError(null);
          startOnlineUsersPolling();
        }
      }
    };

    connectionCheckInterval.current = setInterval(checkConnection, 5000);
    return () => {
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
    };
  }, [isConnected, stopOnlineUsersPolling, startOnlineUsersPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🌐 WebSocketContext: Cleaning up');
      mountedRef.current = false;
      connectionInitialized.current = false;
      stopOnlineUsersPolling();
      
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
      
      // Clean up global subscriptions
      WebSocketService.unsubscribe('globalOnlineUsers');
      WebSocketService.unsubscribe('globalUserStatus');
      WebSocketService.unsubscribe('systemHeartbeat');
      
      // Disconnect WebSocket
      WebSocketService.disconnect();
    };
  }, [stopOnlineUsersPolling]);

  const contextValue = {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    
    // Data
    onlineUsers,
    
    // Actions
    reconnect,
    updateUserStatus,
    
    // WebSocket service access
    webSocketService: WebSocketService,
    
    // Utilities
    isReady: isConnected && !isConnecting,
    connectionStatus: isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected',
    
    // Debug info
    debugInfo: WebSocketService.getConnectionStats()
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};