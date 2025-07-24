import React, { useState } from 'react';
import {
  Upload,
  Save,
  Video,
  FileVideo,
  CheckCircle,
  Download,
  Trash2,
  Play,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const RevisionsList = ({
  task,
  revisions,
  rawVideos,
  selectedVideo,
  user,
  showUploadRevision,
  setShowUploadRevision,
  newRevisionFile,
  setNewRevisionFile,
  newRevisionNotes,
  setNewRevisionNotes,
  isVideoPlaying,
  onRevisionSelect,
  onRawVideoSelect,
  onRevisionUpload,
  onRevisionDelete,
  onDownload,
  canUploadRevision,
  isMobile = false
}) => {
  const [showRawVideos, setShowRawVideos] = useState(true);
  const [showRevisions, setShowRevisions] = useState(true);

  // Helper function to check if a revision is currently playing
  const isRevisionPlaying = (revision) => {
    return selectedVideo?.type === 'revision' && selectedVideo?.id === revision.id && isVideoPlaying;
  };

  // Helper function to check if a raw video is currently playing
  const isRawVideoPlaying = (rawVideo) => {
    if (rawVideo) {
      return selectedVideo?.type === 'raw' && selectedVideo?.id === rawVideo.id && isVideoPlaying;
    }
    // Legacy single raw video
    return selectedVideo?.type === 'legacy_raw' && isVideoPlaying;
  };

  const content = (
    <div className={isMobile ? "p-4" : ""}>
      {!isMobile && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Videos & Revisions
          </h3>

          {canUploadRevision() && (
            <button
              onClick={() => setShowUploadRevision(!showUploadRevision)}
              className="btn-primary text-sm flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Revision</span>
            </button>
          )}
        </div>
      )}

      {/* Upload button for mobile */}
      {isMobile && canUploadRevision() && (
        <div className="mb-4">
          <button
            onClick={() => setShowUploadRevision(!showUploadRevision)}
            className="btn-primary text-sm flex items-center justify-center space-x-2 w-full"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Revision</span>
          </button>
        </div>
      )}

      {/* Upload Revision Form */}
      {showUploadRevision && (
        <form
          onSubmit={onRevisionUpload}
          className="mb-6 p-4 bg-gray-50 rounded-lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video File *
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setNewRevisionFile(e.target.files[0])}
                className="input-field w-full text-sm"
                required
              />
              {newRevisionFile && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {newRevisionFile.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={newRevisionNotes}
                onChange={(e) => setNewRevisionNotes(e.target.value)}
                rows={3}
                className="input-field w-full text-sm"
                placeholder="Add notes about this revision..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                type="submit" 
                className="btn-primary text-sm flex items-center justify-center flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Upload Revision
              </button>
              <button
                type="button"
                onClick={() => setShowUploadRevision(false)}
                className="btn-secondary text-sm flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Raw Videos Section */}
      {(task.rawVideoUrl || (rawVideos && rawVideos.length > 0)) && (
        <div className="mb-6">
          <button
            onClick={() => setShowRawVideos(!showRawVideos)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 w-full text-left"
          >
            {showRawVideos ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Raw Videos ({task.rawVideoUrl ? 1 + (rawVideos?.length || 0) : (rawVideos?.length || 0)})</span>
          </button>

          {showRawVideos && (
            <div className="space-y-3 ml-4">
              {/* Legacy Raw Video */}
              {task.rawVideoUrl && (
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedVideo?.type === 'legacy_raw'
                      ? "border-primary-500 bg-primary-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => onRawVideoSelect(null)} // null for legacy
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <Video className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm lg:text-base">
                          Raw Video #1 (Original)
                        </p>
                        <p className="text-xs lg:text-sm text-gray-500 truncate">
                          {task.rawVideoFilename || 'video.mp4'} • Uploaded{" "}
                          {formatDistanceToNow(new Date(task.createdAt), {
                            addSuffix: true,
                          })}
                          {isRawVideoPlaying(null) && (
                            <span className="ml-2 text-green-600 font-medium">
                              • Playing...
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {selectedVideo?.type === 'legacy_raw' && (
                        <CheckCircle className="h-5 w-5 text-primary-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(`/files/download/video/${task.id}`);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* New Raw Videos */}
              {rawVideos && rawVideos.map((rawVideo, index) => (
                <div
                  key={rawVideo.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedVideo?.type === 'raw' && selectedVideo?.id === rawVideo.id
                      ? "border-primary-500 bg-primary-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => onRawVideoSelect(rawVideo)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <Video className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm lg:text-base">
                          Raw Video #{(task.rawVideoUrl ? 2 : 1) + index} 
                          {rawVideo.description && ` - ${rawVideo.description}`}
                        </p>
                        <p className="text-xs lg:text-sm text-gray-500 truncate">
                          {rawVideo.filename} • Uploaded{" "}
                          {formatDistanceToNow(new Date(rawVideo.createdAt), {
                            addSuffix: true,
                          })}
                          {rawVideo.uploadedBy && ` by ${rawVideo.uploadedBy.username}`}
                          {isRawVideoPlaying(rawVideo) && (
                            <span className="ml-2 text-green-600 font-medium">
                              • Playing...
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {selectedVideo?.type === 'raw' && selectedVideo?.id === rawVideo.id && (
                        <CheckCircle className="h-5 w-5 text-primary-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(`/files/download/raw-video/${rawVideo.id}`);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4 text-gray-500" />
                      </button>
                      {(user.role === 'ADMIN' || rawVideo.uploadedBy?.id === user.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // onRawVideoDelete(rawVideo.id); // Implement if needed
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                          title="Delete Raw Video"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Revisions Section */}
      <div>
        <button
          onClick={() => setShowRevisions(!showRevisions)}
          className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 w-full text-left"
        >
          {showRevisions ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>Revisions ({revisions.length})</span>
        </button>

        {showRevisions && (
          <div className="space-y-3 ml-4">
            {revisions.map((revision) => (
              <div
                key={revision.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedVideo?.type === 'revision' && selectedVideo?.id === revision.id
                    ? "border-primary-500 bg-primary-50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => onRevisionSelect(revision)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FileVideo className="h-5 w-5 text-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm lg:text-base">
                        Revision #{revision.revisionNumber}
                      </p>
                      <p className="text-xs lg:text-sm text-gray-500">
                        {formatDistanceToNow(new Date(revision.createdAt), {
                          addSuffix: true,
                        })}
                        {" by "} {revision.uploadedBy.username}
                        {isRevisionPlaying(revision) && (
                          <span className="ml-2 text-green-600 font-medium">
                            • Playing...
                          </span>
                        )}
                      </p>
                      {revision.notes && (
                        <p className="text-xs lg:text-sm text-gray-600 mt-1 italic break-words">
                          "{revision.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {selectedVideo?.type === 'revision' && selectedVideo?.id === revision.id && (
                      <CheckCircle className="h-5 w-5 text-primary-500" />
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(`/files/download/revision/${revision.id}`);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4 text-gray-500" />
                    </button>
                    
                    {(user.role === 'ADMIN' || revision.uploadedBy.id === user.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRevisionDelete(revision.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="Delete Revision"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State for Revisions */}
            {revisions.length === 0 && (
              <div className="text-center py-8">
                <FileVideo className="h-8 lg:h-12 w-8 lg:w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm lg:text-base">No revisions uploaded yet</p>
                {canUploadRevision() && (
                  <button
                    onClick={() => setShowUploadRevision(true)}
                    className="btn-primary mt-4 text-sm"
                  >
                    Upload First Revision
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return content;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
      {content}
    </div>
  );
};

export default RevisionsList;