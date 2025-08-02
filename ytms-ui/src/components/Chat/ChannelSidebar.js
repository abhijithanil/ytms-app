import React, { useState } from 'react';
import { useChat } from 'context/ChatContext';
import { 
  MessageCircle, 
  Plus, 
  Hash, 
  Search
} from 'lucide-react';

const ChannelSidebar = ({ onCreateChannel }) => {
  const { channels, activeChannel, setActiveChannel, connected } = useChat();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChannelClick = (channel) => {
    setActiveChannel(channel);
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Chat
          </h2>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <button
              onClick={onCreateChannel}
              className="p-1 hover:bg-gray-700 rounded"
              title="Create Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="mb-4">
            <h3 className="text-xs uppercase text-gray-400 font-semibold mb-2 px-2">
              Channels
            </h3>
            {filteredChannels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => handleChannelClick(channel)}
                className={`flex items-center px-2 py-2 rounded-md cursor-pointer transition-colors ${
                  activeChannel?.id === channel.id
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <Hash className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate text-sm">{channel.name}</span>
                {channel.memberCount && (
                  <span className="ml-auto text-xs text-gray-400">
                    {channel.memberCount}
                  </span>
                )}
              </div>
            ))}
          </div>

          {filteredChannels.length === 0 && searchTerm && (
            <div className="text-center text-gray-400 text-sm py-4">
              No channels found
            </div>
          )}

          {channels.length === 0 && !searchTerm && (
            <div className="text-center text-gray-400 text-sm py-4">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No channels yet</p>
              <button
                onClick={onCreateChannel}
                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                Create your first channel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          {connected ? (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
              Connected
            </span>
          ) : (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-red-400 rounded-full mr-2" />
              Disconnected
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelSidebar;