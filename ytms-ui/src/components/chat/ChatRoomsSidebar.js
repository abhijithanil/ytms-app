import React, { useState, useEffect } from 'react';
import { 
  Hash, 
  MessageCircle, 
  Users, 
  Plus, 
  Search, 
  Settings,
  Lock,
  Globe,
  User,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader
} from 'lucide-react';
import { chatAPI } from '../../services/api';

const ChatRoomsSidebar = ({ selectedRoomId, onRoomSelect, currentUserId, collapsed = false }) => {
  const [chatRooms, setChatRooms] = useState({
    directMessages: [],
    groupChats: [],
    taskChats: [],
    globalChat: null,
    totalUnreadCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    directMessages: true,
    groupChats: true,
    taskChats: false
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  console.log('🎯 ChatRoomsSidebar: Render', {
    currentUserId,
    selectedRoomId,
    loading,
    error,
    isMobile,
    collapsed,
    roomsCount: {
      directMessages: chatRooms.directMessages?.length || 0,
      groupChats: chatRooms.groupChats?.length || 0,
      taskChats: chatRooms.taskChats?.length || 0,
      globalChat: !!chatRooms.globalChat
    }
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadChatRooms();
  }, []);

  const loadChatRooms = async () => {
    try {
      console.log('🎯 ChatRoomsSidebar: Loading chat rooms...');
      setLoading(true);
      setError(null);
      
      const response = await chatAPI.getChatRoomList();
      console.log('🎯 ChatRoomsSidebar: Received chat rooms:', response.data);
      
      const roomsData = {
        directMessages: response.data?.directMessages || [],
        groupChats: response.data?.groupChats || [],
        taskChats: response.data?.taskChats || [],
        globalChat: response.data?.globalChat || null,
        totalUnreadCount: response.data?.totalUnreadCount || 0
      };
      
      setChatRooms(roomsData);
    } catch (error) {
      console.error('🎯 ChatRoomsSidebar: Failed to load chat rooms:', error);
      setError('Failed to load chat rooms');
      
      setChatRooms({
        directMessages: [],
        groupChats: [],
        taskChats: [],
        globalChat: null,
        totalUnreadCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    if (collapsed) return; // Don't allow toggling when collapsed
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getUnreadBadge = (unreadCount) => {
    if (!unreadCount || unreadCount === 0) return null;
    
    // When collapsed, show only a red dot
    if (collapsed) {
      return (
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
      );
    }
    
    return (
      <span className={`ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center font-medium ${
        isMobile ? 'text-xs px-1.5 py-0.5 min-w-[1rem] h-4' : ''
      }`}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    );
  };

  const getStatusIndicator = (status) => {
    const colors = {
      online: 'bg-green-500',
      away: 'bg-yellow-500',
      busy: 'bg-red-500',
      offline: 'bg-gray-400'
    };
    
    const size = isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5';
    
    return (
      <div className={`${size} rounded-full ${colors[status] || colors.offline}`} />
    );
  };

  const getRoomIcon = (room) => {
    const iconClass = collapsed ? "h-5 w-5" : (isMobile ? "h-3 w-3" : "h-4 w-4");
    switch (room.roomType) {
      case 'DIRECT_MESSAGE':
        return <User className={iconClass} />;
      case 'GROUP_CHAT':
        return room.isPrivate ? <Lock className={iconClass} /> : <Users className={iconClass} />;
      case 'TASK_CHAT':
        return <Hash className={iconClass} />;
      case 'GLOBAL_CHAT':
        return <Globe className={iconClass} />;
      default:
        return <MessageCircle className={iconClass} />;
    }
  };

  const formatLastMessage = (room) => {
    if (collapsed) return ''; // Don't show message preview when collapsed
    
    if (!room.lastMessage) return 'No messages yet';
    
    const { content, senderName, type } = room.lastMessage;
    
    switch (type) {
      case 'FILE':
        return `${senderName} shared a file`;
      case 'IMAGE':
        return `${senderName} shared an image`;
      case 'JOIN':
      case 'LEAVE':
      case 'SYSTEM':
        return content;
      default:
        const maxLength = isMobile ? 25 : 45;
        const preview = content?.length > maxLength ? content.substring(0, maxLength) + '...' : content || '';
        return room.roomType === 'DIRECT_MESSAGE' ? preview : `${senderName}: ${preview}`;
    }
  };

  const filterRooms = (rooms) => {
    if (!searchTerm || !Array.isArray(rooms) || collapsed) return rooms || [];
    
    return rooms.filter(room => 
      room.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.dmParticipantName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const hasUnreadMessages = (room) => {
    return room.unreadCount && room.unreadCount > 0;
  };

  const SectionHeader = ({ title, count, isExpanded, onToggle, children }) => {
    if (collapsed) return null; // Hide section headers when collapsed
    
    return (
      <div className={`flex-shrink-0 ${isMobile ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
        <button
          onClick={onToggle}
          className={`flex items-center w-full font-semibold text-gray-700 hover:text-gray-900 group transition-colors ${
            isMobile ? 'text-xs' : 'text-sm'
          }`}
        >
          {isExpanded ? (
            <ChevronDown className={`mr-1.5 text-gray-500 ${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4'}`} />
          ) : (
            <ChevronRight className={`mr-1.5 text-gray-500 ${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4'}`} />
          )}
          <span className="flex-1 text-left">{title}</span>
          {count > 0 && (
            <span className={`text-gray-500 ml-1 ${isMobile ? 'text-xs' : 'text-xs ml-2'}`}>({count})</span>
          )}
          <div className={`ml-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMobile ? 'ml-1' : 'ml-2'}`}>
            {children}
          </div>
        </button>
      </div>
    );
  };

  const RoomItem = ({ room, isSelected, onClick }) => (
    <button
      onClick={() => onClick(room)}
      className={`w-full flex items-center hover:bg-gray-100 transition-colors text-left group relative ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
      } ${
        collapsed 
          ? 'p-3 justify-center' 
          : isMobile 
            ? 'px-2 py-2 space-x-2' 
            : 'px-3 py-3 space-x-3'
      }`}
      title={collapsed ? (room.displayName || room.roomName || 'Unknown Room') : ''}
    >
      <div className="flex-shrink-0 relative">
        <div className={`rounded-lg transition-colors flex items-center justify-center ${
          isSelected ? 'text-blue-600 bg-blue-100' : 'text-gray-500 bg-gray-100 group-hover:bg-gray-200'
        } ${
          collapsed 
            ? 'p-2.5' 
            : isMobile 
              ? 'p-1.5' 
              : 'p-2'
        }`}>
          {getRoomIcon(room)}
        </div>
        
        {/* Status indicator for DMs */}
        {room.roomType === 'DIRECT_MESSAGE' && room.dmParticipantStatus && !collapsed && (
          <div className={`absolute ${isMobile ? '-bottom-0.5 -right-0.5' : '-bottom-0.5 -right-0.5'}`}>
            {getStatusIndicator(room.dmParticipantStatus)}
          </div>
        )}
        
        {/* Unread badge */}
        {getUnreadBadge(room.unreadCount)}
      </div>
      
      {/* Room details - hidden when collapsed */}
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className={`font-medium truncate ${
              isSelected ? 'text-blue-900' : 'text-gray-900'
            } ${hasUnreadMessages(room) ? 'font-semibold' : ''} ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              {room.displayName || room.roomName || 'Unknown Room'}
            </span>
          </div>
          
          {room.lastMessage && (
            <p className={`text-gray-500 truncate leading-relaxed ${
              isMobile ? 'text-xs' : 'text-xs'
            }`}>
              {formatLastMessage(room)}
            </p>
          )}
        </div>
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="w-full h-full bg-white border-r border-gray-200 flex items-center justify-center">
        <div className={`text-center ${isMobile ? 'py-4' : 'py-8'}`}>
          <Loader className={`animate-spin text-blue-500 mx-auto mb-2 ${
            collapsed ? 'h-6 w-6' : isMobile ? 'h-6 w-6 mb-1.5' : 'h-8 w-8 mb-3'
          }`} />
          {!collapsed && (
            <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Loading conversations...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full h-full bg-white border-r border-gray-200 flex items-center justify-center ${
        collapsed ? 'p-2' : isMobile ? 'p-2' : 'p-4'
      }`}>
        <div className="text-center">
          <div className={`text-red-600 mb-2 ${
            collapsed ? 'text-xs mb-1' : isMobile ? 'text-xs mb-1.5' : 'text-sm mb-3'
          }`}>
            {collapsed ? '!' : error}
          </div>
          <button
            onClick={loadChatRooms}
            className={`inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors ${
              collapsed ? 'text-xs p-1' : isMobile ? 'text-xs' : 'text-sm'
            }`}
            title={collapsed ? 'Try Again' : ''}
          >
            <RefreshCw className={`${collapsed ? 'h-4 w-4' : 'mr-1 h-3 w-3'} ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            {!collapsed && 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Header - Hidden when collapsed */}
      {!collapsed && (
        <div className={`flex-shrink-0 border-b border-gray-200 bg-white ${
          isMobile ? 'p-2' : 'p-4'
        }`}>
          {/* CORRECTED HEADER SECTION */}
          <div className={`flex items-center space-x-2 ${isMobile ? 'mb-2' : 'mb-4'}`}>
            <button 
              onClick={loadChatRooms}
              className={`hover:bg-gray-100 rounded-lg transition-colors ${
                isMobile ? 'p-1' : 'p-1.5'
              }`}
              title="Refresh"
            >
              <RefreshCw className={`text-gray-600 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </button>
            <h2 className={`font-semibold text-gray-900 ${isMobile ? 'text-sm' : ''}`}>
              Messages
            </h2>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${
              isMobile ? 'left-2 h-3 w-3' : 'left-3 h-4 w-4'
            }`} />
            <input
              type="text"
              placeholder="Search conversations"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                isMobile 
                  ? 'pl-7 pr-3 py-1.5 text-xs' 
                  : 'pl-10 pr-4 py-2.5 text-sm'
              }`}
            />
          </div>
        </div>
      )}

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto">
        {/* Global Chat */}
        {chatRooms.globalChat && (
          <div className={`border-b border-gray-100 ${isMobile ? 'py-1' : 'py-2'}`}>
            <RoomItem
              room={chatRooms.globalChat}
              isSelected={selectedRoomId === chatRooms.globalChat.id}
              onClick={onRoomSelect}
            />
          </div>
        )}

        {/* Direct Messages */}
        <div className="border-b border-gray-100">
          <SectionHeader
            title="Direct Messages"
            count={chatRooms.directMessages?.length || 0}
            isExpanded={expandedSections.directMessages}
            onToggle={() => toggleSection('directMessages')}
          >
            <Plus className={`text-gray-400 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
          </SectionHeader>
          
          {(collapsed || expandedSections.directMessages) && (
            <div className={isMobile ? 'pb-1' : 'pb-2'}>
              {filterRooms(chatRooms.directMessages).map(room => (
                <RoomItem
                  key={room.id}
                  room={room}
                  isSelected={selectedRoomId === room.id}
                  onClick={onRoomSelect}
                />
              ))}
              {!collapsed && filterRooms(chatRooms.directMessages).length === 0 && (
                <div className={`text-center ${isMobile ? 'px-3 py-2' : 'px-6 py-4'}`}>
                  <MessageCircle className={`text-gray-300 mx-auto mb-1 ${
                    isMobile ? 'h-5 w-5 mb-0.5' : 'h-8 w-8 mb-2'
                  }`} />
                  <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {searchTerm ? 'No matching conversations' : 'No direct messages yet'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Group Chats */}
        <div className="border-b border-gray-100">
          <SectionHeader
            title="Channels"
            count={chatRooms.groupChats?.length || 0}
            isExpanded={expandedSections.groupChats}
            onToggle={() => toggleSection('groupChats')}
          >
            <Plus className={`text-gray-400 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
          </SectionHeader>
          
          {(collapsed || expandedSections.groupChats) && (
            <div className={isMobile ? 'pb-1' : 'pb-2'}>
              {filterRooms(chatRooms.groupChats).map(room => (
                <RoomItem
                  key={room.id}
                  room={room}
                  isSelected={selectedRoomId === room.id}
                  onClick={onRoomSelect}
                />
              ))}
              {!collapsed && filterRooms(chatRooms.groupChats).length === 0 && (
                <div className={`text-center ${isMobile ? 'px-3 py-2' : 'px-6 py-4'}`}>
                  <Users className={`text-gray-300 mx-auto mb-1 ${
                    isMobile ? 'h-5 w-5 mb-0.5' : 'h-8 w-8 mb-2'
                  }`} />
                  <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {searchTerm ? 'No matching channels' : 'No channels yet'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task Chats */}
        {chatRooms.taskChats && chatRooms.taskChats.length > 0 && (
          <div>
            <SectionHeader
              title="Task Chats"
              count={chatRooms.taskChats.length}
              isExpanded={expandedSections.taskChats}
              onToggle={() => toggleSection('taskChats')}
            />
            
            {(collapsed || expandedSections.taskChats) && (
              <div className={isMobile ? 'pb-1' : 'pb-2'}>
                {filterRooms(chatRooms.taskChats).map(room => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    isSelected={selectedRoomId === room.id}
                    onClick={onRoomSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoomsSidebar;
