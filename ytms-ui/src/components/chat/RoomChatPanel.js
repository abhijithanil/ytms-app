import React, { useState, useRef, useEffect } from 'react';
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
  Search
} from 'lucide-react';
import { useRoomChat } from '../../hook/useRoomChat'; // Fixed: use named import
import { useAuth } from '../../context/AuthContext';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import UserMentionInput from './UserMentionInput';
import RoomMembersModal from './RoomMembersModal';

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
    reconnect
  } = useRoomChat(room?.id);

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark room as read when room changes or messages are received
  useEffect(() => {
    if (room?.id && connected && messages.length > 0) {
      markAsRead();
    }
  }, [room?.id, connected, messages.length, markAsRead]);

  const handleSendMessage = (content) => {
    return sendMessage(content);
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
    <div className="flex-1 flex flex-col bg-white">
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

            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={() => setShowRoomInfo(!showRoomInfo)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
        </div>

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
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
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
              <ChatMessage
                key={`${message.id}-${message.createdAt}-${index}`}
                message={message}
                isOwn={message.senderId === currentUserId}
                currentUserId={currentUserId}
                onlineUsers={members}
              />
            ))}
            <TypingIndicator users={typingUsers} />
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

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
                <Info className="h-5 w-5 text-gray-600" />
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
                    {room?.messageCount || 0}
                  </div>
                  <div className="text-sm text-gray-500">Messages</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">
                    {room?.memberCount || 0}
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
                
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center">
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
    </div>
  );
};

export default RoomChatPanel;