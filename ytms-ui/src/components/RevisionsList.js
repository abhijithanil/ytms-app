import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Video,
  Upload,
  FileVideo,
  User,
  Download,
  Trash2,
  X,
  Plus,
  Play,
  CheckSquare,
  Square,
  Youtube,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const RevisionsList = ({
  task,
  revisions,
  selectedRevision,
  selectedRevisionsForUpload = [],
  user,
  showUploadRevision,
  setShowUploadRevision,
  newRevisionFile,
  setNewRevisionFile,
  newRevisionNotes,
  setNewRevisionNotes,
  newRevisionType,
  setNewRevisionType,
  isVideoPlaying,
  onRevisionSelect,
  onRevisionUpload,
  onRevisionDelete,
  onDownload,
  onToggleRevisionForUpload,
  onShowRevisionMetadataModal,
  canUploadRevision,
  revisionMetadata = {},
  isMobile = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewRevisionFile(file);
    }
  };

  const isRevisionSelected = (revisionId) => {
    return selectedRevisionsForUpload.some(r => r.id === revisionId);
  };

  const getRevisionTypeIcon = (revision) => {
    return <Video className="h-4 w-4 text-green-600" />;
  };

  const getRevisionTypeBadge = (revision) => {
    return (
      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
        Main
      </span>
    );
  };

  const hasRevisionMetadata = (revisionId) => {
    return revisionMetadata[revisionId] && Object.keys(revisionMetadata[revisionId]).length > 0;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Collapsible Header */}
      <div 
        className="flex items-center justify-between p-4 lg:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Video className="h-5 w-5 text-primary-600" />
          <span>Revisions ({revisions?.length || 0})</span>
        </h3>
        
        <div className="flex items-center space-x-2">
          {canUploadRevision() && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUploadRevision(!showUploadRevision);
              }}
              className="btn-primary text-sm flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Upload Revision</span>
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 lg:px-6 pb-4 lg:pb-6">
          {/* Upload Form */}
          {showUploadRevision && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="text-md font-medium text-gray-900 mb-3">Upload New Revision</h4>
              
              <form onSubmit={onRevisionUpload} className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video File
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  {newRevisionFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {newRevisionFile.name} ({Math.round(newRevisionFile.size / (1024 * 1024))}MB)
                    </p>
                  )}
                </div>

                {/* Video Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="revisionType"
                        value="main"
                        checked={newRevisionType === 'main'}
                        onChange={(e) => setNewRevisionType(e.target.value)}
                        className="mr-2 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Main Video</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="revisionType"
                        value="short"
                        checked={newRevisionType === 'short'}
                        onChange={(e) => setNewRevisionType(e.target.value)}
                        className="mr-2 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">YouTube Short</span>
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={newRevisionNotes}
                    onChange={(e) => setNewRevisionNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    placeholder="Describe the changes in this revision..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadRevision(false);
                      setNewRevisionFile(null);
                      setNewRevisionNotes('');
                      setNewRevisionType('main');
                    }}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newRevisionFile}
                    className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload Revision
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Multi-selection notice */}
          {selectedRevisionsForUpload.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Youtube className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">
                  {selectedRevisionsForUpload.length} revision(s) selected for YouTube upload
                </span>
              </div>
            </div>
          )}

          {/* Revisions List */}
          <div className="space-y-3">
            {revisions && revisions.length > 0 ? (
              revisions.map((revision) => (
                <div
                  key={revision.id}
                  className={`border rounded-lg p-4 transition-all hover:shadow-sm ${
                    selectedRevision?.id === revision.id
                      ? 'border-primary-300 bg-primary-50'
                      : isRevisionSelected(revision.id)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Selection Checkbox */}
                    {task.status === 'READY' && (
                      <button
                        onClick={() => onToggleRevisionForUpload && onToggleRevisionForUpload(revision)}
                        className="mt-1 hover:bg-gray-100 rounded p-1 transition-colors"
                        title="Select for YouTube upload"
                      >
                        {isRevisionSelected(revision.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    )}

                    {/* Play/Video Icon */}
                    <div 
                      className="relative cursor-pointer mt-1"
                      onClick={() => onRevisionSelect(revision)}
                    >
                      {getRevisionTypeIcon(revision)}
                      {selectedRevision?.id === revision.id && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full flex items-center justify-center">
                          <Play className="h-2 w-2 text-white fill-current" />
                        </div>
                      )}
                    </div>

                    {/* Revision Info */}
                    <div className="flex-1 min-w-0">
                      <div 
                        className="cursor-pointer"
                        onClick={() => onRevisionSelect(revision)}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            Revision #{revision.revisionNumber}
                          </h4>
                          {getRevisionTypeBadge(revision)}
                          {selectedRevision?.id === revision.id && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              Playing
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
                          <User className="h-3 w-3" />
                          <span>{revision.uploadedBy?.username}</span>
                          <span>•</span>
                          <span>{formatDate(revision.createdAt)}</span>
                        </div>

                        {revision.notes && (
                          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                            {revision.notes}
                          </p>
                        )}
                      </div>

                      {/* Metadata Status */}
                      {isRevisionSelected(revision.id) && (
                        <div className="mt-2 flex items-center space-x-2">
                          {hasRevisionMetadata(revision.id) ? (
                            <span className="flex items-center space-x-1 text-xs text-green-600">
                              <Settings className="h-3 w-3" />
                              <span>Metadata configured</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => onShowRevisionMetadataModal && onShowRevisionMetadataModal(revision)}
                              className="flex items-center space-x-1 text-xs text-orange-600 hover:text-orange-700"
                            >
                              <Settings className="h-3 w-3" />
                              <span>Configure metadata</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center space-x-2 mt-3">
                        <button
                          onClick={() => onRevisionSelect(revision)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          disabled={isVideoPlaying && selectedRevision?.id === revision.id}
                        >
                          {selectedRevision?.id === revision.id && isVideoPlaying ? 'Playing' : 'Play'}
                        </button>
                        
                        <span className="text-gray-300">•</span>
                        
                        <button
                          onClick={() => onDownload(`/files/download/revision/${revision.id}`)}
                          className="text-xs text-gray-600 hover:text-gray-700 flex items-center space-x-1"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </button>

                        {/* Metadata Settings Button for selected revisions */}
                        {isRevisionSelected(revision.id) && (
                          <>
                            <span className="text-gray-300">•</span>
                            <button
                              onClick={() => onShowRevisionMetadataModal && onShowRevisionMetadataModal(revision)}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                              title="Configure metadata for this revision"
                            >
                              <Settings className="h-3 w-3" />
                              <span>Metadata</span>
                            </button>
                          </>
                        )}

                        {/* Delete button - only show for revision owner or admin */}
                        {(user.id === revision.uploadedBy?.id || user.role === 'ADMIN') && (
                          <>
                            <span className="text-gray-300">•</span>
                            <button
                              onClick={() => onRevisionDelete(revision.id)}
                              className="text-xs text-red-600 hover:text-red-700 flex items-center space-x-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <FileVideo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">No revisions uploaded yet</p>
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

          {/* Upload instructions for multi-selection */}
          {task.status === 'READY' && revisions && revisions.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                💡 <strong>Tip:</strong> Select multiple revisions to upload different videos (e.g., main video + YouTube short) to different channels.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RevisionsList;