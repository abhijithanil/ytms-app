import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  MessageCircle, 
  Wifi, 
  WifiOff, 
  Settings, 
  Search, 
  X, 
  ChevronUp, 
  ChevronDown,
  Filter,
  Calendar 
} from "lucide-react";
import { useChat } from "../../hook/useChat";
import { useAuth } from "../../context/AuthContext";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import OnlineUsers from "./OnlineUsers";
import UserMentionInput from "./UserMentionInput";
import { chatAPI } from "../../services/api";

const ChatPanel = ({
  taskId = null,
  className = "",
  showOnlineUsers = true,
}) => {
  const { user } = useAuth();
  const {
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
    reconnect,
  } = useChat(taskId);

  // UI State
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  
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
  
  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const statusMenuRef = useRef(null);
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
    
    setIsUserAtBottom(isAtBottom);
    setShowScrollToBottom(!isAtBottom);
    shouldAutoScroll.current = isAtBottom;
    
    return isAtBottom;
  }, []);

  // Handle scroll events
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkIfUserAtBottom();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkIfUserAtBottom]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const hasNewMessages = messages.length > lastMessageCount.current;
    lastMessageCount.current = messages.length;

    if (hasNewMessages && messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (isUserAtBottom || shouldAutoScroll.current) {
          scrollToBottom();
        }
      }, 50);
    }
  }, [messages, isUserAtBottom, scrollToBottom]);

  // Scroll to bottom when component first loads with messages
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => {
        scrollToBottom(true); // Force scroll on initial load
      }, 100);
    }
  }, [messages.length, loading, scrollToBottom]);

  // Auto-scroll when user sends a message
  const handleSendMessage = useCallback((content) => {
    // Force scroll to bottom when user sends a message
    shouldAutoScroll.current = true;
    const result = sendMessage(content);
    
    // Ensure scroll happens after message is sent
    setTimeout(() => {
      scrollToBottom(true);
    }, 100);
    
    return result;
  }, [sendMessage, scrollToBottom]);

  // Force scroll to bottom when button is clicked
  const handleScrollToBottomClick = useCallback(() => {
    shouldAutoScroll.current = true;
    scrollToBottom(true);
  }, [scrollToBottom]);

  // Close status menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target)
      ) {
        setShowStatusMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when search is opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

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
        chatRoomId: null, // Global search for regular chat
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
      shouldAutoScroll.current = false; // Disable auto-scroll when jumping to message
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

  const handleStatusChange = (status) => {
    updateUserStatus(status);
    setShowStatusMenu(false);
  };

  const getConnectionStatus = () => {
    if (loading)
      return { color: "text-yellow-600", text: "Connecting...", icon: Wifi };
    if (connected)
      return { color: "text-green-600", text: "Connected", icon: Wifi };
    return { color: "text-red-600", text: "Disconnected", icon: WifiOff };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <div className={`flex flex-col h-full bg-white ${className} relative`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-blue-500" />
          <h2 className="font-semibold text-gray-900">
            {taskId ? "Task Chat" : "Team Chat"}
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${
              showSearch ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Search messages"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Status Menu */}
          <div className="relative" ref={statusMenuRef}>
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Change status"
              disabled={!connected}
            >
              <Settings className="h-4 w-4 text-gray-600" />
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <button
                    onClick={() => handleStatusChange("online")}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    Online
                  </button>
                  <button
                    onClick={() => handleStatusChange("away")}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                    Away
                  </button>
                  <button
                    onClick={() => handleStatusChange("busy")}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    Busy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 ${status.color}`}>
              <StatusIcon className="h-4 w-4" />
              <span className="text-sm">{status.text}</span>
            </div>
            {!connected && !loading && (
              <button
                onClick={reconnect}
                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 space-y-3 flex-shrink-0">
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
            
            <select
              value={searchFilters.sender}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, sender: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="">All Users</option>
              {onlineUsers.map(user => (
                <option key={user.userId} value={user.userId}>
                  {user.displayName || user.username}
                </option>
              ))}
            </select>
            
            {(searchQuery || searchFilters.dateFrom || searchFilters.dateTo || searchFilters.sender) && (
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

      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages Container */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 bg-gray-50"
            style={{ scrollBehavior: 'smooth' }}
          >
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

            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading chat...</span>
              </div>
            ) : !connected ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <WifiOff className="h-12 w-12 mb-2 text-red-400" />
                <p className="text-lg font-medium">Connection Lost</p>
                <p className="text-sm">Unable to connect to chat</p>
                <button
                  onClick={reconnect}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Reconnect
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
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
                      isOwn={message.senderId === user?.id}
                      currentUserId={user?.id}
                      onlineUsers={onlineUsers}
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
              onClick={handleScrollToBottomClick}
              className="absolute bottom-20 right-6 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-10"
              title="Scroll to bottom"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          )}

          {/* Message Input */}
          <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
            <UserMentionInput
              onSendMessage={handleSendMessage}
              onStartTyping={startTyping}
              onStopTyping={stopTyping}
              connected={connected}
              onlineUsers={onlineUsers}
            />
          </div>
        </div>

        {/* Online Users Sidebar */}
        {showOnlineUsers && (
          <div className="w-80 border-l border-gray-200 flex-shrink-0">
            <OnlineUsers users={onlineUsers} />
          </div>
        )}
      </div>

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

export default ChatPanel;