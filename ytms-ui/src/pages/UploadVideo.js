// Simplified Part 1: Fixed Imports and Utility Functions (without storageAPI)

import React, { useState, useCallback, useEffect } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tasksAPI, usersAPI } from "../services/api"; // Removed storageAPI
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import axios from "axios";

// Fixed: Extract methods to avoid instanceof issues
const { isCancel, CancelToken } = axios;

// Safe utility functions to replace instanceof checks
const safeInstanceofCheck = (obj, constructor) => {
  try {
    return obj instanceof constructor;
  } catch (e) {
    return false;
  }
};

const isValidFile = (file) => {
  return (
    file &&
    typeof file === "object" &&
    typeof file.name === "string" &&
    typeof file.size === "number" &&
    typeof file.type === "string" &&
    typeof file.lastModified === "number"
  );
};

const hasFileProperties = (file) => {
  return !!(file && file.name && file.size && file.type);
};

const hasStreamMethod = (file) => {
  return typeof file?.stream === "function";
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Progress Toast Component
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

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    assignedEditorId: "",
    deadline: "",
    privacyLevel: "ALL",
    tags: [],
  });

  // File upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [audioFiles, setAudioFiles] = useState([]);

  // User data state
  const [editors, setEditors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // UI state
  const [currentTag, setCurrentTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadToastId, setUploadToastId] = useState(null);
  const [cancelTokenSource, setCancelTokenSource] = useState(null);

  // Effect for data fetching and cleanup
  useEffect(() => {
    fetchEditors();
    fetchAllUsers();

    // Cleanup function to cancel upload if component unmounts
    return () => {
      if (cancelTokenSource) {
        cancelTokenSource.cancel("Upload cancelled by component unmount.");
      }
    };
  }, [cancelTokenSource]);

  // Fetch editors from API
  const fetchEditors = async () => {
    try {
      const response = await usersAPI.getEditors();
      setEditors(response.data);
    } catch (error) {
      console.error("Failed to fetch editors:", error);
      toast.error("Failed to load editors");
    }
  };

  // Fetch all users from API
  const fetchAllUsers = async () => {
    try {
      const response = await usersAPI.getAllUsers();
      setAllUsers(response.data.filter((u) => u.role !== "ADMIN"));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    }
  };
  // Part 3: Fixed Dropzone Handlers and File Management

  // Fixed: Video file drop handler without instanceof issues
  const onVideoDrop = useCallback((acceptedFiles, rejectedFiles) => {
    console.log("=== VIDEO DROP EVENT ===");
    console.log("Accepted files:", acceptedFiles);
    console.log("Rejected files:", rejectedFiles);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      console.error("File rejected:", {
        file: rejection.file,
        errors: rejection.errors,
      });

      if (rejection.file.size > 10000 * 1024 * 1024) {
        toast.error("Video file must be less than 10GB");
      } else {
        toast.error("Invalid video file format");
      }
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      console.log("=== FILE SELECTED ===");
      console.log("File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        lastModifiedDate: file.lastModifiedDate,
      });

      // Fixed: Use safe validation instead of instanceof
      console.log("File validation:", {
        isValidFile: isValidFile(file),
        hasFileProperties: hasFileProperties(file),
        hasStreamMethod: hasStreamMethod(file),
        constructorName: file?.constructor?.name || "unknown",
      });

      setUploadedFile(file);
      toast.success("Video file selected!");
    }
  }, []);

  // Configure video dropzone
  const {
    getRootProps: getVideoRootProps,
    getInputProps: getVideoInputProps,
    isDragActive: isVideoDragActive,
  } = useDropzone({
    onDrop: onVideoDrop,
    accept: { "video/*": [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".webm"] },
    maxFiles: 1,
    maxSize: 10000 * 1024 * 1024, // 10GB
  });

  // Audio file drop handler
  const onAudioDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      console.error("Audio files rejected:", rejectedFiles);
      toast.error("Invalid audio file format or size.");
      return;
    }

    console.log(
      "Audio files selected:",
      acceptedFiles.map((f) => ({ name: f.name, size: f.size, type: f.type }))
    );
    setAudioFiles((prev) => [...prev, ...acceptedFiles]);
    toast.success(`${acceptedFiles.length} audio file(s) added!`);
  }, []);

  // Configure audio dropzone
  const {
    getRootProps: getAudioRootProps,
    getInputProps: getAudioInputProps,
    isDragActive: isAudioDragActive,
  } = useDropzone({
    onDrop: onAudioDrop,
    accept: { "audio/*": [".mp3", ".wav", ".m4a", ".aac", ".ogg"] },
    maxSize: 100 * 1024 * 1024, // 100MB per audio file
  });

  // Form input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Tag management functions
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

  // File removal functions
  const removeUploadedFile = () => {
    setUploadedFile(null);
    toast.info("Video file removed");
  };

  const removeAudioFile = (index) => {
    setAudioFiles((prev) => prev.filter((_, i) => i !== index));
    toast.info("Audio file removed");
  };

  // User selection for privacy
  const handleUserSelection = (userId) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };
  // Part 4: Fixed Upload Logic and Validation

  // Cancel upload handler
  const handleCancelUpload = () => {
    if (cancelTokenSource) {
      cancelTokenSource.cancel("Upload cancelled by user.");
      if (uploadToastId) toast.dismiss(uploadToastId);
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  // Form validation
  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a task title");
      return false;
    }
    if (formData.privacyLevel === "SELECTED" && selectedUsers.length === 0) {
      toast.error("Please select at least one user for private tasks");
      return false;
    }
    return true;
  };

  // ─── NEW uploadFileToGCS ────────────────────────────────────────────────
