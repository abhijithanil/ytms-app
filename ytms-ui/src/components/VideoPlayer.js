import React, { useRef, useState, useEffect } from 'react';
import { Download, AlertCircle, FileVideo } from 'lucide-react';

const VideoPlayer = ({
  task,
  selectedRevision,
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
    } else {
      onRawVideoSelect();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {selectedRevision
            ? `Revision #${selectedRevision.revisionNumber}`
            : "Raw Video (Original)"}
        </h3>

        <div className="flex space-x-2">
          {currentVideoUrl && (
            <button
              onClick={() =>
                onDownload(
                  selectedRevision
                    ? `/files/download/revision/${selectedRevision.id}`
                    : `/files/download/video/${task.id}`
                )
              }
              className="btn-secondary text-sm flex items-center space-x-2 flex-shrink-0"
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
            <p className="text-gray-500 text-sm lg:text-base">No video available</p>
            {task.rawVideoUrl && (
              <button
                onClick={onRawVideoSelect}
                className="btn-primary mt-4 text-sm"
              >
                Load Raw Video
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
    </div>
  );
};

export default VideoPlayer;