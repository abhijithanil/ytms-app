import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Calendar,
  Clock,
  FileVideo,
  Youtube,
  Settings,
  Edit,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import TaskEditorAssigner from './TaskEditorAssigner';

const TaskInfoSidebar = ({
  task,
  user,
  metadata,
  revisions,
  onTaskUpdate,
  onShowEditModal,
  onShowDeleteModal,
  onShowVideoMetadataModal,
  canDeleteTask,
  canEditTask
}) => {
  const [showTaskSettings, setShowTaskSettings] = useState(false);
  const taskSettingsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        taskSettingsRef.current &&
        !taskSettingsRef.current.contains(event.target)
      ) {
        setShowTaskSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderVideoMetadata = (metadata) => {
    if (!metadata) return null;

    return (
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-500">
            Video Title
          </label>
          <p className="text-gray-900 mt-1 text-sm lg:text-base break-words">
            {metadata.title || "Not set"}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">
            Video Description
          </label>
          <p className="text-gray-900 mt-1 whitespace-pre-wrap text-sm lg:text-base">
            {metadata.description || "Not set"}
          </p>
        </div>

        {metadata.tags && metadata.tags.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-500">Tags</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {metadata.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Category
            </label>
            <p className="text-gray-900 mt-1 text-sm">
              {metadata.category || "Not set"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Language
            </label>
            <p className="text-gray-900 mt-1 text-sm">
              {metadata.language || "Not set"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Privacy Status
            </label>
            <p className="text-gray-900 mt-1 capitalize text-sm">
              {metadata.privacy_status || "Not set"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">License</label>
            <p className="text-gray-900 mt-1 text-sm">
              {metadata.license || "Not set"}
            </p>
          </div>
        </div>

        {metadata.recording_details && (
          <div>
            <label className="text-sm font-medium text-gray-500">
              Recording Details
            </label>
            <div className="mt-1 text-sm text-gray-700">
              {metadata.recording_details.location_description && (
                <p>
                  Location: {metadata.recording_details.location_description}
                </p>
              )}
              {metadata.recording_details.recording_date && (
                <p>
                  Date:{" "}
                  {new Date(
                    metadata.recording_details.recording_date
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {metadata.video_chapters && metadata.video_chapters.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-500">
              Video Chapters
            </label>
            <div className="mt-1 space-y-1">
              {metadata.video_chapters.map((chapter, index) => (
                <div key={index} className="text-sm text-gray-700">
                  <strong>{chapter.timestamp}</strong> - {chapter.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Task Information
        </h3>

        {(canDeleteTask() || canEditTask()) && (
          <div className="relative" ref={taskSettingsRef}>
            <button
              onClick={() => setShowTaskSettings(!showTaskSettings)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Task Settings"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </button>

            {showTaskSettings && (
              <div className="absolute right-0 top-10 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  {canEditTask() && (
                    <button
                      onClick={() => {
                        setShowTaskSettings(false);
                        onShowEditModal();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Task
                    </button>
                  )}
                  {user.role === "ADMIN" && (
                    <button
                      onClick={() => {
                        setShowTaskSettings(false);
                        onShowVideoMetadataModal();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Youtube className="h-4 w-4 mr-2" />
                      Edit Video Metadata
                    </button>
                  )}
                  {canDeleteTask() && (
                    <button
                      onClick={() => {
                        setShowTaskSettings(false);
                        onShowDeleteModal();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Task
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-500">
            Description
          </label>
          <p className="text-gray-900 mt-1 text-sm lg:text-base break-words">
            {task.description || "No description provided"}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Created by
            </label>
            <div className="flex items-center space-x-2 mt-1">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 text-sm lg:text-base">
                {task.createdBy.username}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Assigned to
            </label>
            <div className="flex items-center space-x-2 mt-1">
              <TaskEditorAssigner
                task={task}
                onTaskUpdate={onTaskUpdate}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">
            Created
          </label>
          <div className="flex items-center space-x-2 mt-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-900 text-sm lg:text-base">
              {formatDistanceToNow(new Date(task.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">
            Updated
          </label>
          <div className="flex items-center space-x-2 mt-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-900 text-sm lg:text-base">
              {formatDistanceToNow(new Date(task.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>

        {task.deadline && (
          <div>
            <label className="text-sm font-medium text-gray-500">
              Deadline
            </label>
            <div className="flex items-center space-x-2 mt-1">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 text-sm lg:text-base">
                {new Date(task.deadline).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {revisions.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-500">
              Total Revisions
            </label>
            <div className="flex items-center space-x-2 mt-1">
              <FileVideo className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 text-sm lg:text-base">
                {revisions.length}
              </span>
            </div>
          </div>
        )}

        {/* Video Metadata Section - Only show for admins and editors */}
        {(user.role === "ADMIN" || user.role === "EDITOR") && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-500">
                Video Metadata
              </label>
              <Youtube className="h-4 w-4 text-gray-400" />
            </div>

            {metadata &&
            Object.keys(metadata).length > 0 &&
            metadata.title &&
            metadata.title.trim() !== "" ? (
              <div className="bg-gray-50 rounded-lg p-3">
                {renderVideoMetadata(metadata)}
                <button
                  onClick={onShowVideoMetadataModal}
                  className="btn-primary text-xs mt-3 w-full"
                >
                  View Video Metadata
                </button>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  Video metadata not set. Required for moving to
                  scheduled/uploaded status.
                </p>
                <button
                  onClick={onShowVideoMetadataModal}
                  className="btn-primary text-xs mt-2"
                >
                  Add Video Metadata
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskInfoSidebar;