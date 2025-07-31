import React, { useState, useEffect } from 'react';
import { X, Search, User, MessageCircle } from 'lucide-react';
import { userAPI, chatAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CreateDirectMessageModal = ({ onClose, onDirectMessageCreated }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.firstName && u.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.lastName && u.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAllUsers();
      // Filter out current user
      const otherUsers = response.data.filter(u => u.id !== user.id);
      setUsers(otherUsers);
      setFilteredUsers(otherUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDirectMessage = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const response = await chatAPI.createOrGetDirectMessage(selectedUser.id);
      onDirectMessageCreated(response.data);
    } catch (error) {
      console.error('Failed to create direct message:', error);
      setError('Failed to create direct message');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName, lastName, username) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return username ? username[0].toUpperCase() : '?';
  };

  const getDisplayName = (user) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.username;
  };

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
              <h3 className="text-lg font-medium text-gray-900">New Message</h3>
              <p className="text-sm text-gray-500 mt-1">Start a direct conversation</p>
            </div>
            <button
              onClick={onClose}
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
                placeholder="Search by name, username, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-b border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Users List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading users...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <User className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm ? 'No users found' : 'No users available'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedUser?.id === u.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {getInitials(u.firstName, u.lastName, u.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {getDisplayName(u)}
                        </p>
                        <p className="text-sm text-gray-500 truncate">@{u.username}</p>
                        {u.email && (
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        )}
                      </div>
                      {selectedUser?.id === u.id && (
                        <div className="text-blue-500">
                          <MessageCircle className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              {selectedUser ? `Selected: ${getDisplayName(selectedUser)}` : 'Select a user to message'}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDirectMessage}
                disabled={!selectedUser || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Start Chat'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateDirectMessageModal;