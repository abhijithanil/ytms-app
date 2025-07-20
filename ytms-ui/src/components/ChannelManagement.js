import React, { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, Users, Youtube, Search, X, MoreVertical, Key, Link, Unlink, ExternalLink, RefreshCw } from "lucide-react";
import { youtubeChannelAPI, usersAPI, youtubeOAuthAPI } from "../services/api";
import toast from "react-hot-toast";

const ConnectYouTubeModal = ({ isOpen, onClose, onAccountConnected }) => {
  const [channelName, setChannelName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!channelName.trim()) {
      toast.error("Please enter a channel name");
      return;
    }

    setIsConnecting(true);
    try {
      const response = await youtubeOAuthAPI.startConnect(channelName.trim());
      if (response.data.authorizationUrl) {
        // Open the authorization URL in a new window
        window.open(response.data.authorizationUrl, '_blank', 'width=600,height=600');
        toast.success("Authorization window opened. Please complete the OAuth flow.");
        onClose();
        // The parent component should handle refreshing the accounts list
        setTimeout(() => onAccountConnected(), 2000);
      } else {
        toast.error("Failed to get authorization URL");
      }
    } catch (error) {
      console.error("Error starting YouTube OAuth:", error);
      toast.error(error.response?.data?.error || "Failed to start YouTube connection");
    } finally {
      setIsConnecting(false);
    }
  };

  const resetForm = () => {
    setChannelName("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Link className="h-5 w-5 text-blue-600 mr-2" />
            Connect YouTube Account
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel Name Reference
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Enter a reference name for this connection"
              disabled={isConnecting}
            />
            <p className="text-xs text-gray-500 mt-1">
              This is just for reference - you'll connect to all channels in the YouTube account
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-1">What happens next:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• You'll be redirected to Google for authorization</li>
              <li>• All channels in your YouTube account will be imported</li>
              <li>• You can manage channel access afterwards</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              disabled={isConnecting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConnect}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm flex items-center justify-center"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Connect Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConnectedAccountsModal = ({ isOpen, onClose, onAccountDisconnected }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConnectedAccounts();
    }
  }, [isOpen]);

  const fetchConnectedAccounts = async () => {
    setLoading(true);
    try {
      const response = await youtubeOAuthAPI.getConnectedAccounts();
      setAccounts(response.data || []);
    } catch (error) {
      console.error("Error fetching connected accounts:", error);
      toast.error("Failed to load connected accounts");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (email) => {
    if (window.confirm(`Are you sure you want to disconnect the YouTube account "${email}"? This will remove all associated channels.`)) {
      try {
        await youtubeOAuthAPI.disconnectAccount(email);
        toast.success("Account disconnected successfully");
        setAccounts(prev => prev.filter(acc => acc.email !== email));
        onAccountDisconnected();
      } catch (error) {
        console.error("Error disconnecting account:", error);
        toast.error(error.response?.data?.error || "Failed to disconnect account");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Youtube className="h-5 w-5 text-red-600 mr-2" />
            Connected YouTube Accounts
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading connected accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8">
            <Youtube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Connected Accounts</h3>
            <p className="text-gray-600">Connect your first YouTube account to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <Youtube className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{account.email}</h4>
                      <p className="text-xs text-gray-500">
                        Connected: {new Date(account.connectedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(account.email)}
                    className="text-red-600 hover:text-red-800 text-sm flex items-center space-x-1"
                  >
                    <Unlink className="h-4 w-4" />
                    <span>Disconnect</span>
                  </button>
                </div>

                <div className="ml-11">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Channels ({account.channels?.length || 0})
                  </h5>
                  {account.channels && account.channels.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {account.channels.map((channel) => (
                        <div
                          key={channel.id}
                          className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-2"
                        >
                          <div className="font-medium">{channel.name}</div>
                          <div className="text-xs text-gray-500">{channel.channelId}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No channels found</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateChannelModal = ({ isOpen, onClose, onChannelCreated }) => {
  const [formData, setFormData] = useState({
    channelName: "",
    channelId: "",
    channelUrl: "",
    description: "",
    thumbnailUrl: "",
    usersWithAccess: [],
    youtubeChannelOwnerEmail: "",
    refreshTokenKey: ""
  });
  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Auto-generate refresh token key when channel name changes
  useEffect(() => {
    if (formData.channelName) {
      const generatedKey = "YT_REFRESH_TOKEN_" + formData.channelName.toUpperCase().replaceAll(/[^A-Z0-9]/g, "_");
      setFormData(prev => ({ ...prev, refreshTokenKey: generatedKey }));
    }
  }, [formData.channelName]);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    }
  };

  const validateChannelId = (channelId) => {
    const channelIdRegex = /^UC[a-zA-Z0-9_-]{22}$/;
    return channelIdRegex.test(channelId);
  };

  const validateRefreshTokenKey = (key) => {
    // Should only contain uppercase letters, numbers, and underscores
    const keyRegex = /^[A-Z0-9_]+$/;
    return keyRegex.test(key);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.channelName.trim()) {
      toast.error("Channel name is required");
      return;
    }

    if (!formData.channelId.trim()) {
      toast.error("Channel ID is required");
      return;
    }

    if (!validateChannelId(formData.channelId)) {
      toast.error("Invalid YouTube channel ID format (should start with UC and be 24 characters)");
      return;
    }

    if (!formData.refreshTokenKey.trim()) {
      toast.error("Refresh token key is required");
      return;
    }

    if (!validateRefreshTokenKey(formData.refreshTokenKey)) {
      toast.error("Refresh token key should only contain uppercase letters, numbers, and underscores");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await youtubeChannelAPI.createChannel(formData);
      if (response.data.success) {
        toast.success("YouTube channel created successfully!");
        onChannelCreated(response.data.channel);
        onClose();
        resetForm();
      } else {
        toast.error(response.data.message || "Failed to create channel");
      }
    } catch (error) {
      console.error("Error creating channel:", error);
      toast.error(error.response?.data?.message || "Failed to create channel");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      channelName: "",
      channelId: "",
      channelUrl: "",
      description: "",
      thumbnailUrl: "",
      usersWithAccess: [],
      youtubeChannelOwnerEmail: "",
      refreshTokenKey: ""
    });
  };

  const handleUserAccessChange = (userId, checked) => {
    setFormData(prev => ({
      ...prev,
      usersWithAccess: checked
        ? [...prev.usersWithAccess, userId]
        : prev.usersWithAccess.filter(id => id !== userId)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 mr-2" />
            Add YouTube Channel
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Channel Name *
              </label>
              <input
                type="text"
                value={formData.channelName}
                onChange={(e) => setFormData(prev => ({ ...prev, channelName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Enter channel name"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Channel ID *
              </label>
              <input
                type="text"
                value={formData.channelId}
                onChange={(e) => setFormData(prev => ({ ...prev, channelId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="UC..."
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in YouTube Studio under Channel → Settings → Basic info
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel URL
            </label>
            <input
              type="url"
              value={formData.channelUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, channelUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="https://www.youtube.com/channel/..."
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows="3"
              placeholder="Brief description of the channel"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thumbnail URL
            </label>
            <input
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="https://..."
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel Owner Email
            </label>
            <input
              type="email"
              value={formData.youtubeChannelOwnerEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, youtubeChannelOwnerEmail: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="owner@gmail.com"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Refresh Token Key *
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.refreshTokenKey}
                onChange={(e) => setFormData(prev => ({ ...prev, refreshTokenKey: e.target.value.toUpperCase() }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                placeholder="YT_REFRESH_TOKEN_CHANNEL_NAME"
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Unique key for storing YouTube API refresh token. Auto-generated from channel name.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              User Access
            </label>
            <div className="max-h-32 sm:max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
              {users.length === 0 ? (
                <p className="text-sm text-gray-500">Loading users...</p>
              ) : (
                users.map(user => (
                  <label key={user.id} className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.usersWithAccess.includes(user.id)}
                      onChange={(e) => handleUserAccessChange(user.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-700">
                      {user.firstName} {user.lastName} ({user.username})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionsDropdown = ({ channel, onEdit, onDelete, onManageAccess }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <button
                onClick={() => {
                  onManageAccess(channel);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Access
              </button>
              <button
                onClick={() => {
                  onEdit(channel);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Channel
              </button>
              <button
                onClick={() => {
                  onDelete(channel);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Channel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ChannelCard = ({ channel, onEdit, onDelete, onManageAccess }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {channel.thumbnailUrl ? (
            <img
              src={channel.thumbnailUrl}
              alt={channel.channelName}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 ${channel.thumbnailUrl ? 'hidden' : ''}`}>
            <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{channel.channelName}</h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">ID: {channel.channelId}</p>
            {channel.refreshTokenKey && (
              <p className="text-xs text-gray-400 truncate font-mono flex items-center">
                <Key className="h-3 w-3 mr-1" />
                {channel.refreshTokenKey}
              </p>
            )}
          </div>
        </div>
        <ActionsDropdown 
          channel={channel}
          onEdit={onEdit}
          onDelete={onDelete}
          onManageAccess={onManageAccess}
        />
      </div>

      {channel.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{channel.description}</p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-500 space-y-1 sm:space-y-0">
        <div className="flex flex-col space-y-1">
          <span className="truncate">
            Added by: {channel.addedBy?.firstName} {channel.addedBy?.lastName}
          </span>
          {channel.youtubeChannelOwnerEmail && (
            <span className="truncate">
              Owner: {channel.youtubeChannelOwnerEmail}
            </span>
          )}
        </div>
        <span className="text-right">
          {channel.usersWithAccess?.length || 0} users with access
        </span>
      </div>

      {channel.channelUrl && (
        <a
          href={channel.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm mt-3"
        >
          <Youtube className="h-4 w-4" />
          <span>View Channel</span>
        </a>
      )}
    </div>
  );
};

const ChannelManagement = () => {
  const [channels, setChannels] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [filteredChannels, setFilteredChannels] = useState([]);

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    const filtered = channels.filter(channel =>
      channel.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.channelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (channel.youtubeChannelOwnerEmail && channel.youtubeChannelOwnerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (channel.refreshTokenKey && channel.refreshTokenKey.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredChannels(filtered);
  }, [channels, searchQuery]);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const response = await youtubeChannelAPI.getAllChannels();
      setChannels(response.data || []);
    } catch (error) {
      console.error("Error fetching channels:", error);
      toast.error("Failed to load YouTube channels");
      setChannels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelCreated = (newChannel) => {
    setChannels(prev => [...prev, newChannel]);
  };

  const handleAccountConnected = () => {
    // Refresh the channels list after an account is connected
    fetchChannels();
  };

  const handleAccountDisconnected = () => {
    // Refresh the channels list after an account is disconnected
    fetchChannels();
  };

  const handleEdit = (channel) => {
    toast("Edit functionality coming soon!", {
      icon: "ℹ️",
    });
    console.log("Edit channel:", channel);
    // TODO: Implement edit functionality
  };

  const handleDelete = async (channel) => {
    if (window.confirm(`Are you sure you want to delete "${channel.channelName}"?`)) {
      try {
        await youtubeChannelAPI.deleteChannel(channel.id);
        setChannels(prev => prev.filter(c => c.id !== channel.id));
        toast.success("Channel deleted successfully");
      } catch (error) {
        console.error("Error deleting channel:", error);
        toast.error(error.response?.data?.message || "Failed to delete channel");
      }
    }
  };

  const handleManageAccess = (channel) => {
    toast("Access management functionality coming soon!", {
      icon: "ℹ️",
    });
    console.log("Manage access for channel:", channel);
    // TODO: Implement access management functionality
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 sm:h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Youtube className="h-5 w-5 text-red-600 mr-2" />
            YouTube Channels
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage your YouTube channels and user access
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => setIsAccountsModalOpen(true)}
            className="flex items-center justify-center space-x-2 text-gray-700 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm w-full sm:w-auto"
          >
            <Users className="h-4 w-4" />
            <span>Connected Accounts</span>
          </button>
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm w-full sm:w-auto"
          >
            <Link className="h-4 w-4" />
            <span>Connect YouTube</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex btn-primary items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Manual</span>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels by name, ID, owner, or token key..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {filteredChannels.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <Youtube className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? "No channels found" : "No YouTube channels"}
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Start by adding your first YouTube channel"
            }
          </p>
          {!searchQuery && (
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-center">
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Link className="h-4 w-4" />
                <span>Connect YouTube Account</span>
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex btn-primary items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Manual Channel</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredChannels.map(channel => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onManageAccess={handleManageAccess}
            />
          ))}
        </div>
      )}

      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onChannelCreated={handleChannelCreated}
      />

      <ConnectYouTubeModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onAccountConnected={handleAccountConnected}
      />

      <ConnectedAccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        onAccountDisconnected={handleAccountDisconnected}
      />
    </div>
  );
};

export default ChannelManagement;