import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Download, 
  Upload, 
  MessageCircle, 
  Send,
  Mic,
  Video,
  User,
  Calendar,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  FileVideo,
  Volume2,
  X,
  Save
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksAPI, revisionsAPI, commentsAPI, fileAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [comments, setComments] = useState([]);
  const [audioInstructions, setAudioInstructions] = useState([]);
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [newRevisionFile, setNewRevisionFile] = useState(null);
  const [newRevisionNotes, setNewRevisionNotes] = useState('');
  const [newAudioFile, setNewAudioFile] = useState(null);
  const [newAudioDescription, setNewAudioDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [showUploadRevision, setShowUploadRevision] = useState(false);
  const [showUploadAudio, setShowUploadAudio] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(null);
  
  const videoRef = useRef(null);
  const audioRefs = useRef({});

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const [taskResponse, revisionsResponse, commentsResponse, audioResponse] = await Promise.all([
        tasksAPI.getTaskById(id),
        revisionsAPI.getRevisionsByTask(id),
        commentsAPI.getTaskComments(id),
        tasksAPI.getAudioInstructions(id)
      ]);

      setTask(taskResponse.data);
      setRevisions(revisionsResponse.data);
      setComments(commentsResponse.data);
      setAudioInstructions(audioResponse.data);

      // Set latest revision or raw video as current
      if (revisionsResponse.data.length > 0) {
        const latest = revisionsResponse.data[0];
        setSelectedRevision(latest);
        setCurrentVideoUrl(createAuthenticatedVideoUrl(`/files/revision/${latest.id}`));
      } else if (taskResponse.data.rawVideoUrl) {
        setCurrentVideoUrl(createAuthenticatedVideoUrl(`/files/video/${taskResponse.data.id}`));
      }
    } catch (error) {
      console.error('Failed to fetch task details:', error);
      toast.error('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  // Create authenticated video URL that includes the token
  const createAuthenticatedVideoUrl = (endpoint) => {
    const token = localStorage.getItem('token');
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
    const url = new URL(endpoint, baseUrl);
    
    if (token) {
      url.searchParams.append('token', token);
    }
    
    console.log('Created authenticated video URL:', url.toString());
    return url.toString();
  };

  // Alternative method using fetch with auth headers
  const loadVideoWithAuth = async (endpoint) => {
    try {
      console.log('Loading video with auth from:', endpoint);
      const token = localStorage.getItem('token');
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);
      console.log('Video blob created:', videoUrl);
      return videoUrl;

    } catch (error) {
      console.error('Failed to load video with auth:', error);
      setVideoError('Failed to load video: ' + error.message);
      return null;
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await tasksAPI.updateStatus(id, newStatus);
      setTask(prev => ({ ...prev, status: newStatus }));
      toast.success('Task status updated successfully');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await commentsAPI.addTaskComment(id, { content: newComment, authorId: user.id });
      setNewComment('');
      fetchTaskDetails(); // Refresh comments
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleRevisionUpload = async (e) => {
    e.preventDefault();
    if (!newRevisionFile) {
      toast.error('Please select a video file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('taskId', id);
      formData.append('videoFile', newRevisionFile);
      formData.append('notes', newRevisionNotes);

      await revisionsAPI.createRevision(formData);
      setNewRevisionFile(null);
      setNewRevisionNotes('');
      setShowUploadRevision(false);
      fetchTaskDetails(); // Refresh revisions
      toast.success('Revision uploaded successfully');
    } catch (error) {
      console.error('Failed to upload revision:', error);
      toast.error('Failed to upload revision');
    }
  };

  const handleAudioUpload = async (e) => {
    e.preventDefault();
    if (!newAudioFile) {
      toast.error('Please select an audio file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('audioFile', newAudioFile);
      formData.append('description', newAudioDescription);

      await tasksAPI.addAudioInstruction(id, formData);
      setNewAudioFile(null);
      setNewAudioDescription('');
      setShowUploadAudio(false);
      fetchTaskDetails(); // Refresh audio instructions
      toast.success('Audio instruction uploaded successfully');
    } catch (error) {
      console.error('Failed to upload audio:', error);
      toast.error('Failed to upload audio instruction');
    }
  };

  const handleRevisionSelect = async (revision) => {
    console.log('Selecting revision:', revision);
    setSelectedRevision(revision);
    setVideoError(null);
    
    // Try to load video with authentication
    const videoUrl = await loadVideoWithAuth(`/files/revision/${revision.id}`);
    if (videoUrl) {
      setCurrentVideoUrl(videoUrl);
      if (videoRef.current) {
        videoRef.current.load();
      }
    }
  };

  const handleRawVideoSelect = async () => {
    console.log('Selecting raw video for task:', task.id);
    setSelectedRevision(null);
    setVideoError(null);
    
    // Try to load video with authentication
    const videoUrl = await loadVideoWithAuth(`/files/video/${task.id}`);
    if (videoUrl) {
      setCurrentVideoUrl(videoUrl);
      if (videoRef.current) {
        videoRef.current.load();
      }
    }
  };

  const handlePlayAudio = async (audioId) => {
    if (playingAudio === audioId) {
      // Pause current audio
      const audio = audioRefs.current[audioId];
      if (audio) {
        audio.pause();
      }
      setPlayingAudio(null);
    } else {
      // Stop other audio and play new one
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) audio.pause();
      });

      try {
        // Load audio with authentication
        const token = localStorage.getItem('token');
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
        
        const response = await fetch(`${baseUrl}/files/audio/${audioId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);

        if (!audioRefs.current[audioId]) {
          audioRefs.current[audioId] = new Audio(audioUrl);
          audioRefs.current[audioId].addEventListener('ended', () => {
            setPlayingAudio(null);
            URL.revokeObjectURL(audioUrl); // Clean up blob URL
          });
          audioRefs.current[audioId].addEventListener('error', (e) => {
            console.error('Audio error:', e);
            toast.error('Failed to load audio file');
            setPlayingAudio(null);
            URL.revokeObjectURL(audioUrl); // Clean up blob URL
          });
        }

        await audioRefs.current[audioId].play();
        setPlayingAudio(audioId);
      } catch (error) {
        console.error('Failed to play audio:', error);
        toast.error('Failed to play audio');
      }
    }
  };

  const handleVideoPlay = () => {
    setIsVideoPlaying(true);
  };

  const handleVideoPause = () => {
    setIsVideoPlaying(false);
  };

  const handleVideoError = (e) => {
    console.error('Video error:', e);
    setVideoError('Failed to load video. Please check your connection and try again.');
    setIsVideoPlaying(false);
  };

  const handleDownload = async (endpoint, filename) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      ASSIGNED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-orange-100 text-orange-800',
      REVIEW: 'bg-purple-100 text-purple-800',
      READY: 'bg-green-100 text-green-800',
      SCHEDULED: 'bg-indigo-100 text-indigo-800',
      UPLOADED: 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      HIGH: 'bg-red-100 text-red-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LOW: 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getAvailableStatusTransitions = () => {
    if (!task) return [];
    
    const { status } = task;
    const isAdmin = user.role === 'ADMIN';
    const isAssignedEditor = task.assignedEditor?.id === user.id;

    if (isAdmin) {
      // Admin can transition to any status
      const allStatuses = ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'READY', 'SCHEDULED', 'UPLOADED'];
      return allStatuses.filter(s => s !== status);
    }

    if (isAssignedEditor) {
      switch (status) {
        case 'ASSIGNED':
          return ['IN_PROGRESS'];
        case 'IN_PROGRESS':
          return ['REVIEW', 'READY'];
        case 'REVIEW':
          return ['IN_PROGRESS', 'READY'];
        case 'READY':
          return ['IN_PROGRESS'];
        default:
          return [];
      }
    }

    return [];
  };

  const formatStatus = (status) => {
    return status?.replace('_', ' ').toLowerCase() || 'draft';
  };

  const canUploadRevision = () => {
    return user.role === 'ADMIN' || task?.assignedEditor?.id === user.id;
  };

  const canAddAudioInstruction = () => {
    return user.role === 'ADMIN' || task?.createdBy?.id === user.id || task?.assignedEditor?.id === user.id;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-gray-200 rounded-xl h-96"></div>
          <div className="bg-gray-200 rounded-xl h-96"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Task not found</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                {formatStatus(task.status)}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority?.toLowerCase()}
              </span>
              {task.privacyLevel === 'SELECTED' && (
                <span className="flex items-center text-sm text-gray-500">
                  <Shield className="h-4 w-4 mr-1" />
                  Private
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Update Buttons */}
        {getAvailableStatusTransitions().length > 0 && (
          <div className="flex flex-wrap gap-2">
            {getAvailableStatusTransitions().map(status => (
              <button
                key={status}
                onClick={() => handleStatusUpdate(status)}
                className="btn-secondary text-sm whitespace-nowrap"
              >
                Move to {formatStatus(status)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player and Revisions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedRevision ? `Revision #${selectedRevision.revisionNumber}` : 'Raw Video'}
              </h3>
              <div className="flex space-x-2">
                {currentVideoUrl && (
                  <button
                    onClick={() => handleDownload(
                      selectedRevision ? `/files/download/revision/${selectedRevision.id}` : `/files/download/video/${task.id}`,
                      selectedRevision ? selectedRevision.editedVideoFilename : task.rawVideoFilename
                    )}
                    className="btn-secondary text-sm flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                )}
              </div>
            </div>

            {videoError ? (
              <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                <p className="text-red-600 text-center">{videoError}</p>
                <button 
                  onClick={selectedRevision ? () => handleRevisionSelect(selectedRevision) : handleRawVideoSelect}
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
                  style={{ maxHeight: '500px' }}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onError={handleVideoError}
                  onLoadStart={() => console.log('Video loading started')}
                  onLoadedData={() => console.log('Video data loaded')}
                  onCanPlay={() => console.log('Video can play')}
                >
                  Your browser does not support the video tag.
                </video>
                {isVideoPlaying && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    Playing
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
                <FileVideo className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No video available</p>
                {task.rawVideoUrl && (
                  <button 
                    onClick={handleRawVideoSelect}
                    className="btn-primary mt-4 text-sm"
                  >
                    Load Raw Video
                  </button>
                )}
              </div>
            )}

            {selectedRevision && selectedRevision.notes && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Revision Notes:</strong> {selectedRevision.notes}
                </p>
              </div>
            )}
          </div>

          {/* Revisions List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Revisions History</h3>
              {canUploadRevision() && (
                <button
                  onClick={() => setShowUploadRevision(!showUploadRevision)}
                  className="btn-primary text-sm flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Revision</span>
                </button>
              )}
            </div>

            {/* Upload Revision Form */}
            {showUploadRevision && (
              <form onSubmit={handleRevisionUpload} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video File *
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setNewRevisionFile(e.target.files[0])}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={newRevisionNotes}
                      onChange={(e) => setNewRevisionNotes(e.target.value)}
                      rows={3}
                      className="input-field"
                      placeholder="Add notes about this revision..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button type="submit" className="btn-primary text-sm">
                      <Save className="h-4 w-4 mr-2" />
                      Upload Revision
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUploadRevision(false)}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Raw Video */}
            {task.rawVideoUrl && (
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all mb-3 ${
                  !selectedRevision 
                    ? 'border-primary-500 bg-primary-50 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={handleRawVideoSelect}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Video className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">Raw Video (Original)</p>
                      <p className="text-sm text-gray-500">
                        Uploaded {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {!selectedRevision && <CheckCircle className="h-5 w-5 text-primary-500" />}
                </div>
              </div>
            )}

            {/* Revision List */}
            <div className="space-y-3">
              {revisions.map((revision) => (
                <div
                  key={revision.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedRevision?.id === revision.id 
                      ? 'border-primary-500 bg-primary-50 shadow-sm' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleRevisionSelect(revision)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileVideo className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Revision #{revision.revisionNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(revision.createdAt), { addSuffix: true })} 
                          by {revision.uploadedBy.username}
                        </p>
                        {revision.notes && (
                          <p className="text-sm text-gray-600 mt-1 italic">"{revision.notes}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedRevision?.id === revision.id && (
                        <CheckCircle className="h-5 w-5 text-primary-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(`/files/download/revision/${revision.id}`, revision.editedVideoFilename);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {revisions.length === 0 && (
              <div className="text-center py-8">
                <FileVideo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No revisions uploaded yet</p>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900 mt-1">{task.description || 'No description provided'}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created by</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{task.createdBy.username}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned to</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{task.assignedEditor?.username || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">
                    {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {task.deadline && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Deadline</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">
                      {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {revisions.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Revisions</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <FileVideo className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{revisions.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Audio Instructions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Audio Instructions</h3>
              {canAddAudioInstruction() && (
                <button
                  onClick={() => setShowUploadAudio(!showUploadAudio)}
                  className="btn-primary text-sm flex items-center space-x-2"
                >
                  <Mic className="h-4 w-4" />
                  <span>Add Audio</span>
                </button>
              )}
            </div>

            {/* Upload Audio Form */}
            {showUploadAudio && (
              <form onSubmit={handleAudioUpload} className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Audio File *
                    </label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setNewAudioFile(e.target.files[0])}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={newAudioDescription}
                      onChange={(e) => setNewAudioDescription(e.target.value)}
                      className="input-field"
                      placeholder="Brief description of the instruction..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button type="submit" className="btn-primary text-sm">
                      <Save className="h-4 w-4 mr-2" />
                      Upload Audio
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUploadAudio(false)}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}
            
            {audioInstructions.length > 0 ? (
              <div className="space-y-3">
                {audioInstructions.map((audio) => (
                  <div key={audio.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handlePlayAudio(audio.id)}
                          className={`p-2 rounded-full transition-colors ${
                            playingAudio === audio.id 
                              ? 'bg-red-100 hover:bg-red-200' 
                              : 'bg-blue-100 hover:bg-blue-200'
                          }`}
                        >
                          {playingAudio === audio.id ? (
                            <Pause className="h-4 w-4 text-red-600" />
                          ) : (
                            <Play className="h-4 w-4 text-blue-600" />
                          )}
                        </button>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{audio.audioFilename}</p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(audio.createdAt), { addSuffix: true })} 
                            by {audio.uploadedBy.username}
                          </p>
                        </div>
                      </div>
                    </div>
                    {audio.description && (
                      <p className="text-sm text-gray-600 mt-2 italic">"{audio.description}"</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Volume2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No audio instructions</p>
                {canAddAudioInstruction() && (
                  <button
                    onClick={() => setShowUploadAudio(true)}
                    className="btn-primary mt-4 text-sm"
                  >
                    Add First Audio Instruction
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>
            
            {/* Add Comment Form */}
            <form onSubmit={handleCommentSubmit} className="mb-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 input-field"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-medium text-primary-600">
                    {comment.author.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{comment.author.username}</span>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1 break-words">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {comments.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No comments yet</p>
                <p className="text-sm text-gray-400 mt-1">Start the discussion by adding a comment</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;