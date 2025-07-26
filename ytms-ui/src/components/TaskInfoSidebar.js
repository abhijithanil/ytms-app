import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  User,
  AlertCircle,
  Edit,
  Trash2,
  Settings,
  FileVideo,
  Video,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Play
} from 'lucide-react';

const TaskInfoSidebar = ({
  task,
  user,
  revisions,
  selectedRawVideo,
  onTaskUpdate,
  onShowEditModal,
  onShowDeleteModal,
  onRawVideoSelect,
  canDeleteTask,
  canEditTask,
  isMobile = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'IN_PROGRESS': 'bg-blue-100 text-blue-800',
      'REVIEW': 'bg-purple-100 text-purple-800',
      'READY': 'bg-green-100 text-green-800',
      'UPLOADING': 'bg-orange-100 text-orange-800',
      'COMPLETED': 'bg-emerald-100 text-emerald-800',
      'FAILED': 'bg-red-100 text-red-800',
      'CANCELLED': 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const priorityColors = {
      'LOW': 'bg-gray-100 text-gray-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'URGENT': 'bg-red-100 text-red-800'
    };
    return priorityColors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getRawVideoTypeIcon = (type) => {
    return type === 'short' ? (
      <Video className="h-4 w-4 text-purple-600" />
    ) : (
      <FileVideo className="h-4 w-4 text-blue-600" />
    );
  };

  const getRawVideoTypeBadge = (type) => {
    return type === 'short' ? (
      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
        Short
      </span>
    ) : (
      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
        Main
      </span>
    );
  };

  if (!task) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Collapsible Header */}
      <div 
        className="flex items-center justify-between p-4 lg:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Settings className="h-5 w-5 text-primary-600" />
          <span>Task Information</span>
        </h3>
        
        <div className="flex items-center space-x-2">
          {(canEditTask() || canDeleteTask()) && (
            <div className="flex space-x-1">
              {canEditTask() && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowEditModal();
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Edit task"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {canDeleteTask() && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowDeleteModal();
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
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
        <div className="px-4 lg:px-6 pb-4 lg:pb-6 space-y-4">
          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Priority</p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
          </div>

          {/* Creator and Editor */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500">Created by</p>
                <p className="text-sm text-gray-900">{task.createdBy?.username}</p>
              </div>
            </div>

            {task.assignedEditor && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500">Assigned Editor</p>
                  <p className="text-sm text-gray-900">{task.assignedEditor.username}</p>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500">Created</p>
                <p className="text-sm text-gray-900">{formatDate(task.createdAt)}</p>
              </div>
            </div>

            {task.deadline && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500">Deadline</p>
                  <p className="text-sm text-gray-900">
                    {new Date(task.deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Raw Videos Section */}
          {task.rawVideos && task.rawVideos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-3">Raw Videos ({task.rawVideos.length})</p>
              <div className="space-y-2">
                {task.rawVideos.map((rawVideo) => (
                  <div
                    key={rawVideo.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${
                      selectedRawVideo?.id === rawVideo.id
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onRawVideoSelect(rawVideo)}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="relative mt-0.5">
                        {getRawVideoTypeIcon(rawVideo.type)}
                        {selectedRawVideo?.id === rawVideo.id && (
                          <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full flex items-center justify-center">
                            <Play className="h-1 w-1 text-white fill-current" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {rawVideo.filename}
                          </p>
                          {getRawVideoTypeBadge(rawVideo.type)}
                        </div>
                        <p className="text-xs text-gray-500">
                          {Math.round(rawVideo.size / (1024 * 1024))}MB
                        </p>
                        {selectedRawVideo?.id === rawVideo.id && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full mt-1">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy Raw Video (for backward compatibility) */}
          {task.rawVideoUrl && (!task.rawVideos || task.rawVideos.length === 0) && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Raw Video</p>
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <FileVideo className="h-4 w-4 text-gray-400" />
                <span className="truncate">{task.rawVideoFilename || 'Raw video file'}</span>
              </div>
            </div>
          )}

          {/* Progress Indicators */}
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Progress</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Revisions</span>
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-medium text-gray-900">
                    {revisions?.length || 0}
                  </span>
                  {revisions?.length > 0 ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-300" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Level */}
          {task.privacyLevel && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Privacy</p>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {task.privacyLevel.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskInfoSidebar;