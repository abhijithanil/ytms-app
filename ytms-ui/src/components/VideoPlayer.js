import React, { useRef, useState, useEffect } from 'react';
import { Download, AlertCircle, FileVideo, Play } from 'lucide-react';

const VideoPlayer = ({
  task,
  selectedRevision,
  selectedRawVideo,
  currentVideoUrl,
  videoError,
  isVideoPlaying,
  onVideoPlay,
  onVideoPause,
  onVideoError,
  onDownload,
  onRawVideoSelect,
  onRevisionSelect
}) => {
  const videoRef = useRef(null);
  const [videoContainerHeight, setVideoContainerHeight] = useState('auto');

  useEffect(() => {
    // Adjust video container height for mobile
    const updateHeight = () => {
      if (window.innerWidth < 768) {
        setVideoContainerHeight('250px');
      } else {
        setVideoContainerHeight('500px');
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleRetryLoad = () => {
    if (selectedRevision) {
      onRevisionSelect(selectedRevision);
    } else if (selectedRawVideo) {
      onRawVideoSelect(selectedRawVideo);
    } else if (task.rawVideos && task.rawVideos.length > 0) {
      onRawVideoSelect(task.rawVideos[0]);
    }
  };

  const getVideoTitle = () => {
    if (selectedRevision) {
      return `Revision #${selectedRevision.revisionNumber}`;
    } else if (selectedRawVideo) {
      return `${selectedRawVideo.filename} (${selectedRawVideo.type === 'short' ? 'Short' : 'Main'})`;
    }
    return "No Video Selected";
  };

  const getDownloadEndpoint = () => {
    if (selectedRevision) {
      return `/files/download/revision/${selectedRevision.id}`;
    } else if (selectedRawVideo) {
      return `/files/download/raw-video/${selectedRawVideo.id}`;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {getVideoTitle()}
        </h3>

        <div className="flex space-x-2">
          {currentVideoUrl && (
            <button
              onClick={() => onDownload(getDownloadEndpoint())}
              className="btn-secondary text-sm flex items-center space-x-2 flex-shrink-0"
              disabled={!getDownloadEndpoint()}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className="relative">
        {videoError ? (
          <div 
            className="flex flex-col items-center justify-center bg-red-50 rounded-lg border border-red-200"
            style={{ minHeight: videoContainerHeight }}
          >
            <AlertCircle className="h-8 lg:h-12 w-8 lg:w-12 text-red-400 mb-4" />
            <p className="text-red-600 text-center text-sm lg:text-base px-4">
              {videoError}
            </p>
            <button
              onClick={handleRetryLoad}
              className="btn-primary mt-4 text-sm"
            >
              Retry Loading Video
            </button>
          </div>
        ) : currentVideoUrl ? (
          <div className="relative">
            <video
              ref={videoRef}
              src={currentVideoUrl}
              controls
              className="w-full rounded-lg bg-black"
              style={{ 
                maxHeight: videoContainerHeight,
                height: window.innerWidth < 768 ? videoContainerHeight : 'auto'
              }}
              onPlay={onVideoPlay}
              onPause={onVideoPause}
              onError={onVideoError}
              playsInline // Important for mobile
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>

            {isVideoPlaying && (
              <div className="absolute top-2 lg:top-4 right-2 lg:right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs lg:text-sm">
                Playing
              </div>
            )}
          </div>
        ) : (
          <div 
            className="flex flex-col items-center justify-center bg-gray-50 rounded-lg"
            style={{ minHeight: videoContainerHeight }}
          >
            <FileVideo className="h-8 lg:h-12 w-8 lg:w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-sm lg:text-base">No video selected</p>
            {task.rawVideos && task.rawVideos.length > 0 && (
              <button
                onClick={() => onRawVideoSelect(task.rawVideos[0])}
                className="btn-primary mt-4 text-sm"
              >
                Load First Video
              </button>
            )}
          </div>
        )}
      </div>

      {/* Revision Notes */}
      {selectedRevision && selectedRevision.notes && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Revision Note:</strong> {selectedRevision.notes}
          </p>
        </div>
      )}

      {/* Raw Video Info */}
      {selectedRawVideo && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-800">
                <strong>Type:</strong> {selectedRawVideo.type === 'short' ? 'YouTube Short' : 'Main Video'}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Size: {Math.round(selectedRawVideo.size / (1024 * 1024))}MB
              </p>
            </div>
            <div className="flex items-center">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedRawVideo.type === 'short' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {selectedRawVideo.type === 'short' ? 'Short' : 'Main'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;