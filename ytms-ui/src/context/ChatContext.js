import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { chatAPI } from 'services/api';
import webSocketService from 'services/websocket';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const ChatContext = createContext();

// Action types
const CHAT_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_CHANNELS: 'SET_CHANNELS',
  SET_ACTIVE_CHANNEL: 'SET_ACTIVE_CHANNEL',
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  SET_TYPING_USERS: 'SET_TYPING_USERS',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_ERROR: 'SET_ERROR',
  ADD_CHANNEL: 'ADD_CHANNEL',
  REMOVE_CHANNEL: 'REMOVE_CHANNEL',
};

// Initial state
const initialState = {
  channels: [],
  activeChannel: null,
  messages: {},
  typingUsers: {},
  connected: false,
  loading: false,
  error: null,
};

// Reducer
function chatReducer(state, action) {
  switch (action.type) {
    case CHAT_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case CHAT_ACTIONS.SET_CHANNELS:
      return { ...state, channels: action.payload };

    case CHAT_ACTIONS.SET_ACTIVE_CHANNEL:
      return { ...state, activeChannel: action.payload };

    case CHAT_ACTIONS.SET_MESSAGES:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.channelId]: action.payload.messages,
        },
      };

    case CHAT_ACTIONS.ADD_MESSAGE:
      const channelId = action.payload.channelId;
      const existingMessages = state.messages[channelId] || [];
      
      // Check if message already exists to avoid duplicates
      const messageExists = existingMessages.some(msg => msg.id === action.payload.message.id);
      if (messageExists) {
        return state;
      }

      return {
        ...state,
        messages: {
          ...state.messages,
          [channelId]: [...existingMessages, action.payload.message],
        },
      };

    case CHAT_ACTIONS.UPDATE_MESSAGE:
      const updateChannelId = action.payload.channelId;
      const updatedMessages = state.messages[updateChannelId]?.map(msg =>
        msg.id === action.payload.message.id ? action.payload.message : msg
      ) || [];

      return {
        ...state,
        messages: {
          ...state.messages,
          [updateChannelId]: updatedMessages,
        },
      };

    case CHAT_ACTIONS.SET_TYPING_USERS:
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.channelId]: action.payload.users,
        },
      };

    case CHAT_ACTIONS.SET_CONNECTED:
      return { ...state, connected: action.payload };

    case CHAT_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };

    case CHAT_ACTIONS.ADD_CHANNEL:
      return {
        ...state,
        channels: [...state.channels, action.payload],
      };

    case CHAT_ACTIONS.REMOVE_CHANNEL:
      return {
        ...state,
        channels: state.channels.filter(channel => channel.id !== action.payload),
        activeChannel: state.activeChannel?.id === action.payload ? null : state.activeChannel,
      };

    default:
      return state;
  }
}

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, token } = useAuth();

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user && token && !webSocketService.isConnected()) {
      connectWebSocket();
    }

    return () => {
      if (webSocketService.isConnected()) {
        webSocketService.disconnect();
      }
    };
  }, [user, token, connectWebSocket]);

  // Load user channels when authenticated
  useEffect(() => {
    if (user && token) {
      loadUserChannels();
    }
  }, [user, token]);

  const connectWebSocket = async () => {
    try {
      await webSocketService.connect(token);
      dispatch({ type: CHAT_ACTIONS.SET_CONNECTED, payload: true });
      
      // Subscribe to error messages
      webSocketService.subscribeToErrors((error) => {
        toast.error(error);
      });
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      dispatch({ type: CHAT_ACTIONS.SET_CONNECTED, payload: false });
      toast.error('Failed to connect to chat service');
    }
  };

  const loadUserChannels = async () => {
    try {
      dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: true });
      const response = await chatAPI.getUserChannels();
      dispatch({ type: CHAT_ACTIONS.SET_CHANNELS, payload: response.data });
    } catch (error) {
      console.error('Failed to load channels:', error);
      toast.error('Failed to load chat channels');
    } finally {
      dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const createChannel = async (channelData) => {
    try {
      const response = await chatAPI.createChannel(channelData);
      dispatch({ type: CHAT_ACTIONS.ADD_CHANNEL, payload: response.data });
      toast.success('Channel created successfully');
      return response.data;
    } catch (error) {
      console.error('Failed to create channel:', error);
      toast.error('Failed to create channel');
      throw error;
    }
  };

  const joinChannel = async (channelId) => {
    try {
      await chatAPI.joinChannel(channelId);
      await loadUserChannels(); // Refresh channels
      toast.success('Joined channel successfully');
    } catch (error) {
      console.error('Failed to join channel:', error);
      toast.error('Failed to join channel');
    }
  };

  const leaveChannel = async (channelId) => {
    try {
      await chatAPI.leaveChannel(channelId);
      webSocketService.unsubscribeFromChannel(channelId);
      dispatch({ type: CHAT_ACTIONS.REMOVE_CHANNEL, payload: channelId });
      toast.success('Left channel successfully');
    } catch (error) {
      console.error('Failed to leave channel:', error);
      toast.error('Failed to leave channel');
    }
  };

  const setActiveChannel = async (channel) => {
    if (state.activeChannel?.id === channel.id) {
      return; // Already active
    }

    // Unsubscribe from previous channel
    if (state.activeChannel) {
      webSocketService.unsubscribeFromChannel(state.activeChannel.id);
    }

    dispatch({ type: CHAT_ACTIONS.SET_ACTIVE_CHANNEL, payload: channel });

    // Load messages for the channel
    try {
      const response = await chatAPI.getMessages(channel.id);
      dispatch({
        type: CHAT_ACTIONS.SET_MESSAGES,
        payload: { channelId: channel.id, messages: response.data.reverse() },
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }

    // Subscribe to real-time messages
    if (webSocketService.isConnected()) {
      webSocketService.subscribeToChannel(channel.id, (message) => {
        dispatch({
          type: CHAT_ACTIONS.ADD_MESSAGE,
          payload: { channelId: channel.id, message },
        });
      });

      // Subscribe to typing indicators
      webSocketService.subscribeToTyping(channel.id, (typingData) => {
        const currentTyping = state.typingUsers[channel.id] || [];
        let updatedTyping;

        if (typingData.status === 'typing') {
          updatedTyping = [...currentTyping.filter(u => u.userId !== typingData.userId), typingData];
        } else {
          updatedTyping = currentTyping.filter(u => u.userId !== typingData.userId);
        }

        dispatch({
          type: CHAT_ACTIONS.SET_TYPING_USERS,
          payload: { channelId: channel.id, users: updatedTyping },
        });

        // Clear typing indicator after 3 seconds
        if (typingData.status === 'typing') {
          setTimeout(() => {
            dispatch({
              type: CHAT_ACTIONS.SET_TYPING_USERS,
              payload: {
                channelId: channel.id,
                users: state.typingUsers[channel.id]?.filter(u => u.userId !== typingData.userId) || [],
              },
            });
          }, 3000);
        }
      });
    }
  };

  const sendMessage = async (content, messageType = 'TEXT', parentMessageId = null) => {
    if (!state.activeChannel) {
      toast.error('No active channel');
      return;
    }

    const messageData = {
      content,
      messageType,
      parentMessageId,
    };

    try {
      // Send via WebSocket for real-time delivery
      if (webSocketService.isConnected()) {
        webSocketService.sendMessage(state.activeChannel.id, messageData);
      } else {
        // Fallback to REST API
        await chatAPI.sendMessage(state.activeChannel.id, messageData);
        // Reload messages to show the sent message
        const response = await chatAPI.getMessages(state.activeChannel.id);
        dispatch({
          type: CHAT_ACTIONS.SET_MESSAGES,
          payload: { channelId: state.activeChannel.id, messages: response.data.reverse() },
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const sendTypingIndicator = (isTyping) => {
    if (state.activeChannel && webSocketService.isConnected()) {
      webSocketService.sendTypingIndicator(
        state.activeChannel.id,
        isTyping ? 'typing' : 'stopped'
      );
    }
  };

  const value = {
    ...state,
    createChannel,
    joinChannel,
    leaveChannel,
    setActiveChannel,
    sendMessage,
    sendTypingIndicator,
    loadUserChannels,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;