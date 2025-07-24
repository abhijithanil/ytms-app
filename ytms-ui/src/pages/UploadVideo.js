import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  ArrowLeft,
  ChevronDown,
  X,
  File,
  Video,
  Tag,
  Mic,
  Users,
  Shield,
  Calendar,
  Play,
  Pause,
  Square,
  Trash2,
  Check,
  RotateCcw,
  Plus,
  FileVideo,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tasksAPI, usersAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import axios from "axios";

const { isCancel, CancelToken } = axios;

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

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
          <p className="text-sm font-medium text-gray-900">Uploading file...</p>
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

const UploadVideo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    assignedEditorId: "",
    deadline: "",
    privacyLevel: "ALL",
    tags: [],
  });

  const [uploadedFiles, setUploadedFiles] = useState([]); // Changed to array for multiple files
  const [audioInstructions, setAudioInstructions] = useState([]);
  const [editors, setEditors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentTag, setCurrentTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadToastId, setUploadToastId] = useState(null);
  const [cancelTokenSource, setCancelTokenSource] = useState(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentAudioBlob, setCurrentAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    fetchEditors();
    fetchAllUsers();

    return () => {
      if (cancelTokenSource) {
        cancelTokenSource.cancel("Upload cancelled by component unmount.");
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [cancelTokenSource]);

  const fetchEditors = async () => {
    try {
      const response = await usersAPI.getEditors();
      setEditors(response.data);
    } catch (error) {
      console.error("Failed to fetch editors:", error);
      toast.error("Failed to load editors");
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await usersAPI.getAllUsers();
      setAllUsers(response.data.filter((u) => u.role !== "ADMIN"));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    }
  };

  const onVideoDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.file.size > 10000 * 1024 * 1024) {
        toast.error("Video file must be less than 10GB");
      } else {
        toast.error("Invalid video file format");
      }
      return;
    }

    // Handle multiple files
    const newFiles = acceptedFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      type: file.size > 50 * 1024 * 1024 ? 'main' : 'short', // Auto-detect based on size (50MB threshold)
      customType: 'main' // User can change this
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    toast.success(`${acceptedFiles.length} video file(s) selected!`);
  }, []);

  const {
    getRootProps: getVideoRootProps,
    getInputProps: getVideoInputProps,
    isDragActive: isVideoDragActive,
  } = useDropzone({
    onDrop: onVideoDrop,
    accept: { "video/*": [".mp4", ".mov"] },
    maxSize: 10000 * 1024 * 1024,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()],
      }));
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const removeUploadedFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    toast.info("Video file removed");
  };

  const updateFileType = (fileId, newType) => {
    setUploadedFiles(prev => 
      prev.map(f => f.id === fileId ? { ...f, customType: newType } : f)
    );
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleCancelUpload = () => {
    if (cancelTokenSource) {
      cancelTokenSource.cancel("Upload cancelled by user.");
      if (uploadToastId) toast.dismiss(uploadToastId);
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a task title");
      return false;
    }
    if (uploadedFiles.length === 0) {
      toast.error("Please select at least one video file");
      return false;
    }
    if (formData.privacyLevel === "SELECTED" && selectedUsers.length === 0) {
      toast.error("Please select at least one user for private tasks");
      return false;
    }
    return true;
  };

  // --- Audio Recording Handlers ---

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

  const saveInstruction = () => {
    if (currentAudioBlob) {
      const newInstruction = {
        blob: currentAudioBlob,
        name: `instruction-${Date.now()}.webm`,
        url: URL.createObjectURL(currentAudioBlob),
      };
      setAudioInstructions((prev) => [...prev, newInstruction]);
      setCurrentAudioBlob(null);
      setRecordingTime(0);
      toast.success("Audio instruction added.");
    }
  };

  const deleteInstruction = (indexToDelete) => {
    setAudioInstructions((prev) =>
      prev.filter((_, index) => index !== indexToDelete)
    );
    toast.info("Audio instruction removed.");
  };

  const resetRecording = () => {
    setCurrentAudioBlob(null);
    setRecordingTime(0);
    if (isRecording || isPaused) {
      stopRecording();
    }
  };

  // --- End Audio Recording Handlers ---

  const uploadFileToGCS = async (
    signedUrl,
    file,
    onProgress,
    cancelTokenSource
  ) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("POST", signedUrl, true);
      xhr.setRequestHeader("X-Goog-Resumable", "start");
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.setRequestHeader("Content-Length", "0");

      xhr.onload = () => {
        if (xhr.status === 201) {
          const uploadUrl = xhr.getResponseHeader("Location");

          if (!uploadUrl) {
            reject(new Error("No upload URL received"));
            return;
          }

          const uploadXhr = new XMLHttpRequest();
          uploadXhr.open("PUT", uploadUrl, true);
          uploadXhr.setRequestHeader("Content-Type", file.type);

          uploadXhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
              const progress = Math.round((e.loaded / e.total) * 100);
              onProgress(progress);
            }
          };

          uploadXhr.onload = () => {
            if (uploadXhr.status >= 200 && uploadXhr.status < 300) {
              resolve({ status: uploadXhr.status });
            } else {
              reject(
                new Error(
                  `Upload failed: ${uploadXhr.status} ${uploadXhr.statusText}`
                )
              );
            }
          };

          uploadXhr.onerror = () =>
            reject(new Error("Network error during upload."));
          uploadXhr.onabort = () => reject(new Error("Upload cancelled."));

          if (cancelTokenSource && cancelTokenSource.token) {
            cancelTokenSource.token.promise.then(() => {
              uploadXhr.abort();
            });
          }

          uploadXhr.send(file);
        } else {
          reject(
            new Error(
              `Failed to initialize resumable upload: ${xhr.status} ${xhr.statusText}`
            )
          );
        }
      };

      xhr.onerror = () =>
        reject(new Error("Network error during upload initialization."));
      xhr.onabort = () => reject(new Error("Upload initialization cancelled."));

      if (cancelTokenSource && cancelTokenSource.token) {
        cancelTokenSource.token.promise.then(() => {
          xhr.abort();
        });
      }

      xhr.send();
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const source = CancelToken.source();
    setCancelTokenSource(source);

    let currentToastId;

    try {
      // 1. Upload Video Files
      const videoUrls = [];
      
      for (let i = 0; i < uploadedFiles.length; i++) {
        const fileData = uploadedFiles[i];
        const file = fileData.file;
        
        currentToastId = toast.custom(
          (t) => (
            <UploadProgressToast
              progress={0}
              fileName={`${file.name} (${i + 1}/${uploadedFiles.length})`}
              onCancel={() => {
                toast.dismiss(t.id);
                handleCancelUpload();
              }}
            />
          ),
          { duration: Infinity }
        );
        setUploadToastId(currentToastId);

        const signedUrlResponse = await tasksAPI.generateUploadUrl(
          file.name,
          file.type,
          "raw-videos"
        );
        const { signedUrl, objectName } = signedUrlResponse.data;

        const handleProgress = (progress) => {
          setUploadProgress(progress);
          toast.custom(
            (t) => (
              <UploadProgressToast
                progress={progress}
                fileName={`${file.name} (${i + 1}/${uploadedFiles.length})`}
                onCancel={() => {
                  toast.dismiss(t.id);
                  handleCancelUpload();
                }}
              />
            ),
            { id: currentToastId }
          );
        };

        await uploadFileToGCS(signedUrl, file, handleProgress, source);
        
        const videoGcsUrl = `gs://${
          process.env.REACT_APP_GCP_BUCKET_NAME || "ytmthelper-inspire26"
        }/${objectName}`;
        
        videoUrls.push({
          url: videoGcsUrl,
          filename: file.name,
          type: fileData.customType,
          size: file.size
        });
        
        toast.dismiss(currentToastId);
      }

      // 2. Upload Audio Instructions
      let audioInstructionUrls = [];
      if (audioInstructions.length > 0) {
        const audioToastId = toast.loading(
          `Uploading ${audioInstructions.length} audio instruction(s)...`
        );
        try {
          audioInstructionUrls = await Promise.all(
            audioInstructions.map(async (instruction) => {
              const audioSignedUrlResponse = await tasksAPI.generateUploadUrl(
                instruction.name,
                instruction.blob.type,
                "audio-instructions"
              );
              const { signedUrl: audioSignedUrl, objectName: audioObjectName } =
                audioSignedUrlResponse.data;
              await uploadFileToGCS(
                audioSignedUrl,
                instruction.blob,
                null,
                source
              );
              return `gs://${
                process.env.REACT_APP_GCP_BUCKET_NAME || "ytmthelper-inspire26"
              }/${audioObjectName}`;
            })
          );
          toast.success("Audio instructions uploaded!", { id: audioToastId });
        } catch (uploadError) {
          toast.error("Failed to upload audio files.", { id: audioToastId });
          throw uploadError;
        }
      }

      var tags = [];
      if (formData.tags.length > 0) {
        formData.tags.forEach((tag) => {
          tags.push(tag);
        });
      }

      let commentList = [];
      if (audioInstructionUrls.length > 0) {
        const comment = `${user.username || "User"} added ${
          audioInstructionUrls.length
        } audio instruction(s).`;

        commentList = [comment];
      }

      const taskData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        privacyLevel: formData.privacyLevel,
        deadline: formData.deadline || null,
        assignedEditorId: formData.assignedEditorId || null,
        rawVideos: videoUrls, // Changed to array
        tags: tags,
        userIds: formData.privacyLevel === "SELECTED" ? selectedUsers : [],
        comments: commentList,
        audioInstructionUrls: audioInstructionUrls,
      };

      const response = await tasksAPI.createTask(taskData);

      if (formData.privacyLevel === "SELECTED" && selectedUsers.length > 0) {
        await tasksAPI.setTaskPrivacy(response.data.id, {
          privacyLevel: "SELECTED",
          userIds: selectedUsers,
        });
      }

      toast.success("Task created successfully!");
      navigate("/tasks");
    } catch (error) {
      if (isCancel(error) || error.message === "Upload cancelled.") {
        toast.error("Upload cancelled.");
      } else {
        console.error("Task creation failed:", error);
        if (uploadToastId) toast.dismiss(uploadToastId);
        toast.error("Failed to create task. Please try again.");
      }
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
      setCancelTokenSource(null);
      if (uploadToastId) toast.dismiss(uploadToastId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
          <p className="text-gray-600">
            Upload raw videos and assign to an editor
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task Details Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Video className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Task Details
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form fields... */}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                maxLength={100}
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="relative">
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-10"
                >
                  <option value="LOW">🟢 Low</option>
                  <option value="MEDIUM">🟡 Medium</option>
                  <option value="HIGH">🔴 High</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Describe the video editing requirements..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                maxLength={1000}
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Editor
              </label>
              <div className="relative">
                <select
                  name="assignedEditorId"
                  value={formData.assignedEditorId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-10"
                >
                  <option value="">Select editor (optional)</option>
                  {editors.map((editor) => (
                    <option key={editor.id} value={editor.id}>
                      {editor.username} ({editor.email})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

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
                      checked={formData.privacyLevel === "ALL"}
                      onChange={handleInputChange}
                      className="mr-3 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Public</span>
                      <p className="text-sm text-gray-500">
                        All team members can view
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="privacyLevel"
                      value="SELECTED"
                      checked={formData.privacyLevel === "SELECTED"}
                      onChange={handleInputChange}
                      className="mr-3 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Private</span>
                      <p className="text-sm text-gray-500">
                        Only selected users can view
                      </p>
                    </div>
                  </label>
                </div>

                {formData.privacyLevel === "SELECTED" && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Select Users ({selectedUsers.length} selected)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {allUsers.map((u) => (
                        <label
                          key={u.id}
                          className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(u.id)}
                            onChange={() => handleUserSelection(u.id)}
                            className="text-primary-600 focus:ring-primary-500 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900">
                              {u.username}
                            </span>
                            <p className="text-xs text-gray-500 truncate">
                              {u.email}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    maxLength={30}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!currentTag.trim()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-primary-600"
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

        {/* Upload Files Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Upload className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Upload & Record Files
            </h2>
          </div>
          <div className="space-y-6">
            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Raw Video Files *
              </label>
              
              {/* Upload Zone */}
              <div
                {...getVideoRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4 ${
                  isVideoDragActive
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <input {...getVideoInputProps()} />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {isVideoDragActive
                    ? "Drop video files here"
                    : "Upload Raw Videos"}
                </h3>
                <p className="text-gray-500 mb-2">
                  Drag & drop or click to browse (multiple files supported)
                </p>
                <p className="text-xs text-gray-400">
                  Supports: MP4, MOV (max 10GB per file)
                </p>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Uploaded Files ({uploadedFiles.length})
                  </h4>
                  {uploadedFiles.map((fileData) => (
                    <div key={fileData.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <FileVideo className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {fileData.file.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(fileData.file.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUploadedFile(fileData.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                      
                      {/* Video Type Selection */}
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-700">Type:</span>
                        <div className="flex space-x-4">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={`video-type-${fileData.id}`}
                              value="main"
                              checked={fileData.customType === 'main'}
                              onChange={() => updateFileType(fileData.id, 'main')}
                              className="mr-2 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">Main Video</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={`video-type-${fileData.id}`}
                              value="short"
                              checked={fileData.customType === 'short'}
                              onChange={() => updateFileType(fileData.id, 'short')}
                              className="mr-2 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">YouTube Short</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audio Recorder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                <Mic className="inline h-4 w-4 mr-1" />
                Audio Instructions (Optional)
              </label>
              <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                {!isRecording && !currentAudioBlob && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    <Mic className="h-5 w-5" />
                    <span>Record New Instruction</span>
                  </button>
                )}

                {(isRecording || currentAudioBlob) && (
                  <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-500 animate-pulse">
                          <Mic className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-mono text-lg text-gray-700">
                          {formatTime(recordingTime)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isRecording && (
                          <>
                            <button
                              type="button"
                              onClick={togglePauseResume}
                              className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100"
                            >
                              {isPaused ? (
                                <Play className="h-5 w-5 text-gray-700" />
                              ) : (
                                <Pause className="h-5 w-5 text-gray-700" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="p-2 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600"
                            >
                              <Square className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {currentAudioBlob && (
                      <div className="space-y-3">
                        <audio
                          src={URL.createObjectURL(currentAudioBlob)}
                          controls
                          className="w-full"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={resetRecording}
                            className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>Record Again</span>
                          </button>
                          <button
                            type="button"
                            onClick={saveInstruction}
                            className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
                          >
                            <Check className="h-4 w-4" />
                            <span>Save Instruction</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {audioInstructions.length > 0 && (
                  <div className="space-y-3 pt-4">
                    <h4 className="text-sm font-medium text-gray-600">
                      Saved Instructions
                    </h4>
                    {audioInstructions.map((instruction, index) => (
                      <div
                        key={instruction.url}
                        className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <Mic className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700 truncate block">
                              {`Instruction ${index + 1}`}
                            </span>
                            <audio
                              src={instruction.url}
                              controls
                              className="w-full max-w-xs h-8 mt-1"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteInstruction(index)}
                          className="ml-3 p-2 hover:bg-red-100 rounded-full"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !formData.title.trim() || uploadedFiles.length === 0}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating Task..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadVideo;