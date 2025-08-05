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

const ChatRoomsSidebar = ({ selectedRoomId, onRoomSelect, currentUserId }) => {
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

  console.log('🎯 ChatRoomsSidebar: Render', {
    currentUserId,
    selectedRoomId,
    loading,
    error,
    roomsCount: {
      directMessages: chatRooms.directMessages?.length || 0,
      groupChats: chatRooms.groupChats?.length || 0,
      taskChats: chatRooms.taskChats?.length || 0,
      globalChat: !!chatRooms.globalChat
    }
  });

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
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getUnreadBadge = (unreadCount) => {
    if (!unreadCount || unreadCount === 0) return null;
    
    return (
      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center font-medium">
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
    
    return (
      <div className={`w-2.5 h-2.5 rounded-full ${colors[status] || colors.offline}`} />
    );
  };

  const getRoomIcon = (room) => {
    const iconClass = "h-4 w-4";
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
        const preview = content?.length > 45 ? content.substring(0, 45) + '...' : content || '';
        return room.roomType === 'DIRECT_MESSAGE' ? preview : `${senderName}: ${preview}`;
    }
  };

  const filterRooms = (rooms) => {
    if (!searchTerm || !Array.isArray(rooms)) return rooms || [];
    
    return rooms.filter(room => 
      room.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.dmParticipantName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const hasUnreadMessages = (room) => {
    return room.unreadCount && room.unreadCount > 0;
  };

  const SectionHeader = ({ title, count, isExpanded, onToggle, children }) => (
    <div className="px-3 py-2 flex-shrink-0">
      <button
        onClick={onToggle}
        className="flex items-center w-full text-sm font-semibold text-gray-700 hover:text-gray-900 group transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 mr-2 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-2 text-gray-500" />
        )}
        <span className="flex-1 text-left">{title}</span>
        {count > 0 && (
          <span className="text-xs text-gray-500 ml-2">({count})</span>
        )}
        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {children}
        </div>
      </button>
    </div>
  );

  const RoomItem = ({ room, isSelected, onClick }) => (
    <button
      onClick={() => onClick(room)}
      className={`w-full px-3 py-3 flex items-center space-x-3 hover:bg-gray-100 transition-colors text-left group ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
      }`}
    >
      <div className="flex-shrink-0 relative">
        <div className={`p-2 rounded-lg transition-colors ${
          isSelected ? 'text-blue-600 bg-blue-100' : 'text-gray-500 bg-gray-100 group-hover:bg-gray-200'
        }`}>
          {getRoomIcon(room)}
        </div>
        {room.roomType === 'DIRECT_MESSAGE' && room.dmParticipantStatus && (
          <div className="absolute -bottom-0.5 -right-0.5">
            {getStatusIndicator(room.dmParticipantStatus)}
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium truncate ${
            isSelected ? 'text-blue-900' : 'text-gray-900'
          } ${hasUnreadMessages(room) ? 'font-semibold' : ''}`}>
            {room.displayName || room.roomName || 'Unknown Room'}
          </span>
          {getUnreadBadge(room.unreadCount)}
        </div>
        
        {room.lastMessage && (
          <p className="text-xs text-gray-500 truncate leading-relaxed">
            {formatLastMessage(room)}
          </p>
        )}
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="w-full h-full bg-white border-r border-gray-200 flex items-center justify-center">
        <div className="text-center py-8">
          <Loader className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-white border-r border-gray-200 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-sm mb-3">{error}</div>
          <button
            onClick={loadChatRooms}
            className="inline-flex items-center text-blue-600 text-sm hover:text-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Messages</h2>
          <div className="flex items-center space-x-1">
            <button 
              onClick={loadChatRooms}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-gray-600" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto">
        {/* Global Chat */}
        {chatRooms.globalChat && (
          <div className="py-2 border-b border-gray-100">
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
            <Plus className="h-4 w-4 text-gray-400" />
          </SectionHeader>
          
          {expandedSections.directMessages && (
            <div className="pb-2">
              {filterRooms(chatRooms.directMessages).map(room => (
                <RoomItem
                  key={room.id}
                  room={room}
                  isSelected={selectedRoomId === room.id}
                  onClick={onRoomSelect}
                />
              ))}
              {filterRooms(chatRooms.directMessages).length === 0 && (
                <div className="px-6 py-4 text-center">
                  <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
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
            <Plus className="h-4 w-4 text-gray-400" />
          </SectionHeader>
          
          {expandedSections.groupChats && (
            <div className="pb-2">
              {filterRooms(chatRooms.groupChats).map(room => (
                <RoomItem
                  key={room.id}
                  room={room}
                  isSelected={selectedRoomId === room.id}
                  onClick={onRoomSelect}
                />
              ))}
              {filterRooms(chatRooms.groupChats).length === 0 && (
                <div className="px-6 py-4 text-center">
                  <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
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
            
            {expandedSections.taskChats && (
              <div className="pb-2">
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