/**
 * @param {string}  signedUrl  – V4 signed URL returned by backend
 * @param {File}    file       – the selected <input type="file"> File
 * @param {function(number):void} onProgress – (0‑100) progress callback
 * @param {object}  cancelTokenSource – axios CancelToken.source()
 */
const uploadFileToGCS = async (
  signedUrl,
  file,
  onProgress,
  cancelTokenSource
) => {
  // STEP 1: start resumable session (POST with x‑goog‑resumable:start)
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

  // STEP 2: PUT the actual file with XMLHttpRequest so we get onprogress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Wire axios cancel token to xhr.abort()
    if (cancelTokenSource && cancelTokenSource.token) {
      cancelTokenSource.token.promise.then((cancel) => {
        xhr.abort();
        reject(cancel); // keep axios‑style cancel flow
      });
    }

    // Progress handler
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    // Success / failure handlers
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve({ status: xhr.status });
      } else {
        reject(
          new Error(`Upload failed: ${xhr.status} ${xhr.statusText}\n${xhr.responseText}`)
        );
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));

    xhr.timeout = 30 * 60 * 1000; // 30 min
    xhr.open("PUT", sessionUri);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
};

  // Fixed: Enhanced file upload function without instanceof issues
  // const uploadFileToGCS = async (signedUrl, file) => {
  //   debugger;
  //   console.log("=== STARTING GCS UPLOAD ===");
  //   console.log("Signed URL (first 100 chars):", signedUrl.substring(0, 100));
  //   console.log("File object:", {
  //     name: file.name,
  //     size: file.size,
  //     type: file.type,
  //     constructorName: file?.constructor?.name || "unknown",
  //     isValidFile: isValidFile(file),
  //     hasFileProperties: hasFileProperties(file),
  //   });

  //   // Test if we can read the file
  //   try {
  //     const arrayBuffer = await file.arrayBuffer();
  //     console.log("File arrayBuffer size:", arrayBuffer.byteLength);

  //     if (arrayBuffer.byteLength === 0) {
  //       throw new Error("File appears to be empty");
  //     }

  //     if (arrayBuffer.byteLength !== file.size) {
  //       console.warn("Warning: ArrayBuffer size differs from file.size", {
  //         arrayBufferSize: arrayBuffer.byteLength,
  //         fileSize: file.size,
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error reading file as arrayBuffer:", error);
  //     throw new Error("Cannot read file data: " + error.message);
  //   }

  //   try {
  //     console.log("Making POST request to GCS...");

  //     debugger
  //     const response = await fetch(signedUrl, {
  //       method: "POST",
  //       headers: {
  //         "x-goog-resumable": "start",
  //         "Content-Type": file.type,
  //       },
  //     });

  //     console.log("=== UPLOAD RESPONSE ===");
  //     console.log("Status:", response.status);
  //     console.log("Status Text:", response.statusText);
  //     console.log("Headers:", Object.fromEntries(response.headers.entries()));

  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       console.error("Upload failed with response:", errorText);
  //       throw new Error(
  //         `Upload failed: ${response.status} ${response.statusText} - ${errorText}`
  //       );
  //     }

  //     console.log("Upload completed successfully");
  //     return response;
  //   } catch (error) {
  //     console.error("=== UPLOAD FAILED ===");
  //     console.error("Error:", error);
  //     console.error("Error message:", error.message);
  //     throw error;
  //   }
  // };
  // Part 5: Fixed Main Submit Handler

  // Simplified Submit Handler - Part 5 without verification

  // Fixed: Main form submission handler (without verification)
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("=== FORM SUBMISSION STARTED ===");
    console.log("Form data:", formData);
    console.log("Uploaded file:", uploadedFile);

    if (!validateForm() || !uploadedFile) {
      if (!uploadedFile) toast.error("Please select a video file.");
      return;
    }

    setIsSubmitting(true);

    // Fixed: Use CancelToken properly
    const source = CancelToken
      ? CancelToken.source()
      : { token: null, cancel: () => {} };
    setCancelTokenSource(source);

    let currentToastId;

    try {
      console.log("=== STEP 1: REQUESTING SIGNED URL ===");
      console.log("File name:", uploadedFile.name);
      console.log("Folder: raw-videos");

      const signedUrlResponse = await tasksAPI.generateUploadUrl(
        uploadedFile.name,
        uploadedFile.type,
        "raw-videos"
      );
      console.log("Signed URL response:", signedUrlResponse.data);

      const { signedUrl, objectName } = signedUrlResponse.data;

      console.log("=== RECEIVED SIGNED URL ===");
      console.log("Object name:", objectName);
      console.log("Signed URL (first 100 chars):", signedUrl.substring(0, 100));

      // Show progress toast
      currentToastId = toast.custom(
        (t) => (
          <UploadProgressToast
            progress={0}
            fileName={uploadedFile.name}
            onCancel={() => {
              toast.dismiss(t.id);
              handleCancelUpload();
            }}
          />
        ),
        { duration: Infinity }
      );
      setUploadToastId(currentToastId);

      console.log("=== STEP 2: UPLOADING TO GCS ===");
      await uploadFileToGCS(signedUrl, uploadedFile);

      console.log("=== UPLOAD COMPLETED ===");
      toast.dismiss(currentToastId);

      // Verification removed - proceeding directly to task creation
      console.log("=== STEP 3: CREATING TASK ===");
      const taskFormData = new FormData();
      taskFormData.append("title", formData.title);
      taskFormData.append("description", formData.description);
      taskFormData.append("priority", formData.priority);
      taskFormData.append("privacyLevel", formData.privacyLevel);
      if (formData.deadline) taskFormData.append("deadline", formData.deadline);
      if (formData.assignedEditorId)
        taskFormData.append("assignedEditorId", formData.assignedEditorId);
      if (formData.tags.length > 0)
        taskFormData.append("tags", JSON.stringify(formData.tags));

      const gcsUrl = `gs://${
        process.env.REACT_APP_GCP_BUCKET_NAME || "ytmthelper-inspire26"
      }/${objectName}`;
      taskFormData.append("rawVideoUrl", gcsUrl);
      taskFormData.append("rawVideoFilename", uploadedFile.name);

      audioFiles.forEach((file) => {
        taskFormData.append("audioFiles", file);
      });

      console.log("Task data being sent:", {
        title: formData.title,
        gcsUrl,
        audioFilesCount: audioFiles.length,
      });

      const response = await tasksAPI.createTask(taskFormData);
      console.log("Task created:", response.data);

      if (formData.privacyLevel === "SELECTED" && selectedUsers.length > 0) {
        await tasksAPI.setTaskPrivacy(response.data.id, {
          privacyLevel: "SELECTED",
          userIds: selectedUsers,
        });
      }

      toast.success("Task created successfully!");
      navigate("/tasks");
    } catch (error) {
      console.error("=== SUBMISSION FAILED ===");
      console.error("Error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

      // Fixed: Use safe isCancel check
      if (isCancel && isCancel(error)) {
        console.log("Request canceled:", error.message);
        toast.error("Upload cancelled.");
      } else if (error && error.message && error.message.includes("cancel")) {
        console.log("Request canceled (detected by message):", error.message);
        toast.error("Upload cancelled.");
      } else {
        if (currentToastId) toast.dismiss(currentToastId);

        // More specific error messages
        if (error.response?.status === 413) {
          toast.error("File too large. Please select a smaller video file.");
        } else if (error.response?.status === 415) {
          toast.error(
            "Unsupported file format. Please select a valid video file."
          );
        } else if (error.message && error.message.includes("Network Error")) {
          toast.error(
            "Network error. Please check your connection and try again."
          );
        } else if (error.response?.status >= 500) {
          toast.error("Server error. Please try again later.");
        } else if (error.message && error.message.includes("small")) {
          toast.error("Upload failed - file appears to be corrupted or empty.");
        } else {
          toast.error("Failed to create task. Please try again.");
        }
      }
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
      setCancelTokenSource(null);
      setUploadToastId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Debug Info Panel */}
      {uploadedFile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">Debug Info:</h3>
          <pre className="text-xs text-yellow-700 overflow-auto">
            {JSON.stringify(
              {
                fileName: uploadedFile.name,
                fileSize: uploadedFile.size,
                fileType: uploadedFile.type,
                lastModified: uploadedFile.lastModified,
                isValidFile: isValidFile(uploadedFile),
                hasFileProperties: hasFileProperties(uploadedFile),
              },
              null,
              2
            )}
          </pre>
        </div>
      )}

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
            Upload raw video and assign to an editor
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Video className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Task Details
            </h2>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                maxLength={100}
              />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-10"
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
                placeholder="Describe the video editing requirements..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                maxLength={1000}
              />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

                {/* User Selection for Private Tasks */}
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

        {/* Upload Files Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Upload Files
              </h2>
            </div>
          </div>
          <div className="space-y-6">
            {/* Raw Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Raw Video File *
              </label>
              {!uploadedFile ? (
                <div
                  {...getVideoRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isVideoDragActive
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input {...getVideoInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {isVideoDragActive
                      ? "Drop video file here"
                      : "Upload Raw Video"}
                  </h3>
                  <p className="text-gray-500 mb-2">
                    Drag & drop or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports: MP4, MOV, AVI, MKV, WMV, WebM (max 10GB)
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <File className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {uploadedFile.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(uploadedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeUploadedFile}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
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
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isAudioDragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <input {...getAudioInputProps()} />
                <Mic className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-2">
                  {isAudioDragActive
                    ? "Drop audio files here"
                    : "Add voice instructions"}
                </p>
                <p className="text-xs text-gray-400">
                  Supports: MP3, WAV, M4A, AAC, OGG (max 100MB each)
                </p>
              </div>

              {/* Audio Files List */}
              {audioFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {audioFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-200"
                    >
                      <div className="flex items-center space-x-3">
                        <Mic className="h-4 w-4 text-blue-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            {file.name}
                          </span>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAudioFile(index)}
                        className="p-1 hover:bg-blue-200 rounded"
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

        {/* Submit Buttons */}
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
            disabled={isSubmitting || !formData.title.trim() || !uploadedFile}
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
