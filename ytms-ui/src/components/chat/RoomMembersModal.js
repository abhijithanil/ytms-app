import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  User, 
  Crown, 
  Shield, 
  UserPlus, 
  UserMinus, 
  MoreVertical,
  Settings,
  Circle
} from 'lucide-react';
import { chatAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const RoomMembersModal = ({ room, members, currentUserId, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [memberMenuOpen, setMemberMenuOpen] = useState(null);

  useEffect(() => {
    setFilteredMembers(
      members.filter(member => 
        member.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.username?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, members]);

  useEffect(() => {
    if (showAddMembers) {
      loadAvailableUsers();
    }
  }, [showAddMembers]);

  const loadAvailableUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAllUsers();
      // Filter out current members and current user
      const memberIds = new Set([...members.map(m => m.userId), currentUserId]);
      const available = response.data.filter(user => !memberIds.has(user.id));
      setAvailableUsers(available);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load available users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setLoading(true);
      await chatAPI.addMembersToRoom(room.id, {
        userIds: selectedUsers.map(u => u.id),
        defaultRole: 'MEMBER'
      });
      
      toast.success(`Added ${selectedUsers.length} member${selectedUsers.length > 1 ? 's' : ''}`);
      setShowAddMembers(false);
      setSelectedUsers([]);
      // Refresh members list would be handled by parent component
    } catch (error) {
      console.error('Failed to add members:', error);
      toast.error('Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await chatAPI.removeMemberFromRoom(room.id, userId);
      toast.success('Member removed');
      setMemberMenuOpen(null);
      // Refresh members list would be handled by parent component
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'OWNER':
        return 'Owner';
      case 'ADMIN':
        return 'Admin';
      case 'MEMBER':
      default:
        return 'Member';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'away':
        return 'text-yellow-500';
      case 'busy':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getInitials = (name, username) => {
    if (name && name.includes(' ')) {
      const parts = name.split(' ');
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return username ? username[0].toUpperCase() : '?';
  };

  const getDisplayName = (member) => {
    return member.displayName || member.username || 'Unknown User';
  };

  const canManageMembers = () => {
    const currentMember = members.find(m => m.userId === currentUserId);
    return currentMember && (currentMember.role === 'OWNER' || currentMember.role === 'ADMIN');
  };

  const canRemoveMember = (member) => {
    if (member.userId === currentUserId) return false; // Can't remove self
    const currentMember = members.find(m => m.userId === currentUserId);
    if (!currentMember) return false;
    
    // Owner can remove anyone except themselves
    if (currentMember.role === 'OWNER') {
      return member.role !== 'OWNER';
    }
    
    // Admin can remove members but not owners or other admins
    if (currentMember.role === 'ADMIN') {
      return member.role === 'MEMBER';
    }
    
    return false;
  };

  if (showAddMembers) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowAddMembers(false)}></div>
          </div>

          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Add Members</h3>
                <p className="text-sm text-gray-500 mt-1">Add people to "{room.roomName}"</p>
              </div>
              <button
                onClick={() => setShowAddMembers(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {selectedUsers.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected ({selectedUsers.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div
                        key={user.id}
                        className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{user.firstName ? `${user.firstName} ${user.lastName}` : user.username}</span>
                        <button
                          onClick={() => toggleUserSelection(user)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Users List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-8">
                  <User className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No users available to add</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {availableUsers
                    .filter(user =>
                      !searchTerm ||
                      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map(user => {
                      const isSelected = selectedUsers.find(u => u.id === user.id);
                      return (
                        <button
                          key={user.id}
                          onClick={() => toggleUserSelection(user)}
                          className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                              {getInitials(user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null, user.username)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
                              </p>
                              <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                            </div>
                            {isSelected && (
                              <div className="text-blue-500">
                                <UserPlus className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddMembers(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMembers}
                  disabled={selectedUsers.length === 0 || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Members'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Members</h3>
              <p className="text-sm text-gray-500 mt-1">
                {members.length} member{members.length !== 1 ? 's' : ''} in "{room.roomName}"
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {canManageMembers() && (
                <button
                  onClick={() => setShowAddMembers(true)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Add members"
                >
                  <UserPlus className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-b border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Members List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8">
                <User className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm ? 'No matching members' : 'No members found'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredMembers.map((member) => (
                  <div key={member.id || member.userId} className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {getInitials(member.displayName, member.username)}
                        </div>
                        {member.status && (
                          <Circle className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${getStatusColor(member.status)} fill-current`} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {getDisplayName(member)}
                          </p>
                          {getRoleIcon(member.role)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-500 truncate">@{member.username}</p>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{getRoleText(member.role)}</span>
                        </div>
                      </div>

                      {canRemoveMember(member) && (
                        <div className="relative">
                          <button
                            onClick={() => setMemberMenuOpen(memberMenuOpen === member.userId ? null : member.userId)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {memberMenuOpen === member.userId && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => handleRemoveMember(member.userId)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  <UserMinus className="h-4 w-4 mr-3" />
                                  Remove from channel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomMembersModal;