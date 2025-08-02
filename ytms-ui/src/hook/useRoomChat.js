// Updated useRoomChat.js - Fix for sender seeing duplicate messages

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import WebSocketService from '../services/WebSocketService ';
import { chatAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useRoomChat = (roomId) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  
  const mountedRef = useRef(true);
  const connectionAttemptedRef = useRef(false);
  const currentRoomIdRef = useRef(roomId);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Track processed messages to prevent duplicates
  const processedMessageIds = useRef(new Set());
  
  // Track pending messages (messages being sent)
  const pendingMessages = useRef(new Map());

  console.log('🎯 useRoomChat: Render', { 
    roomId,
    user: !!user,
    token: !!token,
    connected,
    loading,
    error,
    messagesCount: messages.length,
    membersCount: members.length
  });

  // Update current room ID ref when roomId changes
  useEffect(() => {
    const previousRoomId = currentRoomIdRef.current;
    currentRoomIdRef.current = roomId;
    
    // If room changed, clean up previous room subscriptions
    if (previousRoomId && previousRoomId !== roomId) {
      console.log('🎯 useRoomChat: Room changed from', previousRoomId, 'to', roomId);
      cleanupRoomSubscriptions(previousRoomId);
      setMessages([]);
      setMembers([]);
      setTypingUsers([]);
      setRoomDetails(null);
      processedMessageIds.current.clear();
      pendingMessages.current.clear();
    }
  }, [roomId]);

  // Helper function to add a message safely (prevents duplicates)
  const addMessageSafely = useCallback((newMessage) => {
    // Only add message if it belongs to current room
    if (newMessage.chatRoomId !== currentRoomIdRef.current) {
      console.log('🎯 useRoomChat: Message for different room, ignoring', {
        messageRoomId: newMessage.chatRoomId,
        currentRoomId: currentRoomIdRef.current
      });
      return;
    }

    const messageKey = `${newMessage.id}_${newMessage.createdAt}`;
    
    // Check if message was already processed
    if (processedMessageIds.current.has(messageKey)) {
      console.log('🎯 useRoomChat: Message already processed, skipping duplicate:', messageKey);
      return;
    }

    processedMessageIds.current.add(messageKey);

    setMessages(prev => {
      // Check if message already exists in state (double safety check)
      const messageExists = prev.some(msg => 
        msg.id === newMessage.id || 
        (msg.tempId && msg.tempId === newMessage.tempId)
      );
      
      if (messageExists) {
        console.log('🎯 useRoomChat: Message already exists in state, updating if needed');
        // Update message if it was a temporary message
        return prev.map(msg => 
          (msg.id === newMessage.id || msg.tempId === newMessage.tempId)
            ? { ...newMessage, tempId: undefined }
            : msg
        );
      }
      
      // Add message and ensure chronological order
      const updatedMessages = [...prev, newMessage];
      return updatedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });
  }, []);

  // Initialize connection and load room data
  useEffect(() => {
    if (!roomId || !user || !token || token === 'undefined' || token === 'null') {
      console.log('🎯 useRoomChat: Missing requirements', { roomId, user: !!user, token: !!token });
      setConnected(false);
      setLoading(false);
      return;
    }

    console.log('🎯 useRoomChat: Initializing for room', roomId);
    mountedRef.current = true;
    
    // Load room data
    loadRoomData();
    
    // Connect to WebSocket if not already connected
    if (!connectionAttemptedRef.current) {
      connectionAttemptedRef.current = true;
      connectToWebSocket();
    } else if (WebSocketService.isConnected()) {
      // Already connected, just set up room subscriptions
      setConnected(true);
      setupRoomSubscriptions();
    }

    return () => {
      console.log('🎯 useRoomChat: Room effect cleanup for', roomId);
      cleanupRoomSubscriptions();
    };
  }, [roomId, user, token]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🎯 useRoomChat: Component unmounting');
      mountedRef.current = false;
      connectionAttemptedRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      processedMessageIds.current.clear();
      pendingMessages.current.clear();
      cleanupRoomSubscriptions();
    };
  }, []);

  const connectToWebSocket = async () => {
    try {
      console.log('🎯 useRoomChat: Connecting to WebSocket');
      setLoading(true);
      setError(null);

      await WebSocketService.connect(
        token,
        (frame) => {
          console.log('🎯 useRoomChat: WebSocket connected successfully');
          if (mountedRef.current) {
            setConnected(true);
            setLoading(false);
            setError(null);
            reconnectAttemptsRef.current = 0;
            
            // Join general chat and setup room subscriptions
            WebSocketService.joinChat({ userId: user.id });
            setupRoomSubscriptions();
          }
        },
        (error) => {
          console.error('🎯 useRoomChat: WebSocket connection failed:', error);
          if (mountedRef.current) {
            setConnected(false);
            setLoading(false);
            setError('Failed to connect to chat: ' + error.message);
            handleReconnect();
          }
        }
      );
    } catch (error) {
      console.error('🎯 useRoomChat: Connection exception:', error);
      if (mountedRef.current) {
        setConnected(false);
        setLoading(false);
        setError('Failed to connect to chat: ' + error.message);
        handleReconnect();
      }
    }
  };

  const handleReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('🎯 useRoomChat: Max reconnect attempts reached');
      setError('Connection failed. Please refresh the page.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    console.log(`🎯 useRoomChat: Scheduling reconnect attempt ${reconnectAttemptsRef.current + 1} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        reconnectAttemptsRef.current++;
        connectToWebSocket();
      }
    }, delay);
  };

  const setupRoomSubscriptions = () => {
    if (!roomId) return;

    console.log('🎯 useRoomChat: Setting up room subscriptions for', roomId);

    // Subscribe to room messages
    WebSocketService.subscribe(
      `/topic/chat/room/${roomId}`,
      `roomChat_${roomId}`,
      (message) => {
        console.log('🎯 useRoomChat: Received room message:', message);
        if (mountedRef.current) {
          // Remove from pending messages if it exists
          if (message.tempId && pendingMessages.current.has(message.tempId)) {
            pendingMessages.current.delete(message.tempId);
            console.log('🎯 useRoomChat: Removed pending message:', message.tempId);
          }
          
          addMessageSafely(message);
        }
      }
    );

    // Subscribe to room typing indicators
    WebSocketService.subscribe(
      `/topic/typing/room/${roomId}`,
      `roomTyping_${roomId}`,
      (typingData) => {
        console.log('🎯 useRoomChat: Received typing indicator:', typingData);
        if (mountedRef.current) {
          handleTypingUpdate(typingData);
        }
      }
    );

    // Subscribe to room member updates
    WebSocketService.subscribe(
      `/topic/rooms/${roomId}/members`,
      `roomMembers_${roomId}`,
      (memberUpdate) => {
        console.log('🎯 useRoomChat: Received member update:', memberUpdate);
        if (mountedRef.current) {
          handleMemberUpdate(memberUpdate);
        }
      }
    );

    // Subscribe to read status updates (for DMs)
    WebSocketService.subscribe(
      `/topic/rooms/${roomId}/read-status`,
      `roomReadStatus_${roomId}`,
      (readStatus) => {
        console.log('🎯 useRoomChat: Received read status:', readStatus);
        // Handle read status updates if needed
      }
    );

    // Join the room via WebSocket
    if (WebSocketService.joinRoom) {
      WebSocketService.joinRoom(roomId);
    }
  };

  const cleanupRoomSubscriptions = (roomIdToCleanup = roomId) => {
    if (!roomIdToCleanup) return;

    console.log('🎯 useRoomChat: Cleaning up room subscriptions for', roomIdToCleanup);
    WebSocketService.unsubscribe(`/topic/chat/room/${roomIdToCleanup}`);
    WebSocketService.unsubscribe(`/topic/typing/room/${roomIdToCleanup}`);
    WebSocketService.unsubscribe(`/topic/rooms/${roomIdToCleanup}/members`);
    WebSocketService.unsubscribe(`/topic/rooms/${roomIdToCleanup}/read-status`);
    
    // Leave the room via WebSocket
    if (WebSocketService.leaveRoom) {
      WebSocketService.leaveRoom(roomIdToCleanup);
    }
  };

  const loadRoomData = async () => {
    if (!roomId) return;

    try {
      console.log('🎯 useRoomChat: Loading room data for', roomId);
      setLoading(true);
      
      // Load room details and messages in parallel
      const [roomResponse, messagesResponse] = await Promise.all([
        chatAPI.getChatRoom ? chatAPI.getChatRoom(roomId) : chatAPI.getRoomDetails(roomId),
        chatAPI.getRoomMessages(roomId, 0, 50)
      ]);

      if (mountedRef.current && currentRoomIdRef.current === roomId) {
        // Set room details
        setRoomDetails(roomResponse.data);
        setMembers(roomResponse.data.members || []);
        
        // Set messages (sorted chronologically)
        const sortedMessages = messagesResponse.data.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        
        // Clear processed messages and add all loaded messages to processed set
        processedMessageIds.current.clear();
        sortedMessages.forEach(msg => {
          const messageKey = `${msg.id}_${msg.createdAt}`;
          processedMessageIds.current.add(messageKey);
        });
        
        setMessages(sortedMessages);
        
        console.log('🎯 useRoomChat: Loaded room data:', {
          roomName: roomResponse.data.roomName,
          memberCount: roomResponse.data.members?.length || 0,
          messageCount: sortedMessages.length
        });
      }
    } catch (error) {
      console.error('🎯 useRoomChat: Failed to load room data:', error);
      if (mountedRef.current) {
        if (error.response?.status === 403) {
          setError('You do not have access to this chat room');
        } else if (error.response?.status === 404) {
          setError('Chat room not found');
        } else {
          setError('Failed to load chat room');
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleTypingUpdate = (typingData) => {
    const { userId, username, isTyping } = typingData;
    
    // Don't show own typing
    if (userId === user?.id) return;

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

  const handleMemberUpdate = (memberUpdate) => {
    const { action, member } = memberUpdate;
    
    if (!mountedRef.current) return;

    setMembers(prev => {
      switch (action) {
        case 'joined':
          // Add member if not already in list
          if (!prev.find(m => m.userId === member.userId)) {
            return [...prev, member];
          }
          return prev;
        case 'left':
          // Remove member from list
          return prev.filter(m => m.userId !== member.userId);
        case 'updated':
          // Update member info
          return prev.map(m => m.userId === member.userId ? { ...m, ...member } : m);
        default:
          return prev;
      }
    });
  };

  // FIXED: Removed optimistic updates that were causing duplicates
  const sendMessage = useCallback((content, options = {}) => {
    console.log('🎯 useRoomChat: Attempting to send message to room', roomId);
    if (!content.trim() || !connected || !roomId) {
      console.log('🎯 useRoomChat: Cannot send - invalid state');
      toast.error('Cannot send message - not connected');
      return false;
    }

    try {
      // Send message via WebSocket to room WITHOUT optimistic update
      const messageData = {
        content: content.trim(),
        ...options
      };

      const success = WebSocketService.sendRoomMessage ? 
        WebSocketService.sendRoomMessage(roomId, messageData) :
        WebSocketService.sendMessage(`/app/chat/room/${roomId}`, messageData);
      
      if (!success) {
        toast.error('Failed to send message');
      }
      
      return success;
    } catch (error) {
      console.error('🎯 useRoomChat: Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    }
  }, [connected, roomId, user]);

  const typingTimeoutRef = useRef(null);
  const lastTypingRef = useRef(0);

  const startTyping = useCallback(() => {
    if (!roomId || !connected) return;

    const now = Date.now();
    if (now - lastTypingRef.current > 1000) { // Only send every 1 second
      const success = WebSocketService.sendRoomTypingIndicator ? 
        WebSocketService.sendRoomTypingIndicator(roomId, true) :
        WebSocketService.sendMessage(`/app/typing/room/${roomId}`, { isTyping: true });
      
      if (success) {
        lastTypingRef.current = now;
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      WebSocketService.sendRoomTypingIndicator ? 
        WebSocketService.sendRoomTypingIndicator(roomId, false) :
        WebSocketService.sendMessage(`/app/typing/room/${roomId}`, { isTyping: false });
    }, 1000);
  }, [roomId, connected]);

  const stopTyping = useCallback(() => {
    if (!roomId || !connected) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    WebSocketService.sendRoomTypingIndicator ? 
      WebSocketService.sendRoomTypingIndicator(roomId, false) :
      WebSocketService.sendMessage(`/app/typing/room/${roomId}`, { isTyping: false });
  }, [roomId, connected]);

  const markAsRead = useCallback(async () => {
    if (!roomId || !connected) return;

    try {
      await chatAPI.markRoomAsRead(roomId);
      console.log('🎯 useRoomChat: Marked room as read:', roomId);
    } catch (error) {
      console.error('🎯 useRoomChat: Failed to mark room as read:', error);
      // Don't show error to user as this is not critical
    }
  }, [roomId, connected]);

  const reconnect = useCallback(() => {
    console.log('🎯 useRoomChat: Manual reconnect requested');
    reconnectAttemptsRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    connectionAttemptedRef.current = false;
    connectToWebSocket();
  }, []);

  const loadMoreMessages = useCallback(async (page = 1) => {
    if (!roomId || loading) return;

    try {
      console.log('🎯 useRoomChat: Loading more messages, page:', page);
      const response = await chatAPI.getRoomMessages(roomId, page, 50);
      
      if (mountedRef.current && currentRoomIdRef.current === roomId) {
        const newMessages = response.data.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        
        setMessages(prev => {
          // Merge with existing messages, avoiding duplicates
          const existingIds = new Set(prev.map(msg => msg.id));
          const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
          
          return [...uniqueNewMessages, ...prev].sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
          );
        });
        
        return newMessages.length;
      }
    } catch (error) {
      console.error('🎯 useRoomChat: Failed to load more messages:', error);
      throw error;
    }
  }, [roomId, loading]);

  return {
    // Data
    messages,
    members,
    typingUsers,
    roomDetails,
    
    // State
    connected,
    loading,
    error,
    
    // Actions
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    reconnect,
    loadMoreMessages,
    
    // Utilities
    isConnected: connected,
    canSendMessage: connected && roomId && user,
    memberCount: members.length,
    messageCount: messages.length
  };
};