import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageCircle, 
  Users, 
  Settings, 
  Phone, 
  Video, 
  Info,
  Hash,
  User,
  Lock,
  Globe,
  UserPlus,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ArrowDown,
  Loader,
  Reply,
  MoreVertical
} from 'lucide-react';
import { useRoomChat } from '../../hook/useRoomChat';
import { useAuth } from '../../context/AuthContext';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import UserMentionInput from './UserMentionInput';
import RoomMembersModal from './RoomMembersModal';
import { chatAPI } from '../../services/api';
import toast from 'react-hot-toast';

const RoomChatPanel = ({ room, currentUserId }) => {
  const { user } = useAuth();
  const {
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
    reconnect,
    loadMoreMessages
  } = useRoomChat(room?.id);

  // UI State
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMoreActions, setShowMoreActions] = useState(false);
  
  // Search State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [searchFilters, setSearchFilters] = useState({
    dateFrom: '',
    dateTo: '',
    sender: '',
    messageType: 'all'
  });
  
  // Scroll State
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [page, setPage] = useState(0);
  const [showNewMessageAlert, setShowNewMessageAlert] = useState(false);
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState(null);
  
  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTimeout = useRef(null);
  const lastMessageCount = useRef(0);
  const shouldAutoScroll = useRef(true);
  const topObserverRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const moreActionsRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth', force = false) => {
    if (messagesEndRef.current && (shouldAutoScroll.current || force)) {
      try {
        messagesEndRef.current.scrollIntoView({ 
          behavior: behavior,
          block: 'end',
          inline: 'nearest'
        });
      } catch (error) {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }
    }
  }, []);

  const checkScrollPosition = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const threshold = 150;
    
    const nearBottom = distanceFromBottom < threshold;
    setIsNearBottom(nearBottom);
    setShowScrollToBottom(!nearBottom && scrollHeight > clientHeight);
    shouldAutoScroll.current = nearBottom;
    
    if (nearBottom) {
      setShowNewMessageAlert(false);
      setUnreadCount(0);
    }
  }, []);

  // Auto-scroll when new messages arrive - FIXED
  useEffect(() => {
    const hasNewMessages = messages.length > lastMessageCount.current;
    const newMessagesCount = messages.length - lastMessageCount.current;
    lastMessageCount.current = messages.length;

    if (hasNewMessages && newMessagesCount > 0) {
      const latestMessages = messages.slice(-newMessagesCount);
      const hasOwnMessage = latestMessages.some(msg => msg.senderId === currentUserId);
      
      // Always auto-scroll when user sends a message, or when near bottom
      if (hasOwnMessage || shouldAutoScroll.current) {
        setTimeout(() => {
          scrollToBottom('smooth', hasOwnMessage);
          // Ensure the input area stays visible
          if (hasOwnMessage) {
            setIsNearBottom(true);
            setShowNewMessageAlert(false);
            setUnreadCount(0);
          }
        }, 50);
      } else if (!hasOwnMessage) {
        // Show new message indicator for others' messages when not at bottom
        setShowNewMessageAlert(true);
        setUnreadCount(prev => prev + newMessagesCount);
      }
    }
  }, [messages, currentUserId, scrollToBottom]);

  // Initial scroll to bottom - IMPROVED
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      const timeoutId = setTimeout(() => {
        scrollToBottom('auto', true);
        setIsNearBottom(true);
        shouldAutoScroll.current = true;
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, loading, room?.id, scrollToBottom]);

  // Set up intersection observers
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const bottomObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsNearBottom(true);
            setShowScrollToBottom(false);
            setShowNewMessageAlert(false);
            setUnreadCount(0);
            shouldAutoScroll.current = true;
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    const topObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !loadingMoreRef.current && hasMoreMessages && connected) {
            loadOlderMessages();
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '100px 0px 0px 0px'
      }
    );

    if (messagesEndRef.current) {
      bottomObserver.observe(messagesEndRef.current);
    }
    
    if (topObserverRef.current) {
      topObserver.observe(topObserverRef.current);
    }

    let scrollTimeout;
    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        checkScrollPosition();
      }, 100);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      bottomObserver.disconnect();
      topObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [hasMoreMessages, connected, checkScrollPosition]);

  // Mark room as read
  useEffect(() => {
    if (room?.id && connected && isNearBottom && messages.length > 0) {
      markAsRead();
    }
  }, [room?.id, connected, isNearBottom, messages.length, markAsRead]);

  // Close more actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreActionsRef.current && !moreActionsRef.current.contains(event.target)) {
        setShowMoreActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOlderMessages = async () => {
    if (loadingMoreRef.current || !hasMoreMessages || loading) return;
    
    try {
      loadingMoreRef.current = true;
      setIsLoadingMore(true);
      
      const nextPage = page + 1;
      const container = messagesContainerRef.current;
      const prevScrollHeight = container.scrollHeight;
      const prevScrollTop = container.scrollTop;
      
      const loadedCount = await loadMoreMessages(nextPage);
      
      if (loadedCount > 0) {
        setPage(nextPage);
        
        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          const heightDiff = newScrollHeight - prevScrollHeight;
          container.scrollTop = prevScrollTop + heightDiff;
        });
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
      toast.error('Failed to load older messages');
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  };

  const performSearch = async (query, filters = searchFilters) => {
    if (!query.trim() && !filters.sender && !filters.dateFrom) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }

    try {
      setSearchLoading(true);
      
      const searchRequest = {
        query: query.trim(),
        chatRoomId: room?.id,
        fromDate: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : null,
        toDate: filters.dateTo ? new Date(filters.dateTo).toISOString() : null,
        senderId: filters.sender ? parseInt(filters.sender) : null,
        messageType: filters.messageType !== 'all' ? filters.messageType.toUpperCase() : null,
        page: 0,
        size: 100
      };

      const response = await chatAPI.searchMessages(searchRequest);
      setSearchResults(response.data || []);
      setCurrentSearchIndex(response.data?.length > 0 ? 0 : -1);
      
      if (response.data?.length > 0) {
        scrollToMessage(response.data[0].id);
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
      setSearchResults([]);
      setCurrentSearchIndex(-1);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      performSearch(query);
    }, 500);
  };

  const navigateSearchResult = (direction) => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
    } else {
      newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
    }
    
    setCurrentSearchIndex(newIndex);
    scrollToMessage(searchResults[newIndex].id);
  };

  const scrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      shouldAutoScroll.current = false;
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      messageElement.classList.add('bg-yellow-100', 'border-l-4', 'border-yellow-400', 'pl-2');
      setTimeout(() => {
        messageElement.classList.remove('bg-yellow-100', 'border-l-4', 'border-yellow-400', 'pl-2');
      }, 2000);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(-1);
    setSearchFilters({
      dateFrom: '',
      dateTo: '',
      sender: '',
      messageType: 'all'
    });
  };

  // FIXED: Handle sending message with proper content structure
  const handleSendMessage = (content) => {
    // FIXED: Ensure content is always a string for regular messages
    let messageToSend;
    
    if (replyingTo) {
      // For replies, create proper message structure
      messageToSend = {
        content: typeof content === 'string' ? content : String(content),
        parentMessageId: replyingTo.id
      };
      setReplyingTo(null);
    } else {
      // For regular messages, ensure it's a string
      messageToSend = typeof content === 'string' ? content : String(content);
    }
    
    const success = sendMessage(messageToSend);
    
    // Force auto-scroll and ensure input area stays visible
    if (success) {
      shouldAutoScroll.current = true;
      setIsNearBottom(true);
      setShowNewMessageAlert(false);
      setUnreadCount(0);
      // Immediate scroll to maintain input visibility
      setTimeout(() => {
        scrollToBottom('auto', true);
      }, 50);
    }
    
    return success;
  };

  const handleReactToMessage = async (messageId, reactionType) => {
    try {
      // Make the API call
      await chatAPI.reactToMessage(messageId, reactionType);
      
      // The useRoomChat hook should automatically refresh the messages
      // If it doesn't, you might need to add a manual refresh mechanism
      // For now, we'll let the WebSocket or polling mechanism handle the update
      
      toast.success('Reaction added');
    } catch (error) {
      console.error('Failed to react to message:', error);
      toast.error('Failed to add reaction');
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
    // Keep scroll at bottom when replying
    setTimeout(() => {
      if (isNearBottom) {
        scrollToBottom('smooth');
      }
    }, 100);
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      await chatAPI.editMessage(messageId, newContent);
      toast.success('Message updated');
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to edit message');
      throw error;
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await chatAPI.deleteMessage(messageId);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
      throw error;
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      await chatAPI.pinMessage(messageId);
      toast.success('Message pinned');
    } catch (error) {
      console.error('Failed to pin message:', error);
      toast.error('Failed to pin message');
      throw error;
    }
  };

  const handleScrollToBottomClick = () => {
    shouldAutoScroll.current = true;
    setShowNewMessageAlert(false);
    setUnreadCount(0);
    setIsNearBottom(true);
    scrollToBottom('smooth', true);
  };

  const getRoomIcon = () => {
    switch (room?.roomType) {
      case 'DIRECT_MESSAGE':
        return <User className="h-5 w-5" />;
      case 'GROUP_CHAT':
        return room.isPrivate ? <Lock className="h-5 w-5" /> : <Hash className="h-5 w-5" />;
      case 'TASK_CHAT':
        return <Hash className="h-5 w-5" />;
      case 'GLOBAL_CHAT':
        return <Globe className="h-5 w-5" />;
      default:
        return <MessageCircle className="h-5 w-5" />;
    }
  };

  const getRoomTitle = () => {
    if (room?.roomType === 'DIRECT_MESSAGE') {
      return room.dmParticipantName || room.dmParticipantUsername || 'Direct Message';
    }
    return room?.displayName || room?.roomName || 'Unknown Room';
  };

  const getRoomSubtitle = () => {
    if (room?.roomType === 'DIRECT_MESSAGE') {
      const status = room.dmParticipantStatus || 'offline';
      const statusColors = {
        online: 'text-green-600',
        away: 'text-yellow-600',
        busy: 'text-red-600',
        offline: 'text-gray-500'
      };
      return (
        <span className={`${statusColors[status]}`}>
          @{room.dmParticipantUsername} • {status}
        </span>
      );
    }
    
    if (room?.roomType === 'GROUP_CHAT') {
      const memberText = room.memberCount === 1 ? 'member' : 'members';
      return `${room.memberCount || 0} ${memberText}`;
    }
    
    if (room?.roomType === 'TASK_CHAT') {
      return `Task Chat • ${room.taskTitle || `Task #${room.taskId}`}`;
    }
    
    return room?.roomDescription || 'General chat';
  };

  const getStatusIndicator = () => {
    if (room?.roomType === 'DIRECT_MESSAGE' && room.dmParticipantStatus) {
      const colors = {
        online: 'bg-green-500',
        away: 'bg-yellow-500',
        busy: 'bg-red-500',
        offline: 'bg-gray-400'
      };
      
      return (
        <div className={`w-3 h-3 rounded-full ${colors[room.dmParticipantStatus] || colors.offline}`} />
      );
    }
    return null;
  };

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <MessageCircle className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No room selected</h3>
          <p className="text-gray-500">Select a room to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
      {/* Room Header */}
      <div className="flex-shrink-0 px-4 md:px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="flex-shrink-0 relative">
              <div className="text-gray-600 p-2 bg-gray-100 rounded-lg">
                {getRoomIcon()}
              </div>
              {getStatusIndicator() && (
                <div className="absolute -bottom-1 -right-1">
                  {getStatusIndicator()}
                </div>
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {getRoomTitle()}
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {getRoomSubtitle()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg transition-colors ${
                showSearch ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Search messages"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Room Actions */}
            {room?.roomType === 'DIRECT_MESSAGE' && (
              <div className="hidden sm:flex items-center space-x-2">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Video className="h-5 w-5" />
                </button>
              </div>
            )}
            
            {room?.roomType === 'GROUP_CHAT' && (
              <button
                onClick={() => setShowMembersModal(true)}
                className="hidden sm:flex p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="View members"
              >
                <Users className="h-5 w-5" />
              </button>
            )}

            {/* More Actions */}
            <div className="relative" ref={moreActionsRef}>
              <button
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="More options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {showMoreActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowRoomInfo(!showRoomInfo);
                        setShowMoreActions(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Info className="h-4 w-4 mr-3" />
                      Room Info
                    </button>
                    {room?.roomType === 'GROUP_CHAT' && (
                      <button
                        onClick={() => {
                          setShowMembersModal(true);
                          setShowMoreActions(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 sm:hidden"
                      >
                        <Users className="h-4 w-4 mr-3" />
                        View Members
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowSearch(true);
                        setShowMoreActions(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Search className="h-4 w-4 mr-3" />
                      Search Messages
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search messages..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader className="w-4 h-4 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
              
              {searchResults.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {currentSearchIndex + 1} of {searchResults.length}
                  </span>
                  <button
                    onClick={() => navigateSearchResult('prev')}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                    title="Previous result"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigateSearchResult('next')}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                    title="Next result"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowSearch(false)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Advanced Search Filters */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select
                value={searchFilters.messageType}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, messageType: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="all">All Types</option>
                <option value="chat">Messages</option>
                <option value="file">Files</option>
                <option value="image">Images</option>
              </select>
              
              <input
                type="date"
                value={searchFilters.dateFrom}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-xs"
                placeholder="From date"
              />
              
              <input
                type="date"
                value={searchFilters.dateTo}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-xs"
                placeholder="To date"
              />
              
              <select
                value={searchFilters.sender}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, sender: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="">All Users</option>
                {members.map(member => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName || member.username}
                  </option>
                ))}
              </select>
              
              {(searchQuery || searchFilters.dateFrom || searchFilters.dateTo || searchFilters.sender) && (
                <button
                  onClick={clearSearch}
                  className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Connection Status */}
        {!connected && (
          <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm text-yellow-800">Reconnecting...</span>
              </div>
              <button
                onClick={reconnect}
                className="text-sm text-yellow-700 hover:text-yellow-900 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area - FIXED scroll behavior */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-gray-50 relative"
        style={{ 
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {hasMoreMessages && (
          <div ref={topObserverRef} className="h-1" />
        )}
        
        {isLoadingMore && (
          <div className="flex justify-center items-center py-4">
            <Loader className="animate-spin h-5 w-5 text-blue-500 mr-2" />
            <span className="text-sm text-gray-600">Loading older messages...</span>
          </div>
        )}
        
        {!hasMoreMessages && messages.length > 20 && (
          <div className="flex justify-center py-4">
            <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
              Beginning of conversation
            </span>
          </div>
        )}

        {error && (
          <div className="mx-4 my-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            {!connected && (
              <button
                onClick={reconnect}
                className="ml-2 text-red-800 underline hover:no-underline"
              >
                Try reconnecting
              </button>
            )}
          </div>
        )}

        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Loader className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" />
              <span className="text-gray-600">Loading messages...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-6 min-h-64">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              {getRoomIcon()}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {room?.roomType === 'DIRECT_MESSAGE' 
                ? `Start a conversation with ${getRoomTitle()}`
                : `Welcome to ${getRoomTitle()}`
              }
            </h3>
            <p className="text-sm text-center max-w-md">
              {room?.roomType === 'DIRECT_MESSAGE'
                ? 'Send a message to get the conversation started!'
                : 'This is the beginning of your conversation in this room.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {messages.map((message, index) => {
              const parentMessage = message.parentMessageId 
                ? messages.find(m => m.id === message.parentMessageId)
                : null;
              
              return (
                <div
                  key={`message-${message.id}-${message.reactions || 'no-reactions'}-${index}`}
                  id={`message-${message.id}`}
                  className={`transition-colors duration-300 ${
                    searchResults.some(result => result.id === message.id) ? 'bg-yellow-50' : ''
                  }`}
                >
                  <ChatMessage
                    message={message}
                    isOwn={message.senderId === currentUserId}
                    currentUserId={currentUserId}
                    onlineUsers={members}
                    onReactToMessage={handleReactToMessage}
                    onReplyToMessage={handleReplyToMessage}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onPinMessage={handlePinMessage}
                    parentMessage={parentMessage}
                    isSearchResult={searchResults.some(result => result.id === message.id)}
                  />
                </div>
              );
            })}
            <TypingIndicator users={typingUsers} />
            <div ref={messagesEndRef} className="h-1"></div>
          </div>
        )}
      </div>

      {/* New Message Alert */}
      {showNewMessageAlert && unreadCount > 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={handleScrollToBottomClick}
            className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <span>{unreadCount} new message{unreadCount !== 1 ? 's' : ''}</span>
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && !showNewMessageAlert && (
        <button
          onClick={handleScrollToBottomClick}
          className="absolute bottom-20 right-4 bg-gray-600 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-10"
          title="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Reply className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-800 font-medium">
                Replying to {replyingTo.senderName}
              </span>
              <span className="text-xs text-blue-600 truncate">
                {replyingTo.content}
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Message Input - FIXED to stay visible */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white">
        <UserMentionInput
          onSendMessage={handleSendMessage}
          onStartTyping={startTyping}
          onStopTyping={stopTyping}
          connected={connected}
          onlineUsers={members}
          placeholder={
            replyingTo 
              ? `Reply to ${replyingTo.senderName}...`
              : `Message ${getRoomTitle()}...`
          }
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

      {/* Modals */}
      {showMembersModal && room?.roomType === 'GROUP_CHAT' && (
        <RoomMembersModal
          room={room}
          members={members}
          currentUserId={currentUserId}
          onClose={() => setShowMembersModal(false)}
        />
      )}

      {/* Room Info Sidebar */}
      {showRoomInfo && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-xl z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Room Info</h3>
              <button
                onClick={() => setShowRoomInfo(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Room Details */}
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    {getRoomIcon()}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{getRoomTitle()}</h4>
                    <p className="text-sm text-gray-500">{getRoomSubtitle()}</p>
                  </div>
                </div>
                
                {room?.roomDescription && (
                  <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">{room.roomDescription}</p>
                )}
              </div>

              {/* Room Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {room?.messageCount || messages.length}
                  </div>
                  <div className="text-sm text-gray-500">Messages</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {room?.memberCount || members.length}
                  </div>
                  <div className="text-sm text-gray-500">Members</div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {room?.roomType === 'GROUP_CHAT' && room.canInviteMembers && (
                  <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center transition-colors">
                    <UserPlus className="h-4 w-4 mr-3" />
                    Add members
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    setShowSearch(true);
                    setShowRoomInfo(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center transition-colors"
                >
                  <Search className="h-4 w-4 mr-3" />
                  Search in conversation
                </button>
                
                <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center transition-colors">
                  <Settings className="h-4 w-4 mr-3" />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomChatPanel;