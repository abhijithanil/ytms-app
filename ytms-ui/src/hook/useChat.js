import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import WebSocketService from '../services/websocket';
import { chatAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useChat = (taskId = null) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const typingTimeoutRef = useRef(null);
  const lastTypingRef = useRef(0);
  const mountedRef = useRef(true);

  // Initialize WebSocket connection
  useEffect(() => {
    if (user && token) {
      connectToChat();
    }

    return () => {
      mountedRef.current = false;
      WebSocketService.disconnect();
    };
  }, [user, token]);

  // Set up message handlers
  useEffect(() => {
    const handleGlobalChatMessage = (message) => {
      if (!taskId && mountedRef.current) { // Only handle global messages when not in task chat
        setMessages(prev => [message, ...prev]);
      }
    };

    const handleOnlineUsersUpdate = (users) => {
      if (mountedRef.current) {
        setOnlineUsers(users);
      }
    };

    const handleUserStatusChange = (statusUpdate) => {
      const { user: updatedUser, action } = statusUpdate;
      console.log(`User ${updatedUser.username} ${action}`);
      
      if (action === 'joined') {
        toast.success(`${updatedUser.displayName} joined the chat`, {
          duration: 2000,
          position: 'bottom-right'
        });
      }
    };

    const handleTypingIndicator = (typingData) => {
      if (!taskId && mountedRef.current) { // Only handle global typing when not in task chat
        handleTypingUpdate(typingData);
      }
    };

    // Register handlers
    WebSocketService.setMessageHandler('globalChat', handleGlobalChatMessage);
    WebSocketService.setMessageHandler('onlineUsers', handleOnlineUsersUpdate);
    WebSocketService.setMessageHandler('userStatus', handleUserStatusChange);
    WebSocketService.setMessageHandler('globalTyping', handleTypingIndicator);

    return () => {
      WebSocketService.removeMessageHandler('globalChat');
      WebSocketService.removeMessageHandler('onlineUsers');
      WebSocketService.removeMessageHandler('userStatus');
      WebSocketService.removeMessageHandler('globalTyping');
    };
  }, [taskId]);

  // Task-specific chat subscription
  useEffect(() => {
    if (connected && taskId && mountedRef.current) {
      // Subscribe to task-specific chat
      WebSocketService.subscribe(`/topic/chat/task/${taskId}`, 'taskChat', (message) => {
        if (mountedRef.current) {
          setMessages(prev => [message, ...prev]);
        }
      });

      // Subscribe to task-specific typing
      WebSocketService.subscribe(`/topic/typing/task/${taskId}`, 'taskTyping', (typingData) => {
        if (mountedRef.current) {
          handleTypingUpdate(typingData);
        }
      });

      return () => {
        WebSocketService.unsubscribe(`/topic/chat/task/${taskId}`);
        WebSocketService.unsubscribe(`/topic/typing/task/${taskId}`);
      };
    }
  }, [connected, taskId]);

  const connectToChat = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await WebSocketService.connect(
        token,
        () => {
          if (mountedRef.current) {
            setConnected(true);
            WebSocketService.joinChat({ userId: user.id });
            loadChatHistory();
            loadOnlineUsers();
          }
        },
        (error) => {
          console.error('WebSocket connection error:', error);
          if (mountedRef.current) {
            setConnected(false);
            setError('Failed to connect to chat');
            toast.error('Failed to connect to chat');
          }
        }
      );
    } catch (error) {
      console.error('Failed to connect to chat:', error);
      if (mountedRef.current) {
        setConnected(false);
        setError('Failed to connect to chat');
        toast.error('Failed to connect to chat');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await chatAPI.getChatHistory(taskId, 0, 50);
      if (mountedRef.current) {
        // Reverse to show newest at top (since we're using unshift for new messages)
        setMessages(response.data.reverse());
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      if (mountedRef.current) {
        toast.error('Failed to load chat history');
      }
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await chatAPI.getOnlineUsers();
      if (mountedRef.current) {
        setOnlineUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };

  const sendMessage = useCallback((content) => {
    if (!content.trim() || !connected) return false;

    const success = WebSocketService.sendChatMessage(content.trim(), taskId);
    if (!success) {
      toast.error('Failed to send message');
    }
    return success;
  }, [connected, taskId]);

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
    WebSocketService.updateUserStatus(status);
  }, []);

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
