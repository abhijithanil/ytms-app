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

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    const threshold = isMobile ? 100 : 150;
    
    const nearBottom = distanceFromBottom < threshold;
    setIsNearBottom(nearBottom);
    setShowScrollToBottom(!nearBottom && scrollHeight > clientHeight);
    shouldAutoScroll.current = nearBottom;
    
    if (nearBottom) {
      setShowNewMessageAlert(false);
      setUnreadCount(0);
    }
  }, [isMobile]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const hasNewMessages = messages.length > lastMessageCount.current;
    const newMessagesCount = messages.length - lastMessageCount.current;
    lastMessageCount.current = messages.length;

    if (hasNewMessages && newMessagesCount > 0) {
      const latestMessages = messages.slice(-newMessagesCount);
      const hasOwnMessage = latestMessages.some(msg => msg.senderId === currentUserId);
      
      if (hasOwnMessage || shouldAutoScroll.current) {
        setTimeout(() => {
          scrollToBottom('smooth', hasOwnMessage);
          if (hasOwnMessage) {
            setIsNearBottom(true);
            setShowNewMessageAlert(false);
            setUnreadCount(0);
          }
        }, 50);
      } else if (!hasOwnMessage) {
        setShowNewMessageAlert(true);
        setUnreadCount(prev => prev + newMessagesCount);
      }
    }
  }, [messages, currentUserId, scrollToBottom]);

  // Initial scroll to bottom
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

  // Set up intersection observers for infinite scroll and scroll position tracking
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
        rootMargin: isMobile ? '0px 0px -30px 0px' : '0px 0px -50px 0px'
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
        rootMargin: isMobile ? '50px 0px 0px 0px' : '100px 0px 0px 0px'
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
  }, [hasMoreMessages, connected, checkScrollPosition, isMobile]);

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

  const handleSendMessage = (content) => {
    let messageToSend;
    
    if (replyingTo) {
      messageToSend = {
        content: typeof content === 'string' ? content : String(content),
        parentMessageId: replyingTo.id
      };
      setReplyingTo(null);
    } else {
      messageToSend = typeof content === 'string' ? content : String(content);
    }
    
    const success = sendMessage(messageToSend);
    
    if (success) {
      shouldAutoScroll.current = true;
      setIsNearBottom(true);
      setShowNewMessageAlert(false);
      setUnreadCount(0);
      setTimeout(() => {
        scrollToBottom('auto', true);
      }, 50);
    }
    
    return success;
  };

  const handleReactToMessage = async (messageId, reactionType) => {
    try {
      await chatAPI.reactToMessage(messageId, reactionType);
      toast.success('Reaction added');
    } catch (error) {
      console.error('Failed to react to message:', error);
      toast.error('Failed to add reaction');
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
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
    const iconClass = isMobile ? "h-4 w-4" : "h-5 w-5";
    switch (room?.roomType) {
      case 'DIRECT_MESSAGE':
        return <User className={iconClass} />;
      case 'GROUP_CHAT':
        return room.isPrivate ? <Lock className={iconClass} /> : <Hash className={iconClass} />;
      case 'TASK_CHAT':
        return <Hash className={iconClass} />;
      case 'GLOBAL_CHAT':
        return <Globe className={iconClass} />;
      default:
        return <MessageCircle className={iconClass} />;
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
      
      const size = isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3';
      
      return (
        <div className={`${size} rounded-full ${colors[room.dmParticipantStatus] || colors.offline}`} />
      );
    }
    return null;
  };

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className={`text-center max-w-md mx-auto ${isMobile ? 'p-3' : 'p-6'}`}>
          <div className={`mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center ${
            isMobile ? 'w-12 h-12 mb-3' : 'w-20 h-20 mb-6'
          }`}>
            <MessageCircle className={`text-gray-400 ${isMobile ? 'h-6 w-6' : 'h-10 w-10'}`} />
          </div>
          <h3 className={`font-semibold text-gray-900 mb-2 ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>No room selected</h3>
          <p className={`text-gray-500 ${isMobile ? 'text-sm' : ''}`}>
            Select a room to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
      {/* Room Header */}
      <div className={`flex-shrink-0 border-b border-gray-200 bg-white ${
        isMobile ? 'px-3 py-2' : 'px-4 md:px-6 py-4'
      }`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center min-w-0 flex-1 ${isMobile ? 'space-x-2' : 'space-x-3'}`}>
            <div className="flex-shrink-0 relative">
              <div className={`text-gray-600 bg-gray-100 rounded-lg ${
                isMobile ? 'p-1.5' : 'p-2'
              }`}>
                {getRoomIcon()}
              </div>
              {getStatusIndicator() && (
                <div className="absolute -bottom-1 -right-1">
                  {getStatusIndicator()}
                </div>
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <h2 className={`font-semibold text-gray-900 truncate ${
                isMobile ? 'text-sm' : 'text-lg'
              }`}>
                {getRoomTitle()}
              </h2>
              <p className={`text-gray-500 truncate ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>
                {getRoomSubtitle()}
              </p>
            </div>
          </div>

          <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`rounded-lg transition-colors ${
                showSearch ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              } ${isMobile ? 'p-1.5' : 'p-2'}`}
              title="Search messages"
            >
              <Search className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
            </button>

            {room?.roomType === 'DIRECT_MESSAGE' && !isMobile && (
              <div className="hidden sm:flex items-center space-x-2">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Video className="h-5 w-5" />
                </button>
              </div>
            )}
            
            {room?.roomType === 'GROUP_CHAT' && !isMobile && (
              <button
                onClick={() => setShowMembersModal(true)}
                className="hidden sm:flex p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="View members"
              >
                <Users className="h-5 w-5" />
              </button>
            )}

            <div className="relative" ref={moreActionsRef}>
              <button
                onClick={() => setShowMoreActions(!showMoreActions)}
                className={`text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ${
                  isMobile ? 'p-1.5' : 'p-2'
                }`}
                title="More options"
              >
                <MoreVertical className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
              </button>

              {showMoreActions && (
                <div className={`absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 ${
                  isMobile ? 'w-40' : 'w-48'
                }`}>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowRoomInfo(!showRoomInfo);
                        setShowMoreActions(false);
                      }}
                      className={`flex items-center w-full text-gray-700 hover:bg-gray-100 ${
                        isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'
                      }`}
                    >
                      <Info className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-3'}`} />
                      Room Info
                    </button>
                    {room?.roomType === 'GROUP_CHAT' && (
                      <button
                        onClick={() => {
                          setShowMembersModal(true);
                          setShowMoreActions(false);
                        }}
                        className={`flex items-center w-full text-gray-700 hover:bg-gray-100 ${
                          isMobile ? 'px-3 py-2 text-xs sm:hidden' : 'px-4 py-2 text-sm sm:hidden'
                        }`}
                      >
                        <Users className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-3'}`} />
                        View Members
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowSearch(true);
                        setShowMoreActions(false);
                      }}
                      className={`flex items-center w-full text-gray-700 hover:bg-gray-100 ${
                        isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'
                      }`}
                    >
                      <Search className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-3'}`} />
                      Search Messages
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showSearch && (
          <div className={`space-y-2 ${isMobile ? 'mt-2' : 'mt-4 space-y-3'}`}>
            <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
              <div className="flex-1 relative">
                <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${
                  isMobile ? 'left-2.5 h-3 w-3' : 'left-3 h-4 w-4'
                }`} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search messages..."
                  className={`w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isMobile 
                      ? 'pl-8 pr-3 py-2 text-sm' 
                      : 'pl-10 pr-4 py-2.5'
                  }`}
                />
                {searchLoading && (
                  <div className={`absolute top-1/2 transform -translate-y-1/2 ${
                    isMobile ? 'right-2.5' : 'right-3'
                  }`}>
                    <Loader className={`animate-spin text-blue-500 ${
                      isMobile ? 'w-3 h-3' : 'w-4 h-4'
                    }`} />
                  </div>
                )}
              </div>
              
              {searchResults.length > 0 && (
                <div className={`flex items-center ${isMobile ? 'space-x-0.5' : 'space-x-1'}`}>
                  <span className={`text-gray-500 whitespace-nowrap ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}>
                    {currentSearchIndex + 1} of {searchResults.length}
                  </span>
                  <button
                    onClick={() => navigateSearchResult('prev')}
                    className={`text-gray-600 hover:bg-gray-100 rounded ${
                      isMobile ? 'p-1' : 'p-1.5'
                    }`}
                    title="Previous result"
                  >
                    <ChevronUp className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                  </button>
                  <button
                    onClick={() => navigateSearchResult('next')}
                    className={`text-gray-600 hover:bg-gray-100 rounded ${
                      isMobile ? 'p-1' : 'p-1.5'
                    }`}
                    title="Next result"
                  >
                    <ChevronDown className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowSearch(false)}
                className={`text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ${
                  isMobile ? 'p-1.5' : 'p-2'
                }`}
                title="Close search"
              >
                <X className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              </button>
            </div>

            <div className={`flex flex-wrap items-center gap-1 ${
              isMobile ? 'text-xs' : 'gap-2 text-sm'
            }`}>
              <select
                value={searchFilters.messageType}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, messageType: e.target.value }))}
                className={`border border-gray-300 rounded ${
                  isMobile ? 'px-1.5 py-1 text-xs' : 'px-2 py-1'
                }`}
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
                className={`border border-gray-300 rounded ${
                  isMobile ? 'px-1.5 py-1 text-xs' : 'px-2 py-1'
                }`}
                placeholder="From date"
              />
              
              <input
                type="date"
                value={searchFilters.dateTo}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className={`border border-gray-300 rounded ${
                  isMobile ? 'px-1.5 py-1 text-xs' : 'px-2 py-1'
                }`}
                placeholder="To date"
              />
              
              <select
                value={searchFilters.sender}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, sender: e.target.value }))}
                className={`border border-gray-300 rounded ${
                  isMobile ? 'px-1.5 py-1 text-xs' : 'px-2 py-1'
                }`}
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
                  className={`text-blue-600 hover:text-blue-800 ${
                    isMobile ? 'px-1.5 py-1 text-xs' : 'px-2 py-1 text-xs'
                  }`}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {!connected && (
          <div className={`px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg ${
            isMobile ? 'mt-2' : 'mt-3'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                <span className={`text-yellow-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Reconnecting...
                </span>
              </div>
              <button
                onClick={reconnect}
                className={`text-yellow-700 hover:text-yellow-900 underline ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

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
          <div className={`flex justify-center items-center ${isMobile ? 'py-2' : 'py-4'}`}>
            <Loader className={`animate-spin text-blue-500 mr-2 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Loading older messages...
            </span>
          </div>
        )}
        
        {!hasMoreMessages && messages.length > 20 && (
          <div className={`flex justify-center ${isMobile ? 'py-2' : 'py-4'}`}>
            <span className={`text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              Beginning of conversation
            </span>
          </div>
        )}

        {error && (
          <div className={`mx-4 my-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 ${
            isMobile ? 'text-xs' : 'text-sm'
          }`}>
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
          <div className={`flex justify-center items-center ${isMobile ? 'h-40' : 'h-64'}`}>
            <div className="text-center">
              <Loader className={`animate-spin text-blue-500 mx-auto mb-4 ${
                isMobile ? 'h-6 w-6 mb-2' : 'h-8 w-8'
              }`} />
              <span className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
                Loading messages...
              </span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className={`flex-1 flex flex-col items-center justify-center text-gray-500 p-3 ${
            isMobile ? 'min-h-40' : 'min-h-64 p-6'
          }`}>
            <div className={`bg-gray-100 rounded-full flex items-center justify-center mb-4 ${
              isMobile ? 'w-12 h-12 mb-2' : 'w-16 h-16'
            }`}>
              {getRoomIcon()}
            </div>
            <h3 className={`font-medium text-gray-900 mb-2 ${
              isMobile ? 'text-sm' : 'text-lg'
            }`}>
              {room?.roomType === 'DIRECT_MESSAGE' 
                ? `Start a conversation with ${getRoomTitle()}`
                : `Welcome to ${getRoomTitle()}`
              }
            </h3>
            <p className={`text-center max-w-md ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
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

      {showNewMessageAlert && unreadCount > 0 && (
        <div className={`absolute left-1/2 transform -translate-x-1/2 z-20 ${
          isMobile ? 'bottom-16' : 'bottom-20'
        }`}>
          <button
            onClick={handleScrollToBottomClick}
            className={`bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 ${
              isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'
            }`}
          >
            <span>{unreadCount} new message{unreadCount !== 1 ? 's' : ''}</span>
            <ArrowDown className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
          </button>
        </div>
      )}

      {showScrollToBottom && !showNewMessageAlert && (
        <button
          onClick={handleScrollToBottomClick}
          className={`absolute bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors z-10 ${
            isMobile 
              ? 'bottom-12 right-2 w-10 h-10' 
              : 'bottom-20 right-4 w-12 h-12'
          }`}
          title="Scroll to bottom"
        >
          <ArrowDown className={`mx-auto ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
        </button>
      )}

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

      {showMembersModal && room?.roomType === 'GROUP_CHAT' && (
        <RoomMembersModal
          room={room}
          members={members}
          currentUserId={currentUserId}
          onClose={() => setShowMembersModal(false)}
        />
      )}

      {showRoomInfo && (
        <div className={`fixed inset-y-0 right-0 bg-white border-l border-gray-200 shadow-xl z-50 overflow-y-auto ${
          isMobile ? 'w-full' : 'w-80'
        }`}>
          <div className={isMobile ? 'p-4' : 'p-6'}>
            <div className={`flex items-center justify-between ${
              isMobile ? 'mb-4' : 'mb-6'
            }`}>
              <h3 className={`font-semibold text-gray-900 ${
                isMobile ? 'text-base' : 'text-lg'
              }`}>Room Info</h3>
              <button
                onClick={() => setShowRoomInfo(false)}
                className={`hover:bg-gray-100 rounded ${
                  isMobile ? 'p-1' : 'p-1'
                }`}
              >
                <X className={`text-gray-600 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </button>
            </div>
            
            <div className={isMobile ? 'space-y-4' : 'space-y-6'}>
              <div>
                <div className={`flex items-center mb-4 ${
                  isMobile ? 'space-x-2' : 'space-x-3'
                }`}>
                  <div className={`bg-gray-100 rounded-lg ${
                    isMobile ? 'p-2' : 'p-3'
                  }`}>
                    {getRoomIcon()}
                  </div>
                  <div>
                    <h4 className={`font-medium text-gray-900 ${
                      isMobile ? 'text-sm' : ''
                    }`}>{getRoomTitle()}</h4>
                    <p className={`text-gray-500 ${
                      isMobile ? 'text-xs' : 'text-sm'
                    }`}>{getRoomSubtitle()}</p>
                  </div>
                </div>
                
                {room?.roomDescription && (
                  <p className={`text-gray-600 p-3 bg-gray-50 rounded-lg ${
                    isMobile ? 'text-sm mb-3' : 'text-sm mb-4'
                  }`}>{room.roomDescription}</p>
                )}
              </div>

              <div className={`grid grid-cols-2 ${isMobile ? 'gap-3' : 'gap-4'}`}>
                <div className={`text-center bg-gray-50 rounded-lg ${
                  isMobile ? 'p-3' : 'p-4'
                }`}>
                  <div className={`font-bold text-gray-900 ${
                    isMobile ? 'text-lg' : 'text-2xl'
                  }`}>
                    {room?.messageCount || messages.length}
                  </div>
                  <div className={`text-gray-500 ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}>Messages</div>
                </div>
                <div className={`text-center bg-gray-50 rounded-lg ${
                  isMobile ? 'p-3' : 'p-4'
                }`}>
                  <div className={`font-bold text-gray-900 ${
                    isMobile ? 'text-lg' : 'text-2xl'
                  }`}>
                    {room?.memberCount || members.length}
                  </div>
                  <div className={`text-gray-500 ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}>Members</div>
                </div>
              </div>

              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                {room?.roomType === 'GROUP_CHAT' && room.canInviteMembers && (
                  <button className={`w-full text-left text-gray-700 hover:bg-gray-100 rounded-lg flex items-center transition-colors ${
                    isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-sm'
                  }`}>
                    <UserPlus className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-3'}`} />
                    Add members
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    setShowSearch(true);
                    setShowRoomInfo(false);
                  }}
                  className={`w-full text-left text-gray-700 hover:bg-gray-100 rounded-lg flex items-center transition-colors ${
                    isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-sm'
                  }`}
                >
                  <Search className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-3'}`} />
                  Search in conversation
                </button>
                
                <button className={`w-full text-left text-gray-700 hover:bg-gray-100 rounded-lg flex items-center transition-colors ${
                  isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-sm'
                }`}>
                  <Settings className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-3'}`} />
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
