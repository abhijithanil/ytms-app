import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  AlertCircle,
  CheckCircle,
  Settings,
  Youtube,
  Video,
  FileVideo
} from 'lucide-react';
import { metadataAPI } from '../services/api';
import toast from 'react-hot-toast';

const MultipleVideoUploadModal = ({
  isOpen,
  onClose,
  selectedVideos,
  channels,
  onUpload,
  task
}) => {
  const [videoUploadConfig, setVideoUploadConfig] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedVideos.length > 0) {
      initializeVideoConfig();
      validateVideoMetadata();
    }
  }, [isOpen, selectedVideos]);

  const initializeVideoConfig = () => {
    const config = selectedVideos.map(video => ({
      ...video,
      channelId: channels.length > 0 ? channels[0].id : '',
      hasMetadata: false,
      metadataChecked: false
    }));
    setVideoUploadConfig(config);
  };

  const validateVideoMetadata = async () => {
    setIsValidating(true);
    const results = {};

    try {
      for (const video of selectedVideos) {
        try {
          const response = await metadataAPI.hasMetadata(video.videoIdentifier);
          results[video.videoIdentifier] = {
            hasMetadata: response.data.hasMetadata,
            error: null
          };
        } catch (error) {
          results[video.videoIdentifier] = {
            hasMetadata: false,
            error: error.message
          };
        }
      }

      setValidationResults(results);
      
      // Update config with metadata status
      setVideoUploadConfig(prev => 
        prev.map(video => ({
          ...video,
          hasMetadata: results[video.videoIdentifier]?.hasMetadata || false,
          metadataChecked: true
        }))
      );
    } catch (error) {
      console.error('Error validating metadata:', error);
      toast.error('Failed to validate video metadata');
    } finally {
      setIsValidating(false);
    }
  };

  const updateChannelForVideo = (videoIdentifier, channelId) => {
    setVideoUploadConfig(prev =>
      prev.map(video =>
        video.videoIdentifier === videoIdentifier
          ? { ...video, channelId }
          : video
      )
    );
  };

  const handleMetadataCreate = (videoIdentifier) => {
    // This would open the VideoMetadataModal for the specific video
    // For now, we'll just show a placeholder
    toast.info(`Opening metadata editor for ${videoIdentifier}`);
    // onOpenMetadataModal(videoIdentifier);
  };

  const canUpload = () => {
    return videoUploadConfig.every(video => 
      video.hasMetadata && 
      video.channelId && 
      video.metadataChecked
    ) && !isValidating && !isUploading;
  };

  const getVideoIcon = (type) => {
    switch (type) {
      case 'revision':
        return <FileVideo className="h-5 w-5 text-purple-500" />;
      case 'raw':
      case 'legacy_raw':
        return <Video className="h-5 w-5 text-blue-500" />;
      default:
        return <Video className="h-5 w-5 text-gray-500" />;
    }
  };

  const getValidationIcon = (video) => {
    if (!video.metadataChecked) {
      return <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />;
    }
    
    if (video.hasMetadata) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const handleUpload = async () => {
    if (!canUpload()) {
      toast.error('Please ensure all videos have metadata and channels selected');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(videoUploadConfig);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Upload Multiple Videos to YouTube
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure channel and metadata for {selectedVideos.length} video(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {videoUploadConfig.map((video, index) => (
              <div
                key={video.videoIdentifier}
                className="border border-gray-200 rounded-lg p-4 space-y-4"
              >
                {/* Video Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getVideoIcon(video.type)}
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {video.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {video.type === 'revision' ? 'Edited Video' : 'Raw Video'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getValidationIcon(video)}
                    <span className="text-sm font-medium">
                      {!video.metadataChecked 
                        ? 'Checking...'
                        : video.hasMetadata 
                        ? 'Ready'
                        : 'Needs Metadata'
                      }
                    </span>
                  </div>
                </div>

                {/* Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Channel Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      YouTube Channel *
                    </label>
                    <select
                      value={video.channelId}
                      onChange={(e) => updateChannelForVideo(video.videoIdentifier, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select channel...</option>
                      {channels.map(channel => (
                        <option key={channel.id} value={channel.id}>
                          {channel.channelName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Metadata Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video Metadata
                    </label>
                    <div className="flex items-center space-x-2">
                      {video.hasMetadata ? (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Metadata available</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600">Missing metadata</span>
                          <button
                            onClick={() => handleMetadataCreate(video.videoIdentifier)}
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            Add Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload Preview */}
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Youtube className="h-4 w-4" />
                    <span>
                      Will upload to: {
                        video.channelId 
                          ? channels.find(c => c.id === video.channelId)?.channelName || 'Unknown Channel'
                          : 'No channel selected'
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Upload Summary</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• {selectedVideos.length} video(s) selected for upload</p>
              <p>• {videoUploadConfig.filter(v => v.hasMetadata).length} video(s) have metadata</p>
              <p>• {videoUploadConfig.filter(v => v.channelId).length} video(s) have channels assigned</p>
              <p>• {new Set(videoUploadConfig.map(v => v.channelId).filter(Boolean)).size} unique channel(s) will be used</p>
            </div>
          </div>

          {/* Missing Requirements Alert */}
          {videoUploadConfig.some(v => !v.hasMetadata || !v.channelId) && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Requirements Missing</p>
                  <ul className="list-disc list-inside space-y-1">
                    {videoUploadConfig.filter(v => !v.hasMetadata).length > 0 && (
                      <li>{videoUploadConfig.filter(v => !v.hasMetadata).length} video(s) need metadata</li>
                    )}
                    {videoUploadConfig.filter(v => !v.channelId).length > 0 && (
                      <li>{videoUploadConfig.filter(v => !v.channelId).length} video(s) need channel selection</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={validateVideoMetadata}
              disabled={isValidating || isUploading}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isValidating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              <span>{isValidating ? 'Checking...' : 'Recheck Metadata'}</span>
            </button>
            <button
              onClick={handleUpload}
              disabled={!canUpload()}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isUploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>
                {isUploading 
                  ? 'Uploading...' 
                  : `Upload ${selectedVideos.length} Video${selectedVideos.length > 1 ? 's' : ''}`
                }
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultipleVideoUploadModal;