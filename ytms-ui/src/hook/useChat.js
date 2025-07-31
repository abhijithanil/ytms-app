import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import WebSocketService from '../services/WebSocketService ';
import toast from 'react-hot-toast';
import {chatAPI} from '../services/api'

export const useChat = (taskId = null) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const mountedRef = useRef(true);
  const connectionAttemptedRef = useRef(false);

  // Helper function to add a message safely (prevents duplicates)
  const addMessageSafely = useCallback((newMessage) => {
    setMessages(prev => {
      // Check if message already exists
      const messageExists = prev.some(msg => msg.id === newMessage.id);
      if (messageExists) {
        console.log('🎯 useChat: Message already exists, skipping duplicate ID:', newMessage.id);
        return prev;
      }
      
      // Add message and ensure chronological order
      const updatedMessages = [...prev, newMessage];
      return updatedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });
  }, []);

  console.log('🎯 useChat: Render', { 
    user: !!user, 
    token: !!token, 
    connected, 
    loading, 
    error,
    taskId,
    messagesCount: messages.length,
    connectionAttempted: connectionAttemptedRef.current
  });

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('🎯 useChat: Main effect triggered', { 
      user: !!user, 
      token: !!token,
      connectionAttempted: connectionAttemptedRef.current
    });
    
    // Reset mounted ref
    mountedRef.current = true;
    
    // Always load chat history first, regardless of connection state
    if (user && token && token !== 'undefined' && token !== 'null') {
      console.log('🎯 useChat: Loading chat history immediately...');
      loadChatHistory();
      loadOnlineUsers();
      
      if (!connectionAttemptedRef.current) {
        console.log('🎯 useChat: Starting WebSocket connection...');
        connectionAttemptedRef.current = true;
        connectToChat();
      }
    } else {
      console.error('🎯 useChat: Missing requirements for connection');
      setError('Authentication required');
      setLoading(false);
    }

    // Don't set mountedRef to false in cleanup - let the component handle that
    return () => {
      console.log('🎯 useChat: Effect cleanup - but keeping mountedRef true');
    };
  }, [user, token]); // Remove dependency on connectionAttemptedRef to prevent re-runs

  // Separate cleanup effect that only runs on actual unmount
  useEffect(() => {
    return () => {
      console.log('🎯 useChat: Component unmounting - disconnecting WebSocket');
      mountedRef.current = false;
      connectionAttemptedRef.current = false;
      WebSocketService.disconnect();
    };
  }, []); // Empty dependency array - only runs on mount/unmount

  // Set up message handlers
  useEffect(() => {
    console.log('🎯 useChat: Setting up message handlers for taskId:', taskId);
    
    const handleGlobalChatMessage = (message) => {
      console.log('🎯 useChat: Received global chat message:', message);
      if (!taskId && mountedRef.current) {
        addMessageSafely(message);
      }
    };

    const handleOnlineUsersUpdate = (users) => {
      console.log('🎯 useChat: Received online users update:', users);
      if (mountedRef.current) {
        setOnlineUsers(users);
      }
    };

    const handleUserStatusChange = (statusUpdate) => {
      console.log('🎯 useChat: User status change:', statusUpdate);
    };

    const handleTypingIndicator = (typingData) => {
      console.log('🎯 useChat: Typing indicator:', typingData);
      if (!taskId && mountedRef.current) {
        handleTypingUpdate(typingData);
      }
    };

    // Register handlers
    console.log('🎯 useChat: Registering message handlers');
    WebSocketService.setMessageHandler('globalChat', handleGlobalChatMessage);
    WebSocketService.setMessageHandler('onlineUsers', handleOnlineUsersUpdate);
    WebSocketService.setMessageHandler('userStatus', handleUserStatusChange);
    WebSocketService.setMessageHandler('globalTyping', handleTypingIndicator);

    return () => {
      console.log('🎯 useChat: Removing message handlers');
      WebSocketService.removeMessageHandler('globalChat');
      WebSocketService.removeMessageHandler('onlineUsers');
      WebSocketService.removeMessageHandler('userStatus');
      WebSocketService.removeMessageHandler('globalTyping');
    };
  }, [taskId]);

  // Task-specific chat subscription
  useEffect(() => {
    if (connected && taskId && mountedRef.current) {
      console.log('🎯 useChat: Setting up task-specific subscriptions for taskId:', taskId);
      
      // Subscribe to task-specific chat
      WebSocketService.subscribe(`/topic/chat/task/${taskId}`, 'taskChat', (message) => {
        if (mountedRef.current) {
          addMessageSafely(message);
        }
      });

      // Subscribe to task-specific typing
      WebSocketService.subscribe(`/topic/typing/task/${taskId}`, 'taskTyping', (typingData) => {
        if (mountedRef.current) {
          handleTypingUpdate(typingData);
        }
      });

      return () => {
        console.log('🎯 useChat: Cleaning up task-specific subscriptions');
        WebSocketService.unsubscribe(`/topic/chat/task/${taskId}`);
        WebSocketService.unsubscribe(`/topic/typing/task/${taskId}`);
      };
    }
  }, [connected, taskId]);

  const connectToChat = async () => {
    try {
      console.log('🎯 connectToChat: Starting connection process');
      setLoading(true);
      setError(null);
      
      if (!token || token === 'undefined' || token === 'null') {
        throw new Error('Invalid authentication token');
      }

      console.log('🎯 connectToChat: Token validated, calling WebSocketService.connect');
      console.log('🎯 connectToChat: mountedRef.current before connect:', mountedRef.current);

      await WebSocketService.connect(
        token,
        (frame) => {
          console.log('🎯 connectToChat: SUCCESS CALLBACK TRIGGERED!');
          console.log('🎯 connectToChat: mountedRef.current in callback:', mountedRef.current);
          
          // Always update state regardless of mountedRef for debugging
          console.log('🎯 connectToChat: Setting connected=true, loading=false (forced)');
          setConnected(true);
          setLoading(false);
          setError(null);
          
          console.log('🎯 connectToChat: Calling joinChat');
          WebSocketService.joinChat({ userId: user.id });
          
          // Don't reload chat history here since it's already loaded in the main effect
          console.log('🎯 connectToChat: WebSocket connected, chat history already loaded');
        },
        (error) => {
          console.error('🎯 connectToChat: ERROR CALLBACK TRIGGERED:', error);
          if (mountedRef.current) {
            setConnected(false);
            setLoading(false);
            setError('Failed to connect to chat: ' + error.message);
            toast.error('Failed to connect to chat');
          }
        }
      );
    } catch (error) {
      console.error('🎯 connectToChat: Exception caught:', error);
      if (mountedRef.current) {
        setConnected(false);
        setLoading(false);
        setError('Failed to connect to chat: ' + error.message);
        toast.error('Failed to connect to chat');
      }
    }
  };

  const loadChatHistory = async () => {
    try {
      console.log('🎯 loadChatHistory: Loading history for taskId:', taskId);
      const response = await chatAPI.getChatHistory(taskId, 0, 50);
      console.log('🎯 loadChatHistory: Received', response.data.length, 'messages');
      
      if (mountedRef.current) {
        // Remove duplicates and sort messages by createdAt to ensure chronological order (oldest first)
        const uniqueMessages = response.data.filter((message, index, self) => 
          index === self.findIndex(m => m.id === message.id)
        );
        
        const sortedMessages = uniqueMessages.sort((a, b) => {
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
        
        console.log('🎯 loadChatHistory: Messages deduplicated and sorted chronologically (oldest first)');
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error('🎯 loadChatHistory: Failed to load chat history:', error);
      if (mountedRef.current) {
        toast.error('Failed to load chat history');
      }
    }
  };

  const loadOnlineUsers = async () => {
    try {
      console.log('🎯 loadOnlineUsers: Loading online users');
      const response = await chatAPI.getOnlineUsers();
      console.log('🎯 loadOnlineUsers: Received', response.data.length, 'users');
      
      if (mountedRef.current) {
        setOnlineUsers(response.data);
      }
    } catch (error) {
      console.error('🎯 loadOnlineUsers: Failed to load online users:', error);
    }
  };

  const handleTypingUpdate = (typingData) => {
    const { userId, username, isTyping } = typingData;
    
    if (userId === user?.id) return; // Don't show own typing

    if (mountedRef.current) {
      setTypingUsers(prev => {
        if (isTyping) {
          // Add user to typing list if not already there
          if (!prev.find(u => u.userId === userId)) {
            return [...prev, { userId, username }];
          }
          return prev;
        } else {
          // Remove user from typing list
          return prev.filter(u => u.userId !== userId);
        }
      });

      // Auto-remove typing indicator after 3 seconds
      if (isTyping) {
        setTimeout(() => {
          if (mountedRef.current) {
            setTypingUsers(prev => prev.filter(u => u.userId !== userId));
          }
        }, 3000);
      }
    }
  };

  const sendMessage = useCallback((content) => {
    console.log('🎯 sendMessage: Attempting to send:', content);
    if (!content.trim() || !connected) {
      console.log('🎯 sendMessage: Cannot send - content empty or not connected');
      return false;
    }

    const success = WebSocketService.sendChatMessage(content.trim(), taskId);
    if (!success) {
      toast.error('Failed to send message');
    }
    return success;
  }, [connected, taskId]);

  const typingTimeoutRef = useRef(null);
  const lastTypingRef = useRef(0);

  const startTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingRef.current > 1000) { // Only send every 1 second
      WebSocketService.sendTypingIndicator(true, taskId);
      lastTypingRef.current = now;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      WebSocketService.sendTypingIndicator(false, taskId);
    }, 1000);
  }, [taskId]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    WebSocketService.sendTypingIndicator(false, taskId);
  }, [taskId]);

  const updateUserStatus = useCallback((status) => {
    console.log('🎯 updateUserStatus: Called with:', status);
    WebSocketService.updateUserStatus(status);
  }, []);

  // Debug timer to check state periodically
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('🎯 useChat: Periodic state check', {
        connected,
        loading,
        error,
        messagesCount: messages.length,
        onlineUsersCount: onlineUsers.length,
        webSocketConnected: WebSocketService.isConnected(),
        mountedRef: mountedRef.current
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [connected, loading, error, messages.length, onlineUsers.length]);

  return {
    messages,
    onlineUsers,
    typingUsers,
    connected,
    loading,
    error,
    sendMessage,
    startTyping,
    stopTyping,
    updateUserStatus,
    reconnect: connectToChat
  };
};