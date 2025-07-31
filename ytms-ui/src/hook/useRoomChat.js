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
  
  const mountedRef = useRef(true);
  const connectionAttemptedRef = useRef(false);
  const currentRoomIdRef = useRef(roomId);

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
    currentRoomIdRef.current = roomId;
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

    setMessages(prev => {
      // Check if message already exists
      const messageExists = prev.some(msg => msg.id === newMessage.id);
      if (messageExists) {
        console.log('🎯 useRoomChat: Message already exists, skipping duplicate ID:', newMessage.id);
        return prev;
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
      return;
    }

    console.log('🎯 useRoomChat: Initializing for room', roomId);
    mountedRef.current = true;
    
    // Load room data
    loadRoomMessages();
    loadRoomMembers();
    
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
      WebSocketService.disconnect();
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
          }
        }
      );
    } catch (error) {
      console.error('🎯 useRoomChat: Connection exception:', error);
      if (mountedRef.current) {
        setConnected(false);
        setLoading(false);
        setError('Failed to connect to chat: ' + error.message);
      }
    }
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
  };

  const cleanupRoomSubscriptions = () => {
    if (!roomId) return;

    console.log('🎯 useRoomChat: Cleaning up room subscriptions for', roomId);
    WebSocketService.unsubscribe(`/topic/chat/room/${roomId}`);
    WebSocketService.unsubscribe(`/topic/typing/room/${roomId}`);
    WebSocketService.unsubscribe(`/topic/rooms/${roomId}/members`);
    WebSocketService.unsubscribe(`/topic/rooms/${roomId}/read-status`);
  };

  const loadRoomMessages = async () => {
    if (!roomId) return;

    try {
      console.log('🎯 useRoomChat: Loading messages for room', roomId);
      const response = await chatAPI.getRoomMessages(roomId, 0, 50);
      console.log('🎯 useRoomChat: Loaded', response.data.length, 'messages');
      
      if (mountedRef.current && currentRoomIdRef.current === roomId) {
        // Sort messages chronologically (oldest first)
        const sortedMessages = response.data.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error('🎯 useRoomChat: Failed to load room messages:', error);
      if (mountedRef.current) {
        setError('Failed to load messages');
      }
    }
  };

  const loadRoomMembers = async () => {
    if (!roomId) return;

    try {
      console.log('🎯 useRoomChat: Loading members for room', roomId);
      const response = await chatAPI.getRoomDetails(roomId);
      console.log('🎯 useRoomChat: Loaded room details with', response.data.members?.length || 0, 'members');
      
      if (mountedRef.current && currentRoomIdRef.current === roomId) {
        setMembers(response.data.members || []);
      }
    } catch (error) {
      console.error('🎯 useRoomChat: Failed to load room members:', error);
      // Don't set error for member loading failure as it's not critical
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

  const sendMessage = useCallback((content) => {
    console.log('🎯 useRoomChat: Attempting to send message to room', roomId);
    if (!content.trim() || !connected || !roomId) {
      console.log('🎯 useRoomChat: Cannot send - invalid state');
      return false;
    }

    try {
      // Send message via WebSocket to room
      const success = WebSocketService.sendRoomMessage(roomId, {
        content: content.trim()
      });
      
      if (!success) {
        toast.error('Failed to send message');
      }
      return success;
    } catch (error) {
      console.error('🎯 useRoomChat: Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    }
  }, [connected, roomId]);

  const typingTimeoutRef = useRef(null);
  const lastTypingRef = useRef(0);

  const startTyping = useCallback(() => {
    if (!roomId || !connected) return;

    const now = Date.now();
    if (now - lastTypingRef.current > 1000) { // Only send every 1 second
      WebSocketService.sendRoomTypingIndicator(roomId, true);
      lastTypingRef.current = now;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      WebSocketService.sendRoomTypingIndicator(roomId, false);
    }, 1000);
  }, [roomId, connected]);

  const stopTyping = useCallback(() => {
    if (!roomId || !connected) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    WebSocketService.sendRoomTypingIndicator(roomId, false);
  }, [roomId, connected]);

  const markAsRead = useCallback(async () => {
    if (!roomId || !connected) return;

    try {
      await chatAPI.markRoomAsRead(roomId);
      console.log('🎯 useRoomChat: Marked room as read:', roomId);
    } catch (error) {
      console.error('🎯 useRoomChat: Failed to mark room as read:', error);
    }
  }, [roomId, connected]);

  return {
    messages,
    members,
    typingUsers,
    connected,
    loading,
    error,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    reconnect: connectToWebSocket
  };
};