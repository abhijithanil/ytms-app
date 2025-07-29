import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import axios from "axios";

// API imports
import api, {
  tasksAPI,
  revisionsAPI,
  commentsAPI,
  metadataAPI,
  youtubeChannelAPI,
  youtubeOAuthAPI
} from "../services/api";

// Context
import { useAuth } from "../context/AuthContext";

// Component imports
import TaskHeader from "../components/TaskHeader";
import VideoPlayer from "../components/VideoPlayer";
import CommentsSection from "../components/CommentsSection";
import TaskInfoSidebar from "../components/TaskInfoSidebar";
import RevisionsList from "../components/RevisionsList";
import AudioInstructions from "../components/AudioInstructions";
import ApprovalSection from "../components/ApprovalSection";
import MobileCollapsibleSidebar from "../components/MobileCollapsibleSidebar";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import EditTaskModal from "../components/EditTaskModal";
import SingleRevisionMetadataModal from "../components/SingleRevisionMetadataModal";

// Icons for loading state
import { AlertCircle, Youtube, Settings, X, Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

const { isCancel, CancelToken } = axios;

// Countdown Timer Component
const CountdownTimer = ({ targetTime }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(targetTime).getTime();
      const difference = target - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft('Upload should start soon...');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  return <span>{timeLeft}</span>;
};

const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core state
  const [task, setTask] = useState(null);
  const [revisionMetadata, setRevisionMetadata] = useState({});
  const [revisions, setRevisions] = useState([]);
  const [comments, setComments] = useState([]);
  const [audioInstructions, setAudioInstructions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Video state
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [selectedRawVideo, setSelectedRawVideo] = useState(null);
  const [selectedRevisionsForUpload, setSelectedRevisionsForUpload] = useState([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(null);

  // Comments state
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  // Revisions state
  const [showUploadRevision, setShowUploadRevision] = useState(false);
  const [newRevisionFile, setNewRevisionFile] = useState(null);
  const [newRevisionNotes, setNewRevisionNotes] = useState("");
  const [newRevisionType, setNewRevisionType] = useState("main");
  const [isRevisionSubmitting, setIsRevisionSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadToastId, setUploadToastId] = useState(null);
  const [cancelTokenSource, setCancelTokenSource] = useState(null);

  // Audio state
  const [showUploadAudio, setShowUploadAudio] = useState(false);
  const [newAudioDescription, setNewAudioDescription] = useState("");
  const [playingAudio, setPlayingAudio] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentAudioBlob, setCurrentAudioBlob] = useState(null);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSingleRevisionMetadataModal, setShowSingleRevisionMetadataModal] = useState(false);
  const [selectedRevisionForMetadata, setSelectedRevisionForMetadata] = useState(null);
  const [showUploadSelectionModal, setShowUploadSelectionModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");

  // Channel state - will hold processed channels with connection status
  const [channels, setChannels] = useState([]);
  const [uploadChannelSelections, setUploadChannelSelections] = useState({});

  // NEW: Playlist-related state
  const [channelPlaylists, setChannelPlaylists] = useState({}); // Store playlists for each channel
  const [loadingPlaylists, setLoadingPlaylists] = useState({}); // Track loading state per channel
  const [expandedChannels, setExpandedChannels] = useState({}); // Track which channels are expanded
  const [selectedPlaylists, setSelectedPlaylists] = useState({}); // Store selected playlists per revision

  // Upload state - optimized with better tracking
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStartTime, setUploadStartTime] = useState(null);
  const [currentUploadDuration, setCurrentUploadDuration] = useState("");

  // Refs
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRefs = useRef({});
  const uploadPollingRef = useRef(null);
  const uploadDurationRef = useRef(null);

  // Memoized helper functions
  const formatUploadDuration = useCallback((startTime) => {
    if (!startTime) return "";

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, []);

  // Real-time upload duration updater
  useEffect(() => {
    if (isUploading && uploadStartTime) {
      const updateDuration = () => {
        setCurrentUploadDuration(formatUploadDuration(uploadStartTime));
      };

      updateDuration();
      uploadDurationRef.current = setInterval(updateDuration, 1000);

      return () => {
        if (uploadDurationRef.current) {
          clearInterval(uploadDurationRef.current);
        }
      };
    } else {
      if (uploadDurationRef.current) {
        clearInterval(uploadDurationRef.current);
        uploadDurationRef.current = null;
      }
      setCurrentUploadDuration("");
    }
  }, [isUploading, uploadStartTime, formatUploadDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (uploadPollingRef.current) {
        clearInterval(uploadPollingRef.current);
      }
      if (uploadDurationRef.current) {
        clearInterval(uploadDurationRef.current);
      }
    };
  }, []);

  // Fetch revision metadata from server
  const fetchRevisionMetadata = async (taskId) => {
    try {
      const response = await metadataAPI.getAllRevisionMetadataForTask(taskId);
      if (response.data) {
        setRevisionMetadata(response.data);
      }
    } catch (error) {
      console.warn("Failed to fetch revision metadata:", error);
      // Don't show error toast as this might be expected (no metadata exists yet)
    }
  };

  // NEW: Fetch playlists for a specific channel
  const fetchChannelPlaylists = async (channelId) => {
    if (channelPlaylists[channelId] || loadingPlaylists[channelId]) {
      return; // Already loaded or loading
    }

    setLoadingPlaylists(prev => ({ ...prev, [channelId]: true }));
    
    try {
      const response = await youtubeChannelAPI.getPlayLists(channelId);
      setChannelPlaylists(prev => ({
        ...prev,
        [channelId]: response.data || []
      }));
    } catch (error) {
      console.error(`Failed to fetch playlists for channel ${channelId}:`, error);
      toast.error("Failed to load playlists");
      setChannelPlaylists(prev => ({
        ...prev,
        [channelId]: []
      }));
    } finally {
      setLoadingPlaylists(prev => ({ ...prev, [channelId]: false }));
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTaskAndChannelDetails();
  }, [id]);

  // Auto-select video logic - prioritize latest revision, then raw video
  useEffect(() => {
    if (task && !isUploading && !selectedRevision && !selectedRawVideo) {
      // First try to select latest revision if available
      if (revisions && revisions.length > 0) {
        // Revisions are typically ordered by creation date, get the first one (latest)
        handleRevisionSelect(revisions[0]);
      }
      // Only fall back to raw video if no revisions exist
      else if (task.rawVideos && task.rawVideos.length > 0) {
        handleRawVideoSelect(task.rawVideos[0]);
      }
      // Legacy support for single raw video
      else if (task.rawVideoUrl) {
        // For legacy single raw video, we can't "select" it but we can fetch its URL
        fetchAndSetVideoUrl(`/tasks/${task.id}/video-url`);
      }
    }
  }, [task, revisions, isUploading, selectedRawVideo, selectedRevision]);

  // Check for ongoing uploads and scheduled tasks when component mounts
  useEffect(() => {
    const checkUploadStatus = () => {
      const uploadKey = `upload_${id}`;
      const uploadData = localStorage.getItem(uploadKey);

      if (uploadData) {
        console.log("Found existing upload data:", uploadData);
        const { startTime } = JSON.parse(uploadData);

        const timeElapsed = Date.now() - startTime;
        const maxUploadTime = 60 * 60 * 1000;

        if (timeElapsed > maxUploadTime) {
          console.log("Upload timeout reached, clearing state");
          localStorage.removeItem(uploadKey);
          toast.error("Upload timeout reached. Please try again.");
          return;
        }

        setIsUploading(true);
        setUploadStartTime(startTime);
        startUploadPolling();
      }
    };

    const checkScheduledUpload = () => {
      if (task?.status === 'SCHEDULED' && task?.scheduledUploadTime) {
        const scheduledTime = new Date(task.scheduledUploadTime).getTime();
        const currentTime = Date.now();
        
        if (currentTime >= scheduledTime) {
          // Time has passed, start checking for upload status
          startUploadPolling();
        } else {
          // Set a timeout to start checking when the time comes
          const timeUntilUpload = scheduledTime - currentTime;
          setTimeout(() => {
            startUploadPolling();
          }, timeUntilUpload);
        }
      }
    };

    checkUploadStatus();
    if (task) {
      checkScheduledUpload();
    }
  }, [id, task]);

  // Optimized polling function
  const startUploadPolling = useCallback(() => {
    console.log("Starting upload polling...");

    if (uploadPollingRef.current) {
      clearInterval(uploadPollingRef.current);
    }

    uploadPollingRef.current = setInterval(async () => {
      try {
        console.log("Polling task status...");
        const response = await tasksAPI.getTaskById(id);
        const updatedTask = response.data;

        console.log("Current task status:", updatedTask.status);

        if (updatedTask.status !== "UPLOADING" && updatedTask.status !== "SCHEDULED") {
          console.log("Status is no longer UPLOADING/SCHEDULED, stopping polling...");

          if (uploadPollingRef.current) {
            clearInterval(uploadPollingRef.current);
            uploadPollingRef.current = null;
          }

          if (uploadDurationRef.current) {
            clearInterval(uploadDurationRef.current);
            uploadDurationRef.current = null;
          }

          const uploadKey = `upload_${id}`;
          localStorage.removeItem(uploadKey);
          setIsUploading(false);
          setUploadStartTime(null);
          setCurrentUploadDuration("");

          setTask(updatedTask);

          if (
            updatedTask.status === "COMPLETED" ||
            updatedTask.status === "UPLOADED"
          ) {
            toast.success("Upload completed successfully!", {
              duration: 5000,
              icon: "🎉",
            });
          } else if (updatedTask.status === "FAILED") {
            toast.error("Upload failed. Please try again.", {
              duration: 5000,
            });
          } else {
            toast.info(`Task status changed to: ${updatedTask.status}`, {
              duration: 3000,
            });
          }

          return;
        }

        // If status changed to UPLOADING from SCHEDULED, update our upload state
        if (updatedTask.status === "UPLOADING" && !isUploading) {
          setIsUploading(true);
          setUploadStartTime(Date.now());
        }

        if (task?.status !== updatedTask.status) {
          setTask(updatedTask);
        }
      } catch (error) {
        console.warn("Error polling task status:", error);
      }
    }, 5000);
  }, [id, task?.status, isUploading]);

  // Initial data fetch function - ENHANCED
  const fetchTaskAndChannelDetails = async () => {
    try {
      setLoading(true);
      const [
        taskResponse,
        revisionsResponse,
        commentsResponse,
        audioResponse,
        allChannelsResponse, // Get all possible channels configured in the system
        connectedAccountsResponse, // Get accounts connected by the current user
      ] = await Promise.all([
        tasksAPI.getTaskById(id),
        revisionsAPI.getRevisionsByTask(id),
        commentsAPI.getTaskComments(id),
        tasksAPI.getAudioInstructions(id),
        youtubeChannelAPI.getAllChannels(), // Assumes this API endpoint exists
        youtubeOAuthAPI.getConnectedAccounts(),
      ]);

      setTask(taskResponse.data);
      setRevisions(revisionsResponse.data);
      setComments(commentsResponse.data);
      setAudioInstructions(audioResponse.data);

      // Process channel data to determine connection status
      const allSystemChannels = allChannelsResponse.data || [];
      const connectedAccounts = connectedAccountsResponse.data || [];
      
      const connectedChannelIds = new Set(
        connectedAccounts.flatMap(account => account.channels.map(channel => channel.id))
      );
      
      const processedChannels = allSystemChannels.map(channel => ({
        ...channel, // Expects { id: number, channelName: string }
        isConnected: connectedChannelIds.has(channel.id),
      }));
      setChannels(processedChannels);

      // Fetch revision metadata after getting task details
      await fetchRevisionMetadata(id);
    } catch (error) {
      console.error("Failed to fetch page details:", error);
      toast.error("Failed to load page details");
    } finally {
      setLoading(false);
    }
  };

  const fetchAndSetVideoUrl = async (url) => {
    if (isUploading) {
      console.log("Skipping video URL fetch during upload");
      return;
    }

    try {
      setVideoError(null);
      setCurrentVideoUrl("");

      const response = await api.get(url);
      if (response.status !== 200) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const signedUrl = response.data.url;
      if (signedUrl) {
        setCurrentVideoUrl(signedUrl);
      } else {
        throw new Error("Received an empty URL from the server.");
      }
    } catch (error) {
      console.error("Failed to fetch video URL:", error);
      setVideoError("Failed to load video. Please refresh and try again.");
    }
  };

  // Task handlers
  const handleTaskUpdate = useCallback((updatedTask) => {
    setTask(updatedTask);
  }, []);

  // Video handlers
  const handleRevisionSelect = async (revision) => {
    if (!task) return;
    setSelectedRevision(revision);
    setSelectedRawVideo(null);
    fetchAndSetVideoUrl(`/revisions/${revision.id}/task/${task.id}/video-url`);
  };

  const handleRawVideoSelect = async (rawVideo) => {
    if (!task) return;
    setSelectedRawVideo(rawVideo);
    setSelectedRevision(null);
    fetchAndSetVideoUrl(`/tasks/${task.id}/raw-video/${rawVideo.id}/video-url`);
  };

  const handleToggleRevisionForUpload = (revision) => {
    setSelectedRevisionsForUpload((prev) => {
      const exists = prev.find((r) => r.id === revision.id);
      if (exists) {
        // Remove from selection
        const updated = prev.filter((r) => r.id !== revision.id);
        // Also remove from channel selections and playlist selections
        setUploadChannelSelections((prevSelections) => {
          const newSelections = { ...prevSelections };
          delete newSelections[revision.id];
          return newSelections;
        });
        setSelectedPlaylists((prevPlaylists) => {
          const newPlaylists = { ...prevPlaylists };
          delete newPlaylists[revision.id];
          return newPlaylists;
        });
        return updated;
      } else {
        // Add to selection
        return [...prev, revision];
      }
    });
  };

  const handleVideoPlay = () => setIsVideoPlaying(true);
  const handleVideoPause = () => setIsVideoPlaying(false);
  const handleVideoError = (e) => {
    console.error("Video error:", e);
    setVideoError(
      "Failed to load video. Please check your connection and try again."
    );
    setIsVideoPlaying(false);
  };

  // Download handler
  const handleDownload = async (endpoint) => {
    try {
      const token = localStorage.getItem("token");
      const baseUrl =
        process.env.REACT_APP_API_URL || "http://localhost:8080/api";

      const signedUrlResponse = await fetch(`${baseUrl}${endpoint}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!signedUrlResponse.ok) {
        throw new Error(
          `HTTP ${signedUrlResponse.status}: ${signedUrlResponse.statusText}`
        );
      }

      const { signedUrl, fileName } = await signedUrlResponse.json();
      if (!signedUrl) {
        throw new Error("No download URL received from server");
      }

      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok) {
        throw new Error(
          `Download failed: ${fileResponse.status} ${fileResponse.statusText}`
        );
      }

      const blob = await fileResponse.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Download started");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Download failed: " + error.message);
    }
  };

  // Handle single revision metadata modal
  const handleShowRevisionMetadataModal = (revision) => {
    setSelectedRevisionForMetadata(revision);
    setShowSingleRevisionMetadataModal(true);
  };

  // Handle single revision metadata submit
  const handleSingleRevisionMetadataSubmit = async (metadataData) => {
    try {
      const revisionId = selectedRevisionForMetadata.id;
      await metadataAPI.createRevisionMetadata(revisionId, metadataData);
      
      // Update local state
      setRevisionMetadata(prev => ({
        ...prev,
        [revisionId]: metadataData
      }));
      
      toast.success("Revision metadata saved successfully");
      setShowSingleRevisionMetadataModal(false);
      setSelectedRevisionForMetadata(null);
    } catch (error) {
      console.error("Failed to save revision metadata:", error);
      toast.error("Failed to save revision metadata");
    }
  };

  // Multi-video upload validation
  const handleShowUploadSelection = () => {
    if (selectedRevisionsForUpload.length === 0) {
      toast.error("Please select at least one revision to upload.");
      return;
    }

    // Check if metadata exists for selected revisions using revisionMetadata state
    const missingMetadata = selectedRevisionsForUpload.filter(
      (revision) => !revisionMetadata[revision.id] || Object.keys(revisionMetadata[revision.id]).length === 0
    );

    if (missingMetadata.length > 0) {
      toast.error(`Please add metadata for all selected revisions first. Missing: ${missingMetadata.map(r => `#${r.revisionNumber}`).join(', ')}`);
      return;
    }

    setShowUploadSelectionModal(true);
  };

  // NEW: Handle channel selection and fetch playlists
  const handleChannelSelection = async (revisionId, channelId) => {
    setUploadChannelSelections((prev) => ({
      ...prev,
      [revisionId]: channelId,
    }));

    // Clear previously selected playlists for this revision
    setSelectedPlaylists((prev) => ({
      ...prev,
      [revisionId]: []
    }));

    // Fetch playlists for the selected channel
    if (channelId) {
      await fetchChannelPlaylists(channelId);
      // Expand the channel to show playlists
      setExpandedChannels(prev => ({
        ...prev,
        [`${revisionId}-${channelId}`]: true
      }));
    }
  };

  // NEW: Handle playlist selection
  const handlePlaylistSelection = (revisionId, playlistId, isSelected) => {
    setSelectedPlaylists(prev => {
      const currentPlaylists = prev[revisionId] || [];
      
      if (isSelected) {
        // Add playlist if not already selected
        if (!currentPlaylists.includes(playlistId)) {
          return {
            ...prev,
            [revisionId]: [...currentPlaylists, playlistId]
          };
        }
      } else {
        // Remove playlist
        return {
          ...prev,
          [revisionId]: currentPlaylists.filter(id => id !== playlistId)
        };
      }
      
      return prev;
    });
  };

  // NEW: Toggle channel expansion
  const toggleChannelExpansion = async (revisionId, channelId) => {
    const key = `${revisionId}-${channelId}`;
    const isExpanded = expandedChannels[key];
    
    setExpandedChannels(prev => ({
      ...prev,
      [key]: !isExpanded
    }));

    // Fetch playlists if expanding and not already loaded
    if (!isExpanded && channelId) {
      await fetchChannelPlaylists(channelId);
    }
  };

  // Multi-video upload using revision metadata with playlists
  const handleMultiVideoUpload = async () => {
    // Validate all selections have channels
    const missingChannels = selectedRevisionsForUpload.filter(
      (revision) => !uploadChannelSelections[revision.id]
    );

    if (missingChannels.length > 0) {
      toast.error("Please select a channel for all videos.");
      return;
    }

    if (isUploading || uploadPollingRef.current) {
      console.log("Upload already in progress, ignoring request");
      return;
    }
  

    setIsUploading(true);
    const startTime = Date.now();
    setUploadStartTime(startTime);

    const uploadKey = `upload_${id}`;
    localStorage.setItem(
      uploadKey,
      JSON.stringify({
        startTime,
        status: "UPLOADING",
      })
    );

    try {
      // Prepare upload data for multiple videos using revision metadata and playlists
      const uploadData = selectedRevisionsForUpload.map((revision) => {
        const metadata = { ...revisionMetadata[revision.id] };
        const revisionPlaylists = selectedPlaylists[revision.id] || [];
        
        // Append selected playlists to metadata if any are selected
        if (revisionPlaylists.length > 0) {
          metadata.playlist_ids = revisionPlaylists;
        }

        return {
          revisionId: revision.id,
          channelId: uploadChannelSelections[revision.id],
          metadata: metadata,
        };
      });

      const response = await tasksAPI.doMultiVideoYoutubeUpload({
        taskId: id,
        uploads: uploadData,
      });

      if (response.status !== 200) {
        throw new Error(
          response?.data?.message ||
            "Unknown error occurred when uploading videos to YouTube"
        );
      }

      setTask((prev) => ({ ...prev, status: "UPLOADING" }));
      toast.success(response?.data?.message || "Uploads started successfully!");
      setShowUploadSelectionModal(false);
      setSelectedRevisionsForUpload([]);
      setUploadChannelSelections({});
      setSelectedPlaylists({});
      setExpandedChannels({});

      startUploadPolling();
    } catch (error) {
      localStorage.removeItem(uploadKey);
      setIsUploading(false);
      setUploadStartTime(null);
      setCurrentUploadDuration("");

      if (uploadPollingRef.current) {
        clearInterval(uploadPollingRef.current);
        uploadPollingRef.current = null;
      }

      toast.error(
        error.response?.data?.message || "Failed to start YouTube uploads."
      );

      if (
         error.response?.data?.message.includes("YouTube account not connected")
      ) {
        toast.error(error.response?.data?.message);
        navigate("/settings");
      }
      console.error("Failed to initiate YouTube uploads:", error);
    }
  };

  // Status and task management
  const handleStatusUpdate = async (newStatus) => {
    try {
      await tasksAPI.updateStatus(id, newStatus);
      setTask((prev) => ({ ...prev, status: newStatus }));
      toast.success("Task status updated successfully");
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update task status");
    }
  };

  const handleTaskDelete = async () => {
    setIsDeleting(true);
    try {
      const resp = await tasksAPI.deleteTask(id);
      const { deleteStatus } = resp.data;
      if (deleteStatus) {
        toast.success("Task deleted successfully");
        navigate("/tasks");
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleTaskEdit = async (data) => {
    try {
      const response = await tasksAPI.updateTask(id, data);
      setTask(response.data);
      setShowEditModal(false);
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  };

  // Comment handlers
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await commentsAPI.addTaskComment(id, {
        content: newComment,
        authorId: user.id,
      });
      setNewComment("");
      fetchTaskAndChannelDetails();
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const handleSaveEdit = async (commentId) => {
    if (!editingCommentText.trim()) return;

    try {
      await commentsAPI.updateComment(commentId, {
        content: editingCommentText,
      });
      setEditingCommentId(null);
      setEditingCommentText("");
      fetchTaskAndChannelDetails();
      toast.success("Comment updated successfully");
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast.error("Failed to update comment");
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleDeleteComment = async (commentId) => {
    setDeletingCommentId(commentId);
    try {
      await commentsAPI.deleteComment(commentId);
      fetchTaskAndChannelDetails();
      toast.success("Comment deleted successfully");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Upload file to GCS helper
  const uploadFileToGCS = async (
    signedUrl,
    file,
    onProgress,
    cancelTokenSource
  ) => {
    const init = await fetch(signedUrl, {
      method: "POST",
      headers: {
        "x-goog-resumable": "start",
        "Content-Type": file.type || "application/octet-stream",
      },
    });

    if (!init.ok) {
      const text = await init.text();
      throw new Error(
        `Failed to start resumable upload: ${init.status} ${init.statusText}\n${text}`
      );
    }

    const sessionUri = init.headers.get("Location");
    if (!sessionUri) throw new Error("Missing resumable session URI");

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (cancelTokenSource && cancelTokenSource.token) {
        cancelTokenSource.token.promise.then((cancel) => {
          xhr.abort();
          reject(cancel);
        });
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          resolve({ status: xhr.status });
        } else {
          reject(
            new Error(
              `Upload failed: ${xhr.status} ${xhr.statusText}\n${xhr.responseText}`
            )
          );
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload cancelled"));
      xhr.ontimeout = () => reject(new Error("Upload timed out"));
      xhr.timeout = 30 * 60 * 1000;
      xhr.open("PUT", sessionUri);
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream"
      );
      xhr.send(file);
    });
  };

  // Revision handlers
  const UploadProgressToast = ({ progress, fileName, onCancel }) => (
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5">
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <div className="relative">
              <svg className="h-10 w-10" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-primary-600"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${progress}, 100`}
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute top-0 left-0 h-full w-full flex items-center justify-center">
                <span className="text-xs font-bold text-primary-600">
                  {progress}%
                </span>
              </div>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              Uploading file...
            </p>
            <p className="mt-1 text-sm text-gray-500 truncate" title={fileName}>
              {fileName}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-200">
        <button
          onClick={onCancel}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const handleCancelUpload = () => {
    if (cancelTokenSource) {
      cancelTokenSource.cancel("Upload cancelled by user.");
      if (uploadToastId) toast.dismiss(uploadToastId);
      setIsRevisionSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleRevisionUpload = async (e) => {
    e.preventDefault();
    if (!newRevisionFile) {
      toast.error("Please select a video file.");
      return;
    }

    setIsRevisionSubmitting(true);
    const source = CancelToken.source();
    setCancelTokenSource(source);
    let currentToastId;

    try {
      const signedUrlResponse = await tasksAPI.generateUploadUrl(
        newRevisionFile.name,
        newRevisionFile.type,
        "revision-videos"
      );
      const { signedUrl, objectName } = signedUrlResponse.data;

      currentToastId = toast.custom(
        (t) => (
          <UploadProgressToast
            progress={0}
            fileName={newRevisionFile.name}
            onCancel={() => {
              toast.dismiss(t.id);
              handleCancelUpload();
            }}
          />
        ),
        { duration: Infinity }
      );
      setUploadToastId(currentToastId);

      const handleProgress = (progress) => {
        setUploadProgress(progress);
        toast.custom(
          (t) => (
            <UploadProgressToast
              progress={progress}
              fileName={newRevisionFile.name}
              onCancel={() => {
                toast.dismiss(t.id);
                handleCancelUpload();
              }}
            />
          ),
          { id: currentToastId }
        );
      };

      await uploadFileToGCS(signedUrl, newRevisionFile, handleProgress, source);
      toast.dismiss(currentToastId);

      const revisionUploadFormData = new FormData();
      revisionUploadFormData.append("notes", newRevisionNotes);
      revisionUploadFormData.append("videoTaskId", task.id);
      revisionUploadFormData.append("type", newRevisionType);

      const gcsUrl = `gs://${
        process.env.REACT_APP_GCP_BUCKET_NAME || "ytmthelper-inspire26"
      }/${objectName}`;
      revisionUploadFormData.append("editedVideoUrl", gcsUrl);
      revisionUploadFormData.append(
        "editedVideoFilename",
        newRevisionFile.name
      );

      await revisionsAPI.createRevision(revisionUploadFormData);
      toast.success("Revision created successfully!");
      fetchTaskAndChannelDetails();

      setShowUploadRevision(false);
      setNewRevisionNotes("");
      setNewRevisionFile(null);
      setNewRevisionType("main");
    } catch (error) {
      if (isCancel(error)) {
        toast.error("Upload cancelled.");
      } else {
        if (currentToastId) toast.dismiss(currentToastId);
        toast.error("Failed to create revision. Please try again.");
      }
      setUploadProgress(0);
    } finally {
      setIsRevisionSubmitting(false);
      setCancelTokenSource(null);
      setUploadToastId(null);
    }
  };

  const handleRevisionDelete = async (revisionId) => {
    try {
      await revisionsAPI.deleteRevision(revisionId);
      toast.success("Revision deleted successfully");
      fetchTaskAndChannelDetails();
    } catch (error) {
      console.error("Failed to delete revision:", error);
      toast.error("Failed to delete revision");
    }
  };

  // Audio recording handlers
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setCurrentAudioBlob(null);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setCurrentAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      clearInterval(recordingIntervalRef.current);
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const togglePauseResume = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime((prevTime) => prevTime + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const resetRecording = () => {
    setCurrentAudioBlob(null);
    setRecordingTime(0);
    if (isRecording || isPaused) {
      stopRecording();
    }
  };

  const handleAudioUpload = async (e) => {
    e.preventDefault();
    if (!currentAudioBlob) {
      toast.error("Please record an audio instruction first.");
      return;
    }

    try {
      const audioFile = new File(
        [currentAudioBlob],
        `instruction-${Date.now()}.webm`,
        {
          type: currentAudioBlob.type,
        }
      );

      const signedUrlResponse = await tasksAPI.generateUploadUrl(
        audioFile.name,
        audioFile.type,
        "audio-instructions"
      );
      const { signedUrl, objectName } = signedUrlResponse.data;

      await uploadFileToGCS(signedUrl, audioFile, null, null);

      const gcsUrl = `gs://${
        process.env.REACT_APP_GCP_BUCKET_NAME || "ytmthelper-inspire26"
      }/${objectName}`;

      const audioInstruction = {
        videoTaskId: task.id,
        audioUrl: gcsUrl,
        audioFilename: audioFile.name,
        description: newAudioDescription || "",
        uploadedById: user.id,
      };

      await tasksAPI.addAudioInstruction(audioInstruction);
      toast.success("Audio instruction added successfully!");
      fetchTaskAndChannelDetails();

      setShowUploadAudio(false);
      setNewAudioDescription("");
      resetRecording();
    } catch (error) {
      console.error("Failed to upload audio:", error);
      toast.error("Failed to add audio instruction");
    }
  };

  const handlePlayAudio = async (audioId) => {
    if (playingAudio === audioId) {
      const audio = audioRefs.current[audioId];
      if (audio) audio.pause();
      setPlayingAudio(null);
    } else {
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) audio.pause();
      });

      try {
        const token = localStorage.getItem("token");
        const baseUrl =
          process.env.REACT_APP_API_URL || "http://localhost:8080/api";

        const response = await fetch(`${baseUrl}/files/audio/${audioId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);

        if (!audioRefs.current[audioId]) {
          audioRefs.current[audioId] = new Audio(audioUrl);
          audioRefs.current[audioId].addEventListener("ended", () => {
            setPlayingAudio(null);
            URL.revokeObjectURL(audioUrl);
          });
          audioRefs.current[audioId].addEventListener("error", (e) => {
            console.error("Audio error:", e);
            toast.error("Failed to load audio file");
            setPlayingAudio(null);
            URL.revokeObjectURL(audioUrl);
          });
        }

        await audioRefs.current[audioId].play();
        setPlayingAudio(audioId);
      } catch (error) {
        console.error("Failed to play audio:", error);
        toast.error("Failed to play audio");
      }
    }
  };

  const handleAudioDelete = async (audioId) => {
    try {
      await tasksAPI.deleteAudioInstruction(audioId);
      toast.success("Audio instruction deleted successfully");
      fetchTaskAndChannelDetails();
    } catch (error) {
      console.error("Failed to delete audio instruction:", error);
      toast.error("Failed to delete audio instruction");
    }
  };

  // Permission helpers
  const canUploadRevision = () => {
    return user.role === "ADMIN" || task?.assignedEditor?.id === user.id;
  };

  const canAddAudioInstruction = () => {
    return (
      user.role === "ADMIN" ||
      task?.createdBy?.id === user.id ||
      task?.assignedEditor?.id === user.id
    );
  };

  const canDeleteTask = () => {
    return user.role === "ADMIN";
  };

  const canEditTask = () => {
    return user.role === "ADMIN" || task?.createdBy?.id === user.id;
  };

  const handleScheduleUpload = async () => {
    if (!scheduleDateTime) {
      toast.error("Please select a date and time for scheduling.");
      return;
    }

    try {
      await tasksAPI.scheduleYouTubeUpload(id, {
        uploadTime: scheduleDateTime,
      });

      setTask((prev) => ({ ...prev, status: "SCHEDULED" }));
      toast.success("Video upload scheduled successfully");
      setShowScheduleModal(false);
    } catch (error) {
      console.error("Failed to schedule upload:", error);
      toast.error(
        error.response?.data?.message || "Failed to schedule upload."
      );
    }
  };

  // Memoized values for performance
  const isUploadInProgress = useMemo(() => {
    return isUploading || task?.status === "UPLOADING" || task?.status === "SCHEDULED";
  }, [isUploading, task?.status]);

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto p-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-200 rounded-xl h-64 lg:h-96"></div>
            <div className="bg-gray-200 rounded-xl h-48"></div>
          </div>
          <div className="space-y-6">
            <div className="bg-gray-200 rounded-xl h-64"></div>
            <div className="bg-gray-200 rounded-xl h-48"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!task) {
    return (
      <div className="text-center py-12 max-w-7xl mx-auto p-4">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Task not found</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn p-4 lg:p-6">
      {/* Task Header */}
      <TaskHeader task={task} user={user} onTaskUpdate={handleTaskUpdate} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Video and Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <VideoPlayer
            task={task}
            selectedRevision={selectedRevision}
            selectedRawVideo={selectedRawVideo}
            currentVideoUrl={currentVideoUrl}
            videoError={videoError}
            isVideoPlaying={isVideoPlaying}
            onVideoPlay={handleVideoPlay}
            onVideoPause={handleVideoPause}
            onVideoError={handleVideoError}
            onDownload={handleDownload}
            onRawVideoSelect={handleRawVideoSelect}
            onRevisionSelect={handleRevisionSelect}
          />

          {/* Approval Section */}
          <ApprovalSection
            task={task}
            user={user}
            onStatusUpdate={handleStatusUpdate}
          />

          {/* Multi-Video Upload Section for READY status */}
          {task.status === "READY" &&
            !isUploadInProgress &&
            revisions.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Youtube className="h-5 w-5 text-red-600" />
                  <span>YouTube Upload</span>
                </h3>

                {/* Selection Summary */}
                {selectedRevisionsForUpload.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800">
                        {selectedRevisionsForUpload.length} revision(s) selected
                        for upload
                      </span>
                      <button
                        onClick={() => setSelectedRevisionsForUpload([])}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="space-y-1">
                      {selectedRevisionsForUpload.map((revision) => (
                        <div
                          key={revision.id}
                          className="flex items-center justify-between text-xs text-blue-700"
                        >
                          <span>• Revision #{revision.revisionNumber}</span>
                          <div className="flex items-center space-x-2">
                            {revisionMetadata[revision.id] && Object.keys(revisionMetadata[revision.id]).length > 0 ? (
                              <span className="text-green-600">
                                ✓ Metadata ready
                              </span>
                            ) : (
                              <button
                                onClick={() => handleShowRevisionMetadataModal(revision)}
                                className="text-orange-600 hover:text-orange-800 underline"
                              >
                                + Add metadata
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleShowUploadSelection}
                    disabled={
                      selectedRevisionsForUpload.length === 0 ||
                      selectedRevisionsForUpload.some(
                        revision => !revisionMetadata[revision.id] || Object.keys(revisionMetadata[revision.id]).length === 0
                      )
                    }
                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Youtube className="h-4 w-4" />
                    <span>Upload to YouTube</span>
                  </button>
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <strong>💡 How it works:</strong> Select revisions from the sidebar, add metadata for each, then upload them to different channels simultaneously.
                </div>
              </div>
            )}

          {/* Upload in Progress or Scheduled Section */}
          {isUploadInProgress && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
              {task.status === "SCHEDULED" ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Upload Scheduled
                  </h3>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-6 w-6 text-indigo-400"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium text-indigo-800">
                          Scheduled for Upload
                        </h4>
                        <p className="text-sm text-indigo-700 mt-1">
                          Your video(s) are scheduled to be uploaded at the specified time. The system will automatically start the upload process.
                        </p>
                        {task.scheduledUploadTime && (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded inline-block">
                              Scheduled for: {new Date(task.scheduledUploadTime).toLocaleString()}
                            </div>
                            <div className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded inline-block ml-2">
                              Time remaining: <CountdownTimer targetTime={task.scheduledUploadTime} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Upload in Progress
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="animate-spin h-6 w-6 text-yellow-400"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium text-yellow-800">
                          YouTube Upload in Progress
                        </h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Your video(s) are being uploaded to YouTube. This process
                          may take several minutes depending on video size and
                          quality.
                        </p>
                        {currentUploadDuration && (
                          <div className="mt-2 text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded inline-block">
                            Upload started {currentUploadDuration} ago
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full animate-pulse"
                      style={{ width: "100%" }}
                    ></div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mobile Sidebar */}
          <div className="lg:hidden">
            <MobileCollapsibleSidebar
              task={task}
              user={user}
              revisions={revisions}
              audioInstructions={audioInstructions}
            >
              <TaskInfoSidebar
                task={task}
                user={user}
                revisions={revisions}
                selectedRawVideo={selectedRawVideo}
                onTaskUpdate={handleTaskUpdate}
                onShowEditModal={() => setShowEditModal(true)}
                onShowDeleteModal={() => setShowDeleteModal(true)}
                onRawVideoSelect={handleRawVideoSelect}
                canDeleteTask={canDeleteTask}
                canEditTask={canEditTask}
                isMobile={true}
              />
              <RevisionsList
                task={task}
                revisions={revisions}
                selectedRevision={selectedRevision}
                selectedRevisionsForUpload={selectedRevisionsForUpload}
                user={user}
                showUploadRevision={showUploadRevision}
                setShowUploadRevision={setShowUploadRevision}
                newRevisionFile={newRevisionFile}
                setNewRevisionFile={setNewRevisionFile}
                newRevisionNotes={newRevisionNotes}
                setNewRevisionNotes={setNewRevisionNotes}
                newRevisionType={newRevisionType}
                setNewRevisionType={setNewRevisionType}
                isVideoPlaying={isVideoPlaying}
                onRevisionSelect={handleRevisionSelect}
                onRevisionUpload={handleRevisionUpload}
                onRevisionDelete={handleRevisionDelete}
                onDownload={handleDownload}
                onToggleRevisionForUpload={handleToggleRevisionForUpload}
                onShowRevisionMetadataModal={handleShowRevisionMetadataModal}
                canUploadRevision={canUploadRevision}
                revisionMetadata={revisionMetadata}
                isMobile={true}
              />
              <AudioInstructions
                audioInstructions={audioInstructions}
                user={user}
                task={task}
                showUploadAudio={showUploadAudio}
                setShowUploadAudio={setShowUploadAudio}
                newAudioDescription={newAudioDescription}
                setNewAudioDescription={setNewAudioDescription}
                playingAudio={playingAudio}
                isRecording={isRecording}
                isPaused={isPaused}
                recordingTime={recordingTime}
                currentAudioBlob={currentAudioBlob}
                onAudioUpload={handleAudioUpload}
                onPlayAudio={handlePlayAudio}
                onAudioDelete={handleAudioDelete}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onTogglePauseResume={togglePauseResume}
                onResetRecording={resetRecording}
                canAddAudioInstruction={canAddAudioInstruction}
                isMobile={true}
              />
            </MobileCollapsibleSidebar>
          </div>

          {/* Comments Section */}
          <CommentsSection
            comments={comments}
            newComment={newComment}
            setNewComment={setNewComment}
            user={user}
            onCommentSubmit={handleCommentSubmit}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            editingCommentId={editingCommentId}
            editingCommentText={editingCommentText}
            setEditingCommentText={setEditingCommentText}
            deletingCommentId={deletingCommentId}
          />
        </div>

        {/* Right Column - Desktop Sidebar */}
        <div className="hidden lg:block space-y-6">
          {/* Task Information */}
          <TaskInfoSidebar
            task={task}
            user={user}
            revisions={revisions}
            selectedRawVideo={selectedRawVideo}
            onTaskUpdate={handleTaskUpdate}
            onShowEditModal={() => setShowEditModal(true)}
            onShowDeleteModal={() => setShowDeleteModal(true)}
            onRawVideoSelect={handleRawVideoSelect}
            canDeleteTask={canDeleteTask}
            canEditTask={canEditTask}
          />

          {/* Revisions List */}
          <RevisionsList
            task={task}
            revisions={revisions}
            selectedRevision={selectedRevision}
            selectedRevisionsForUpload={selectedRevisionsForUpload}
            user={user}
            showUploadRevision={showUploadRevision}
            setShowUploadRevision={setShowUploadRevision}
            newRevisionFile={newRevisionFile}
            setNewRevisionFile={setNewRevisionFile}
            newRevisionNotes={newRevisionNotes}
            setNewRevisionNotes={setNewRevisionNotes}
            newRevisionType={newRevisionType}
            setNewRevisionType={setNewRevisionType}
            isVideoPlaying={isVideoPlaying}
            onRevisionSelect={handleRevisionSelect}
            onRevisionUpload={handleRevisionUpload}
            onRevisionDelete={handleRevisionDelete}
            onDownload={handleDownload}
            onToggleRevisionForUpload={handleToggleRevisionForUpload}
            onShowRevisionMetadataModal={handleShowRevisionMetadataModal}
            canUploadRevision={canUploadRevision}
            revisionMetadata={revisionMetadata}
          />

          {/* Audio Instructions */}
          <AudioInstructions
            audioInstructions={audioInstructions}
            user={user}
            task={task}
            showUploadAudio={showUploadAudio}
            setShowUploadAudio={setShowUploadAudio}
            newAudioDescription={newAudioDescription}
            setNewAudioDescription={setNewAudioDescription}
            playingAudio={playingAudio}
            isRecording={isRecording}
            isPaused={isPaused}
            recordingTime={recordingTime}
            currentAudioBlob={currentAudioBlob}
            onAudioUpload={handleAudioUpload}
            onPlayAudio={handlePlayAudio}
            onAudioDelete={handleAudioDelete}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onTogglePauseResume={togglePauseResume}
            onResetRecording={resetRecording}
            canAddAudioInstruction={canAddAudioInstruction}
          />
        </div>
      </div>

      {/* Modals */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleTaskDelete}
        taskName={task?.title}
        isDeleting={isDeleting}
      />

      {task && (
        <EditTaskModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleTaskEdit}
          task={task}
        />
      )}

      {/* Single Revision Metadata Modal */}
      {selectedRevisionForMetadata && (
        <SingleRevisionMetadataModal
          isOpen={showSingleRevisionMetadataModal}
          onClose={() => {
            setShowSingleRevisionMetadataModal(false);
            setSelectedRevisionForMetadata(null);
          }}
          onSubmit={handleSingleRevisionMetadataSubmit}
          revision={selectedRevisionForMetadata}
          initialData={revisionMetadata[selectedRevisionForMetadata?.id]}
        />
      )}

      {/* ENHANCED Upload Selection Modal with Playlist Support */}
      {showUploadSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Select Channels & Playlists for Upload
              </h3>
              <button
                onClick={() => setShowUploadSelectionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {selectedRevisionsForUpload.map((revision) => (
                <div
                  key={revision.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800">
                      Revision #{revision.revisionNumber}
                    </h4>
                    {revisionMetadata[revision.id]?.title && (
                      <p className="text-sm text-gray-500 truncate">
                        Title: "{revisionMetadata[revision.id].title}"
                      </p>
                    )}
                  </div>
                  
                  {/* Channel Selection UI */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      YouTube Channel
                    </label>
                    {channels.length > 0 ? (
                      <div className="space-y-2 border border-gray-200 rounded-md p-2 max-h-52 overflow-y-auto">
                        {channels.map((channel) => (
                          <div
                            key={channel.id}
                            className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                              !channel.isConnected ? "bg-gray-100" : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                id={`channel-${revision.id}-${channel.id}`}
                                name={`channel-selection-${revision.id}`}
                                type="radio"
                                value={channel.id}
                                checked={uploadChannelSelections[revision.id] === String(channel.id)}
                                onChange={() => handleChannelSelection(revision.id, String(channel.id))}
                                disabled={!channel.isConnected}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                              />
                              <label
                                htmlFor={`channel-${revision.id}-${channel.id}`}
                                className={`ml-3 text-sm font-medium ${
                                  !channel.isConnected
                                    ? "text-gray-500 cursor-not-allowed"
                                    : "text-gray-900 cursor-pointer"
                                }`}
                              >
                                {channel.channelName}
                              </label>
                            </div>
                            {channel.isConnected ? (
                              <div className="flex items-center space-x-2">
                                <span className="flex items-center text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                  <Check className="h-3 w-3 mr-1" />
                                  Connected
                                </span>
                                {/* Playlist expansion toggle */}
                                {uploadChannelSelections[revision.id] === String(channel.id) && (
                                  <button
                                    onClick={() => toggleChannelExpansion(revision.id, channel.id)}
                                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                                    title="Show/Hide Playlists"
                                  >
                                    {expandedChannels[`${revision.id}-${channel.id}`] ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigate("/settings")}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                              >
                                Connect now
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 px-2 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">
                          No YouTube channels configured in the system.
                        </p>
                        {user.role === "ADMIN" && (
                          <button
                            onClick={() => navigate("/settings")}
                            className="mt-2 text-sm text-blue-600 hover:underline"
                          >
                            Go to Settings to add channels
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Playlist Selection UI - Show only if channel is selected and expanded */}
                  {uploadChannelSelections[revision.id] && 
                   expandedChannels[`${revision.id}-${uploadChannelSelections[revision.id]}`] && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Add to Playlists (Optional)
                        </label>
                        {loadingPlaylists[uploadChannelSelections[revision.id]] && (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        )}
                      </div>
                      
                      {(() => {
                        const channelId = uploadChannelSelections[revision.id];
                        const playlists = channelPlaylists[channelId] || [];
                        const isLoading = loadingPlaylists[channelId];
                        
                        if (isLoading) {
                          return (
                            <div className="text-center py-4 text-sm text-gray-500">
                              Loading playlists...
                            </div>
                          );
                        }
                        
                        if (playlists.length === 0) {
                          return (
                            <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-md">
                              No playlists found for this channel
                            </div>
                          );
                        }
                        
                        return (
                          <div className="space-y-2 border border-gray-200 rounded-md p-2 max-h-40 overflow-y-auto">
                            {playlists.map((playlist) => (
                              <div
                                key={playlist.id}
                                className="flex items-center p-2 hover:bg-gray-50 rounded-md"
                              >
                                <input
                                  id={`playlist-${revision.id}-${playlist.id}`}
                                  type="checkbox"
                                  checked={selectedPlaylists[revision.id]?.includes(playlist.id) || false}
                                  onChange={(e) => handlePlaylistSelection(
                                    revision.id, 
                                    playlist.id, 
                                    e.target.checked
                                  )}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label
                                  htmlFor={`playlist-${revision.id}-${playlist.id}`}
                                  className="ml-3 text-sm text-gray-900 cursor-pointer flex-1"
                                >
                                  {playlist.snippet?.title || playlist.id}
                                </label>
                                {playlist.snippet?.description && (
                                  <span className="text-xs text-gray-500 ml-2 truncate max-w-32">
                                    {playlist.snippet.description}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      
                      {/* Selected playlists summary */}
                      {selectedPlaylists[revision.id] && selectedPlaylists[revision.id].length > 0 && (
                        <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {selectedPlaylists[revision.id].length} playlist(s) selected
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowUploadSelectionModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMultiVideoUpload}
                disabled={selectedRevisionsForUpload.some(
                  (r) => !uploadChannelSelections[r.id]
                )}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Youtube className="h-4 w-4" />
                <span>Start Upload</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetails;