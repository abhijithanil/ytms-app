import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import TaskEditorAssigner from "./TaskEditorAssigner";
import {
  Calendar,
  User,
  Shield,
  Clock,
  CheckCircle,
  Edit3,
  Trash2,
  Video,
  FileVideo,
  Play,
  Youtube,
  Settings
} from 'lucide-react';

const TaskInfoSidebar = ({
  task,
  user,
  metadata,
  revisions,
  selectedRawVideo,
  onTaskUpdate,
  onShowEditModal,
  onShowDeleteModal,
  onShowVideoMetadataModal,
  onRawVideoSelect,
  canDeleteTask,
  canEditTask,
  isMobile = false
}) => {
  const [activeVideoSection, setActiveVideoSection] = useState('raw'); // 'raw' or 'revisions'

  if (!task) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-800';
      case 'REVIEW': return 'bg-purple-100 text-purple-800';
      case 'READY': return 'bg-green-100 text-green-800';
      case 'SCHEDULED': return 'bg-indigo-100 text-indigo-800';
      case 'UPLOADED': return 'bg-emerald-100 text-emerald-800';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status) => {
    return status?.replace('_', ' ').toLowerCase() || 'draft';
  };

  const hasMetadata = metadata && Object.keys(metadata).length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Task Information</h3>
        <div className="flex space-x-2">
          {canEditTask() && (
            <button
              onClick={onShowEditModal}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit task"
            >
              <Edit3 className="h-4 w-4 text-gray-600" />
            </button>
          )}
          {canDeleteTask() && (
            <button
              onClick={onShowDeleteModal}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete task"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      </div>

      {/* Task Details */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
            {formatStatus(task.status)}
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority?.toLowerCase()}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">Created by</p>
              <p className="text-sm text-gray-600 truncate">{task.createdBy?.username}</p>
            </div>
          </div>

          {/* Task Editor Assignment Section */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <TaskEditorAssigner 
              task={task} 
              onTaskUpdate={onTaskUpdate}
            />
          </div>

          <div className="flex items-start space-x-3">
            <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Created</p>
              <p className="text-sm text-gray-600">{formatDate(task.createdAt)}</p>
            </div>
          </div>

          {task.deadline && (
            <div className="flex items-start space-x-3">
              <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Deadline</p>
                <p className="text-sm text-gray-600">{formatDate(task.deadline)}</p>
              </div>
            </div>
          )}

          {task.privacyLevel === 'SELECTED' && (
            <div className="flex items-start space-x-3">
              <Shield className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Privacy</p>
                <p className="text-sm text-gray-600">Private (selected users)</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Files Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-md font-semibold text-gray-900">Videos</h4>
        </div>

        {/* Section Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveVideoSection('raw')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeVideoSection === 'raw'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Raw Videos ({task.rawVideos?.length || 0})
          </button>
          <button
            onClick={() => setActiveVideoSection('revisions')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeVideoSection === 'revisions'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Revisions ({revisions?.length || 0})
          </button>
        </div>

        {/* Raw Videos Section */}
        {activeVideoSection === 'raw' && (
          <div className="space-y-2">
            {task.rawVideos && task.rawVideos.length > 0 ? (
              task.rawVideos.map((video, index) => (
                <div
                  key={video.id || index}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                    selectedRawVideo?.id === video.id 
                      ? 'border-primary-300 bg-primary-50' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => onRawVideoSelect(video)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <FileVideo className="h-5 w-5 text-blue-600" />
                      {selectedRawVideo?.id === video.id && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full flex items-center justify-center">
                          <Play className="h-2 w-2 text-white fill-current" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {video.filename}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          video.type === 'short' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {video.type === 'short' ? 'Short' : 'Main'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round((video.size || 0) / (1024 * 1024))}MB
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileVideo className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No raw videos uploaded</p>
              </div>
            )}
          </div>
        )}

        {/* Revisions Section */}
        {activeVideoSection === 'revisions' && (
          <div className="space-y-2">
            {revisions && revisions.length > 0 ? (
              revisions.map((revision) => (
                <div
                  key={revision.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Video className="h-5 w-5 text-green-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        Revision #{revision.revisionNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        by {revision.uploadedBy?.username} • {formatDate(revision.createdAt)}
                      </p>
                      {revision.notes && (
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {revision.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Video className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No revisions uploaded</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Metadata Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-md font-semibold text-gray-900">Video Metadata</h4>
          <button
            onClick={onShowVideoMetadataModal}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit metadata"
          >
            <Settings className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {hasMetadata ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">Metadata configured</span>
            </div>
            {metadata.title && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Title:</span> {metadata.title}
              </p>
            )}
            {metadata.tags && metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {metadata.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {metadata.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{metadata.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-yellow-600">
            <Youtube className="h-4 w-4" />
            <span className="text-sm">Metadata not configured</span>
          </div>
        )}
      </div>

      {/* Task Description */}
      {task.description && (
        <div className="space-y-2">
          <h4 className="text-md font-semibold text-gray-900">Description</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {task.description}
          </p>
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-md font-semibold text-gray-900">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {task.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskInfoSidebar;