import React, { useState, useRef, useEffect,useCallback } from 'react';
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
  Filter,
  Calendar,
  FileText
} from 'lucide-react';
import { useRoomChat } from '../../hook/useRoomChat';
import { useAuth } from '../../context/AuthContext';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import UserMentionInput from './UserMentionInput';
import RoomMembersModal from './RoomMembersModal';
import { chatAPI } from '../../services/api';

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
  
  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTimeout = useRef(null);
  const lastMessageCount = useRef(0);
  const shouldAutoScroll = useRef(true);

  // Smooth scroll to bottom function
  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current && (shouldAutoScroll.current || force)) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end',
        inline: 'nearest'
      });
    }
  }, []);

  // Check if user is at bottom of messages
  const checkIfUserAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // pixels from bottom
    const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;
    
    setShowScrollToBottom(!isAtBottom);
    shouldAutoScroll.current = isAtBottom;
    
    return isAtBottom;
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const hasNewMessages = messages.length > lastMessageCount.current;
    lastMessageCount.current = messages.length;

    if (hasNewMessages && messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (shouldAutoScroll.current) {
          scrollToBottom();
        }
      }, 50);
    }
  }, [messages, scrollToBottom]);

  // Scroll to bottom when component first loads with messages
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => {
        scrollToBottom(true); // Force scroll on initial load
      }, 100);
    }
  }, [messages.length, loading, scrollToBottom]);

  // Handle scroll events
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Show scroll to bottom button if user has scrolled up
      setShowScrollToBottom(distanceFromBottom > 100);
      shouldAutoScroll.current = distanceFromBottom < 100;
      
      // Load more messages when scrolling to top
      if (scrollTop < 100 && !isLoadingMore && hasMoreMessages && connected) {
        loadOlderMessages();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMoreMessages, connected]);

  // Mark room as read when room changes or messages are received
  useEffect(() => {
    if (room?.id && connected && messages.length > 0) {
      markAsRead();
    }
  }, [room?.id, connected, messages.length, markAsRead]);

  // Focus search input when search is opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);



  const loadOlderMessages = async () => {
    if (isLoadingMore || !hasMoreMessages) return;
    
    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const loadedCount = await loadMoreMessages(nextPage);
      
      if (loadedCount > 0) {
        setPage(nextPage);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Search functionality
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
      
      // Highlight first result
      if (response.data?.length > 0) {
        scrollToMessage(response.data[0].id);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setCurrentSearchIndex(-1);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
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
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight message briefly
      messageElement.classList.add('bg-yellow-100');
      setTimeout(() => {
        messageElement.classList.remove('bg-yellow-100');
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
    return sendMessage(content);
  };

  // Enhanced message interaction handlers
  const handleMessageReaction = async (messageId, emoji) => {
    try {
      // TODO: Implement API call for message reactions
      console.log('Adding reaction:', { messageId, emoji });
      // await chatAPI.addReaction(messageId, emoji);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleEditMessage = (message) => {
    // TODO: Implement message editing functionality
    console.log('Editing message:', message);
    // You would typically open an edit modal or inline editor here
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      if (window.confirm('Are you sure you want to delete this message?')) {
        // TODO: Implement API call for message deletion
        console.log('Deleting message:', messageId);
        // await chatAPI.deleteMessage(messageId);
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleReplyToMessage = (message) => {
    // TODO: Implement message reply functionality
    console.log('Replying to message:', message);
    // You would typically set the message as a reply context
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
      return `@${room.dmParticipantUsername} • ${status}`;
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
        <div className="text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No room selected</h3>
          <p className="mt-1 text-sm text-gray-500">Select a room to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white relative">
      {/* Room Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="flex-shrink-0 relative">
              <div className="text-gray-600">
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
              <>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Video className="h-5 w-5" />
                </button>
              </>
            )}
            
            {room?.roomType === 'GROUP_CHAT' && (
              <button
                onClick={() => setShowMembersModal(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="View members"
              >
                <Users className="h-5 w-5" />
              </button>
            )}

            <button
              onClick={() => setShowRoomInfo(!showRoomInfo)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Info className="h-5 w-5" />
            </button>
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              {/* Search Navigation */}
              {searchResults.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-500">
                    {currentSearchIndex + 1} of {searchResults.length}
                  </span>
                  <button
                    onClick={() => navigateSearchResult('prev')}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                    title="Previous result"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigateSearchResult('next')}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
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
            <div className="flex items-center space-x-2 text-sm">
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
              
              {(searchQuery || searchFilters.dateFrom || searchFilters.dateTo) && (
                <button
                  onClick={clearSearch}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
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
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
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

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 bg-gray-50 relative"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Load More Messages Indicator */}
        {isLoadingMore && (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-600">Loading older messages...</span>
          </div>
        )}
        
        {!hasMoreMessages && messages.length > 0 && (
          <div className="flex justify-center py-4">
            <span className="text-sm text-gray-500">No more messages to load</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
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
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            {getRoomIcon()}
            <p className="text-lg font-medium mt-2">
              {room?.roomType === 'DIRECT_MESSAGE' 
                ? `Start a conversation with ${getRoomTitle()}`
                : `Welcome to ${getRoomTitle()}`
              }
            </p>
            <p className="text-sm">
              {room?.roomType === 'DIRECT_MESSAGE'
                ? 'Send a message to get the conversation started!'
                : 'This is the beginning of your conversation in this room.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => (
              <div
                key={`${message.id}-${message.createdAt}-${index}`}
                id={`message-${message.id}`}
                className={`transition-colors duration-300 ${
                  searchResults.some(result => result.id === message.id) ? 'search-highlight' : ''
                }`}
              >
                <ChatMessage
                  message={message}
                  isOwn={message.senderId === currentUserId}
                  currentUserId={currentUserId}
                  onlineUsers={members}
                  onReaction={(messageId, emoji) => handleMessageReaction(messageId, emoji)}
                  onEdit={(message) => handleEditMessage(message)}
                  onDelete={(messageId) => handleDeleteMessage(messageId)}
                  onReply={(message) => handleReplyToMessage(message)}
                />
              </div>
            ))}
            <TypingIndicator users={typingUsers} />
            {/* This div acts as the scroll anchor */}
            <div ref={messagesEndRef} className="h-1"></div>
          </div>
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <button
          onClick={() => {
            shouldAutoScroll.current = true;
            scrollToBottom(true);
          }}
          className="absolute bottom-20 right-6 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-10"
          title="Scroll to bottom"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Message Input */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white">
        <UserMentionInput
          onSendMessage={handleSendMessage}
          onStartTyping={startTyping}
          onStopTyping={stopTyping}
          connected={connected}
          onlineUsers={members}
          placeholder={`Message ${getRoomTitle()}...`}
        />
      </div>

      {/* Room Members Modal */}
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
        <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50">
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
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getRoomIcon()}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{getRoomTitle()}</h4>
                    <p className="text-sm text-gray-500">{getRoomSubtitle()}</p>
                  </div>
                </div>
                
                {room?.roomDescription && (
                  <p className="text-sm text-gray-600 mb-4">{room.roomDescription}</p>
                )}
              </div>

              {/* Room Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">
                    {room?.messageCount || messages.length}
                  </div>
                  <div className="text-sm text-gray-500">Messages</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">
                    {room?.memberCount || members.length}
                  </div>
                  <div className="text-sm text-gray-500">Members</div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {room?.roomType === 'GROUP_CHAT' && room.canInviteMembers && (
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center">
                    <UserPlus className="h-4 w-4 mr-3" />
                    Add members
                  </button>
                )}
                
                <button 
                  onClick={() => setShowSearch(true)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center"
                >
                  <Search className="h-4 w-4 mr-3" />
                  Search in conversation
                </button>
                
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center">
                  <Settings className="h-4 w-4 mr-3" />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Highlight Styles */}
      <style jsx>{`
        .search-highlight {
          background-color: rgba(59, 130, 246, 0.1);
          border-left: 3px solid #3b82f6;
          padding-left: 8px;
          margin-left: -8px;
        }
      `}</style>
    </div>
  );
};

export default RoomChatPanel;