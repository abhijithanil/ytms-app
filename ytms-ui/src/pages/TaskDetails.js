import React, { useState, useEffect, useRef } from "react";
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
import VideoMetadataModal from "../components/VideoMetadataModal";
import EditTaskModal from "../components/EditTaskModal";

// Icons for loading state
import { AlertCircle } from "lucide-react";

const { isCancel, CancelToken } = axios;

const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core state
  const [task, setTask] = useState(null);
  const [metadata, setMetadata] = useState({});
  const [revisions, setRevisions] = useState([]);
  const [comments, setComments] = useState([]);
  const [audioInstructions, setAudioInstructions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Video state
  const [selectedRevision, setSelectedRevision] = useState(null);
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
  const [showVideoMetadataModal, setShowVideoMetadataModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRefs = useRef({});

  // Effects
  useEffect(() => {
    fetchTaskDetails();
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [id]);

  useEffect(() => {
    if (task && revisions) {
      if (revisions.length > 0) {
        handleRevisionSelect(revisions[0]);
      } else if (task.rawVideoUrl) {
        handleRawVideoSelect();
      }
    }
  }, [task, revisions]);

  // API Functions
  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const [
        taskResponse,
        revisionsResponse,
        commentsResponse,
        audioResponse,
        metadataResponse,
      ] = await Promise.all([
        tasksAPI.getTaskById(id),
        revisionsAPI.getRevisionsByTask(id),
        commentsAPI.getTaskComments(id),
        tasksAPI.getAudioInstructions(id),
        metadataAPI.getMetadata(id).catch((error) => {
          console.warn("Metadata fetch failed but was handled:", error);
          return { data: null };
        }),
      ]);

      setTask(taskResponse.data);
      setRevisions(revisionsResponse.data);
      setComments(commentsResponse.data);
      setAudioInstructions(audioResponse.data);
      setMetadata(metadataResponse.data);
    } catch (error) {
      console.error("Failed to fetch task details:", error);
      toast.error("Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  const fetchAndSetVideoUrl = async (url) => {
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
  const handleTaskUpdate = (updatedTask) => {
    setTask(updatedTask);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (
      (newStatus === "SCHEDULED" || newStatus === "UPLOADED") &&
      task.status === "READY" &&
      !task.videoMetadata
    ) {
      setPendingStatus(newStatus);
      setShowVideoMetadataModal(true);
      return;
    }

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

  // Video handlers
  const handleRevisionSelect = async (revision) => {
    if (!task) return;
    setSelectedRevision(revision);
    fetchAndSetVideoUrl(`/revisions/${revision.id}/task/${task.id}/video-url`);
  };

  const handleRawVideoSelect = async () => {
    if (!task) return;
    setSelectedRevision(null);
    fetchAndSetVideoUrl(`/tasks/${task.id}/video-url`);
  };

  const handleVideoPlay = () => setIsVideoPlaying(true);
  const handleVideoPause = () => setIsVideoPlaying(false);
  const handleVideoError = (e) => {
    console.error("Video error:", e);
    setVideoError("Failed to load video. Please check your connection and try again.");
    setIsVideoPlaying(false);
  };

  // Download handler
  const handleDownload = async (endpoint) => {
    try {
      const token = localStorage.getItem("token");
      const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

      const signedUrlResponse = await fetch(`${baseUrl}${endpoint}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!signedUrlResponse.ok) {
        throw new Error(`HTTP ${signedUrlResponse.status}: ${signedUrlResponse.statusText}`);
      }

      const { signedUrl, fileName } = await signedUrlResponse.json();
      if (!signedUrl) {
        throw new Error("No download URL received from server");
      }

      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok) {
        throw new Error(`Download failed: ${fileResponse.status} ${fileResponse.statusText}`);
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
      fetchTaskDetails();
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
      await commentsAPI.updateComment(commentId, { content: editingCommentText });
      setEditingCommentId(null);
      setEditingCommentText("");
      fetchTaskDetails();
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
      fetchTaskDetails();
      toast.success("Comment deleted successfully");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Upload file to GCS helper
  const uploadFileToGCS = async (signedUrl, file, onProgress, cancelTokenSource) => {
    const init = await fetch(signedUrl, {
      method: "POST",
      headers: {
        "x-goog-resumable": "start",
        "Content-Type": file.type || "application/octet-stream",
      },
    });

    if (!init.ok) {
      const text = await init.text();
      throw new Error(`Failed to start resumable upload: ${init.status} ${init.statusText}\n${text}`);
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
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}\n${xhr.responseText}`));
        }
      };
      
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload cancelled"));
      xhr.ontimeout = () => reject(new Error("Upload timed out"));
      xhr.timeout = 30 * 60 * 1000;
      xhr.open("PUT", sessionUri);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
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
                <path className="text-gray-200" stroke="currentColor" strokeWidth="2" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-primary-600" stroke="currentColor" strokeWidth="2" strokeDasharray={`${progress}, 100`} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute top-0 left-0 h-full w-full flex items-center justify-center">
                <span className="text-xs font-bold text-primary-600">{progress}%</span>
              </div>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">Uploading file...</p>
            <p className="mt-1 text-sm text-gray-500 truncate" title={fileName}>{fileName}</p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-200">
        <button onClick={onCancel} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary-600 hover:text-primary-500">Cancel</button>
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

      const gcsUrl = `gs://${process.env.REACT_APP_GCP_BUCKET_NAME || "ytmthelper-inspire26"}/${objectName}`;
      revisionUploadFormData.append("editedVideoUrl", gcsUrl);
      revisionUploadFormData.append("editedVideoFilename", newRevisionFile.name);

      await revisionsAPI.createRevision(revisionUploadFormData);
      toast.success("Revision created successfully!");
      fetchTaskDetails();

      setShowUploadRevision(false);
      setNewRevisionNotes("");
      setNewRevisionFile(null);
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
      fetchTaskDetails();
    } catch (error) {
      console.error("Failed to delete revision:", error);
      toast.error("Failed to delete revision");
    }
  };

  // Audio recording handlers
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
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
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
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
      const audioFile = new File([currentAudioBlob], `instruction-${Date.now()}.webm`, {
        type: currentAudioBlob.type,
      });

      const signedUrlResponse = await tasksAPI.generateUploadUrl(
        audioFile.name,
        audioFile.type,
        "audio-instructions"
      );
      const { signedUrl, objectName } = signedUrlResponse.data;

      await uploadFileToGCS(signedUrl, audioFile, null, null);

      const gcsUrl = `gs://${process.env.REACT_APP_GCP_BUCKET_NAME || "ytmthelper-inspire26"}/${objectName}`;

      const audioInstruction = {
        videoTaskId: task.id,
        audioUrl: gcsUrl,
        audioFilename: audioFile.name,
        description: newAudioDescription || "",
        uploadedById: user.id,
      };

      await tasksAPI.addAudioInstruction(audioInstruction);
      toast.success("Audio instruction added successfully!");
      fetchTaskDetails();

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
        const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

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
      fetchTaskDetails();
    } catch (error) {
      console.error("Failed to delete audio instruction:", error);
      toast.error("Failed to delete audio instruction");
    }
  };

  // Video metadata handler
  const handleVideoMetadataSubmit = async (metadataData) => {
    try {
      await metadataAPI.createMetadata(id, metadataData);
      fetchTaskDetails();
    } catch (error) {
      console.error("Failed to save video metadata:", error);
      toast.error("Failed to save video metadata");
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
      <TaskHeader
        task={task}
        user={user}
        onTaskUpdate={handleTaskUpdate}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Video and Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <VideoPlayer
            task={task}
            selectedRevision={selectedRevision}
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

          {/* Mobile Sidebar - Shows before comments on mobile */}
          <div className="lg:hidden">
            <MobileCollapsibleSidebar
              task={task}
              user={user}
              metadata={metadata}
              revisions={revisions}
              audioInstructions={audioInstructions}
            >
              <TaskInfoSidebar
                task={task}
                user={user}
                metadata={metadata}
                revisions={revisions}
                onTaskUpdate={handleTaskUpdate}
                onShowEditModal={() => setShowEditModal(true)}
                onShowDeleteModal={() => setShowDeleteModal(true)}
                onShowVideoMetadataModal={() => setShowVideoMetadataModal(true)}
                canDeleteTask={canDeleteTask}
                canEditTask={canEditTask}
                isMobile={true}
              />
              <RevisionsList
                task={task}
                revisions={revisions}
                selectedRevision={selectedRevision}
                user={user}
                showUploadRevision={showUploadRevision}
                setShowUploadRevision={setShowUploadRevision}
                newRevisionFile={newRevisionFile}
                setNewRevisionFile={setNewRevisionFile}
                newRevisionNotes={newRevisionNotes}
                setNewRevisionNotes={setNewRevisionNotes}
                isVideoPlaying={isVideoPlaying}
                onRevisionSelect={handleRevisionSelect}
                onRawVideoSelect={handleRawVideoSelect}
                onRevisionUpload={handleRevisionUpload}
                onRevisionDelete={handleRevisionDelete}
                onDownload={handleDownload}
                canUploadRevision={canUploadRevision}
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
            metadata={metadata}
            revisions={revisions}
            onTaskUpdate={handleTaskUpdate}
            onShowEditModal={() => setShowEditModal(true)}
            onShowDeleteModal={() => setShowDeleteModal(true)}
            onShowVideoMetadataModal={() => setShowVideoMetadataModal(true)}
            canDeleteTask={canDeleteTask}
            canEditTask={canEditTask}
          />

          {/* Revisions List */}
          <RevisionsList
            task={task}
            revisions={revisions}
            selectedRevision={selectedRevision}
            user={user}
            showUploadRevision={showUploadRevision}
            setShowUploadRevision={setShowUploadRevision}
            newRevisionFile={newRevisionFile}
            setNewRevisionFile={setNewRevisionFile}
            newRevisionNotes={newRevisionNotes}
            setNewRevisionNotes={setNewRevisionNotes}
            isVideoPlaying={isVideoPlaying}
            onRevisionSelect={handleRevisionSelect}
            onRawVideoSelect={handleRawVideoSelect}
            onRevisionUpload={handleRevisionUpload}
            onRevisionDelete={handleRevisionDelete}
            onDownload={handleDownload}
            canUploadRevision={canUploadRevision}
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
        taskName={task.title}
        isDeleting={isDeleting}
      />

      <EditTaskModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleTaskEdit}
        task={task}
      />

      <VideoMetadataModal
        isOpen={showVideoMetadataModal}
        onClose={() => {
          setShowVideoMetadataModal(false);
          setPendingStatus(null);
        }}
        onSubmit={handleVideoMetadataSubmit}
        initialData={metadata}
        isRequired={!!pendingStatus}
        pendingStatus={pendingStatus}
      />
    </div>
  );
};

export default TaskDetails;