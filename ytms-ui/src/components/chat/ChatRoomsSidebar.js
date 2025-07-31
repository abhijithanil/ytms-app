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
  ChevronRight
} from 'lucide-react';
import { chatAPI } from '../../services/api';

const ChatRoomsSidebar = ({ selectedRoomId, onRoomSelect, currentUserId }) => {
  const [chatRooms, setChatRooms] = useState({
    directMessages: [],
    groupChats: [],
    taskChats: [],
    globalChat: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    directMessages: true,
    groupChats: true,
    taskChats: false
  });

  useEffect(() => {
    loadChatRooms();
  }, []);

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getChatRoomList();
      setChatRooms(response.data);
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
      setError('Failed to load chat rooms');
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
      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
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
      <div className={`w-2 h-2 rounded-full ${colors[status] || colors.offline}`} />
    );
  };

  const getRoomIcon = (room) => {
    switch (room.roomType) {
      case 'DIRECT_MESSAGE':
        return <User className="h-4 w-4" />;
      case 'GROUP_CHAT':
        return room.isPrivate ? <Lock className="h-4 w-4" /> : <Users className="h-4 w-4" />;
      case 'TASK_CHAT':
        return <Hash className="h-4 w-4" />;
      case 'GLOBAL_CHAT':
        return <Globe className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
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
        const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
        return room.roomType === 'DIRECT_MESSAGE' ? preview : `${senderName}: ${preview}`;
    }
  };

  const filterRooms = (rooms) => {
    if (!searchTerm) return rooms;
    
    return rooms.filter(room => 
      room.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.dmParticipantName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const SectionHeader = ({ title, count, isExpanded, onToggle, children }) => (
    <div className="px-3 py-2">
      <button
        onClick={onToggle}
        className="flex items-center w-full text-sm font-medium text-gray-700 hover:text-gray-900 group"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 mr-1" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-1" />
        )}
        <span className="flex-1 text-left">{title}</span>
        {count > 0 && (
          <span className="text-xs text-gray-500 ml-2">({count})</span>
        )}
        <div className="ml-2 opacity-0 group-hover:opacity-100">
          {children}
        </div>
      </button>
    </div>
  );

  const RoomItem = ({ room, isSelected, onClick }) => (
    <button
      onClick={() => onClick(room)}
      className={`w-full px-3 py-2 flex items-center space-x-3 hover:bg-gray-100 transition-colors ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
      }`}
    >
      <div className="flex-shrink-0 relative">
        <div className={`p-1.5 rounded ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
          {getRoomIcon(room)}
        </div>
        {room.roomType === 'DIRECT_MESSAGE' && room.dmParticipantStatus && (
          <div className="absolute -bottom-0.5 -right-0.5">
            {getStatusIndicator(room.dmParticipantStatus)}
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium truncate ${
            isSelected ? 'text-blue-900' : 'text-gray-900'
          } ${room.hasUnreadMessages() ? 'font-semibold' : ''}`}>
            {room.displayName || room.roomName}
          </span>
          {getUnreadBadge(room.unreadCount)}
        </div>
        
        {room.lastMessage && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {formatLastMessage(room)}
          </p>
        )}
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 bg-gray-50 border-r border-gray-200 p-4">
        <div className="text-red-600 text-sm">{error}</div>
        <button
          onClick={loadChatRooms}
          className="mt-2 text-blue-600 text-sm hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Messages</h2>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Settings className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto">
        {/* Global Chat */}
        {chatRooms.globalChat && (
          <div className="py-2">
            <RoomItem
              room={chatRooms.globalChat}
              isSelected={selectedRoomId === chatRooms.globalChat.id}
              onClick={onRoomSelect}
            />
          </div>
        )}

        {/* Direct Messages */}
        <div className="border-t border-gray-200">
          <SectionHeader
            title="Direct Messages"
            count={chatRooms.directMessages.length}
            isExpanded={expandedSections.directMessages}
            onToggle={() => toggleSection('directMessages')}
          >
            <Plus className="h-4 w-4" />
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
                <div className="px-6 py-3 text-sm text-gray-500 text-center">
                  {searchTerm ? 'No matching conversations' : 'No direct messages yet'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Group Chats */}
        <div className="border-t border-gray-200">
          <SectionHeader
            title="Channels"
            count={chatRooms.groupChats.length}
            isExpanded={expandedSections.groupChats}
            onToggle={() => toggleSection('groupChats')}
          >
            <Plus className="h-4 w-4" />
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
                <div className="px-6 py-3 text-sm text-gray-500 text-center">
                  {searchTerm ? 'No matching channels' : 'No channels yet'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task Chats */}
        {chatRooms.taskChats.length > 0 && (
          <div className="border-t border-gray-200">
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