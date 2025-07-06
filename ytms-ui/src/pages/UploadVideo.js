import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  ArrowLeft, 
  ChevronDown,
  X,
  File,
  CheckCircle,
  Video,
  Tag,
  Mic,
  Users,
  Shield,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const UploadVideo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assignedEditorId: '',
    deadline: '',
    privacyLevel: 'ALL',
    tags: []
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [audioFiles, setAudioFiles] = useState([]);
  const [editors, setEditors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchEditors();
    fetchAllUsers();
  }, []);

  const fetchEditors = async () => {
    try {
      const response = await usersAPI.getEditors();
      setEditors(response.data);
    } catch (error) {
      console.error('Failed to fetch editors:', error);
      toast.error('Failed to load editors');
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await usersAPI.getAllUsers();
      setAllUsers(response.data.filter(u => u.role !== 'ADMIN'));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    }
  };

  // Video dropzone configuration
  const onVideoDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      debugger
      if (rejection.file.size > 10000 * 1024 * 1024) {
        toast.error('Video file must be less than 500MB');
      } else {
        toast.error('Invalid video file format');
      }
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      toast.success('Video file uploaded successfully!');
    }
  }, []);

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } = useDropzone({
    onDrop: onVideoDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm']
    },
    maxFiles: 1,
    maxSize: 10000 * 1024 * 1024 // 10000MB
  });

  // Audio dropzone configuration
  const onAudioDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejection => {
        if (rejection.file.size > 50 * 1024 * 1024) {
          toast.error(`${rejection.file.name} is too large. Max size is 50MB per audio file.`);
        } else {
          toast.error(`${rejection.file.name} is not a valid audio format.`);
        }
      });
    }

    if (acceptedFiles.length > 0) {
      setAudioFiles(prev => [...prev, ...acceptedFiles]);
      toast.success(`${acceptedFiles.length} audio file(s) added!`);
    }
  }, []);

  const { getRootProps: getAudioRootProps, getInputProps: getAudioInputProps, isDragActive: isAudioDragActive } = useDropzone({
    onDrop: onAudioDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg']
    },
    maxSize: 50 * 1024 * 1024 // 50MB per file
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    toast.info('Video file removed');
  };

  const removeAudioFile = (index) => {
    setAudioFiles(prev => prev.filter((_, i) => i !== index));
    toast.info('Audio file removed');
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return false;
    }

    if (formData.title.length < 3) {
      toast.error('Task title must be at least 3 characters long');
      return false;
    }

    if (formData.privacyLevel === 'SELECTED' && selectedUsers.length === 0) {
      toast.error('Please select at least one user for private tasks');
      return false;
    }

    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline);
      const now = new Date();
      if (deadlineDate <= now) {
        toast.error('Deadline must be in the future');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const submitFormData = new FormData();
      submitFormData.append('title', formData.title);
      submitFormData.append('description', formData.description);
      submitFormData.append('priority', formData.priority);
      submitFormData.append('privacyLevel', formData.privacyLevel);
      
      if (formData.deadline) {
        submitFormData.append('deadline', formData.deadline);
      }
      
      if (formData.assignedEditorId) {
        submitFormData.append('assignedEditorId', formData.assignedEditorId);
      }

      // Add tags as JSON string
      if (formData.tags.length > 0) {
        submitFormData.append('tags', JSON.stringify(formData.tags));
      }

      if (uploadedFile) {
        submitFormData.append('videoFile', uploadedFile);
      }

      // Add audio files
      audioFiles.forEach((file, index) => {
        submitFormData.append('audioFiles', file);
      });

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await tasksAPI.createTask(submitFormData);
      
      setUploadProgress(100);
      clearInterval(progressInterval);

      // Set privacy permissions if SELECTED
      if (formData.privacyLevel === 'SELECTED' && selectedUsers.length > 0) {
        await tasksAPI.setTaskPrivacy(response.data.id, {
          privacyLevel: 'SELECTED',
          userIds: selectedUsers
        });
      }

      toast.success('Task created successfully!');
      navigate('/tasks');
      
    } catch (error) {
      console.error('Failed to create task:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create task. Please try again.';
      toast.error(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTotalFileSize = () => {
    const videoSize = uploadedFile ? uploadedFile.size : 0;
    const audioSize = audioFiles.reduce((total, file) => total + file.size, 0);
    return videoSize + audioSize;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
          <p className="text-gray-600">Upload raw video and assign to an editor</p>
        </div>
      </div>

      {/* Upload Progress */}
      {isSubmitting && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Uploading Task...</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Video className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Task Details</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Title */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter a descriptive task title"
                className="input-field"
                required
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/100 characters
              </p>
            </div>

            {/* Priority */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="relative">
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="input-field appearance-none pr-10"
                >
                  <option value="LOW">🟢 Low</option>
                  <option value="MEDIUM">🟡 Medium</option>
                  <option value="HIGH">🔴 High</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Description */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Describe the video editing requirements, style preferences, target audience, etc..."
                className="input-field resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/1000 characters
              </p>
            </div>

            {/* Assign to Editor */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Editor
              </label>
              <div className="relative">
                <select
                  name="assignedEditorId"
                  value={formData.assignedEditorId}
                  onChange={handleInputChange}
                  className="input-field appearance-none pr-10"
                >
                  <option value="">Select editor (optional)</option>
                  {editors.map(editor => (
                    <option key={editor.id} value={editor.id}>
                      {editor.username} ({editor.email})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {!formData.assignedEditorId && (
                <p className="text-xs text-gray-500 mt-1">
                  Task will remain in draft status until assigned
                </p>
              )}
            </div>

            {/* Deadline */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
                className="input-field"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* Privacy Level */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="inline h-4 w-4 mr-1" />
                Privacy Level
              </label>
              <div className="space-y-4">
                <div className="flex space-x-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="privacyLevel"
                      value="ALL"
                      checked={formData.privacyLevel === 'ALL'}
                      onChange={handleInputChange}
                      className="mr-3 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Public</span>
                      <p className="text-sm text-gray-500">All team members can view this task</p>
                    </div>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="privacyLevel"
                      value="SELECTED"
                      checked={formData.privacyLevel === 'SELECTED'}
                      onChange={handleInputChange}
                      className="mr-3 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Private</span>
                      <p className="text-sm text-gray-500">Only selected users can view this task</p>
                    </div>
                  </label>
                </div>
                
                {formData.privacyLevel === 'SELECTED' && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Select Users ({selectedUsers.length} selected)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {allUsers.map(u => (
                        <label key={u.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(u.id)}
                            onChange={() => handleUserSelection(u.id)}
                            className="text-primary-600 focus:ring-primary-500 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900">{u.username}</span>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                              {u.role.toLowerCase()}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="inline h-4 w-4 mr-1" />
                Tags
              </label>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a tag (e.g., 'product-demo', 'social-media')"
                    className="flex-1 input-field"
                    maxLength={30}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!currentTag.trim() || formData.tags.includes(currentTag.trim())}
                    className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Tag className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
                
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800 border border-primary-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-primary-600 focus:outline-none"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upload Files Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Upload Files</h2>
            </div>
            {getTotalFileSize() > 0 && (
              <div className="text-sm text-gray-500">
                Total size: {formatFileSize(getTotalFileSize())}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Raw Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Raw Video File (Optional)
              </label>
              
              {!uploadedFile ? (
                <div
                  {...getVideoRootProps()}
                  className={`upload-area border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isVideoDragActive ? 'dragover border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
                  }`}
                >
                  <input {...getVideoInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {isVideoDragActive ? 'Drop video file here' : 'Upload Raw Video'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Drag and drop your video file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-400">
                    Supports: MP4, MOV, AVI, MKV, WMV, WebM • Max size: 500MB
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <File className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(uploadedFile.size)} • {uploadedFile.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <button
                        type="button"
                        onClick={removeUploadedFile}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Instructions Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                <Mic className="inline h-4 w-4 mr-1" />
                Audio Instructions (Optional)
              </label>
              
              <div
                {...getAudioRootProps()}
                className={`upload-area border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isAudioDragActive ? 'dragover border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <input {...getAudioInputProps()} />
                <Mic className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-2">
                  {isAudioDragActive ? 'Drop audio files here' : 'Add voice instructions for the editor'}
                </p>
                <p className="text-sm text-gray-400">
                  Supports: MP3, WAV, M4A, AAC, OGG • Max 50MB each • Multiple files allowed
                </p>
              </div>

              {audioFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Audio Files ({audioFiles.length}):
                  </h4>
                  {audioFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center space-x-3">
                        <Mic className="h-4 w-4 text-blue-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">{file.name}</span>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)} • {file.type}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAudioFile(index)}
                        className="p-1 hover:bg-blue-200 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* File Size Warning */}
        {getTotalFileSize() > 400 * 1024 * 1024 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Large File Size Warning</h3>
                <p className="text-sm text-yellow-700">
                  Your files are quite large ({formatFileSize(getTotalFileSize())}). 
                  Upload may take several minutes depending on your internet connection.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            className="btn-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !formData.title.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating Task...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Video className="h-4 w-4" />
                <span>Create Task</span>
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadVideo;