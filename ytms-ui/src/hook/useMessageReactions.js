import { useState, useCallback } from 'react';
import { chatAPI } from '../services/api';

export const useMessageReactions = () => {
  const [reactingMessages, setReactingMessages] = useState(new Set());

  const handleReaction = useCallback(async (messageId, reactionType, currentUserId, onSuccess) => {
    if (reactingMessages.has(messageId)) {
      return; // Prevent multiple simultaneous reactions on same message
    }

    try {
      setReactingMessages(prev => new Set(prev).add(messageId));
      
      // Call the API
      await chatAPI.reactToMessage(messageId, reactionType);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(messageId, reactionType);
      }
      
    } catch (error) {
      console.error('Failed to react to message:', error);
      throw error;
    } finally {
      setReactingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  }, [reactingMessages]);

  const isReacting = useCallback((messageId) => {
    return reactingMessages.has(messageId);
  }, [reactingMessages]);

  return {
    handleReaction,
    isReacting
  };
};