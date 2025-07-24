// Complete API Services - api.js
// Enhanced with Multiple Raw Video Support

import axios from "axios";

// Ensure no double slashes in API URL construction
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

// Fixed: Extract methods to avoid instanceof issues
const { isCancel } = axios;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `Making ${config.method?.toUpperCase()} request to ${config.url}`,
      {
        headers: config.headers,
        data: config.data instanceof FormData ? "FormData" : config.data,
        timeout: config.timeout,
      }
    );

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(
      `Response from ${response.config.url}:`,
      response.status,
      response.data
    );
    return response;
  },
  (error) => {
    console.error("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      timeout: error.config?.timeout,
    });

    if (error.code === "ECONNABORTED" && error.message.includes("timeout")) {
      console.error("Request timeout");
      error.message = "Request timeout. Please try again.";
    }

    if (error.response?.status === 401) {
      console.log("401 Unauthorized - removing token and redirecting to login");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await api.post("/auth/login", credentials);
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },
  register: async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },
  getCurrentUser: async () => {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    } catch (error) {
      console.error("Get current user error:", error);
      throw error;
    }
  },
  refreshToken: async () => {
    try {
      const response = await api.post("/auth/refresh");
      return response.data;
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  },
  getInviteDetails: async (token) => {
    try {
      const body = { token: token };
      const response = await api.post("/auth/validate-token", body);
      return response.data;
    } catch (error) {
      console.error("Get invite details error:", error);
      throw error;
    }
  },
  acceptInvite: async (token, userDetails) => {
    try {
      const response = await api.post(`/auth/accept-invite/${token}`, userDetails);
      return response.data;
    } catch (error) {
      console.error("Accept invite error:", error);
      throw error;
    }
  },
  declineInvite: async (token) => {
    try {
      const response = await api.post(`/auth/decline-invite/${token}`);
      return response.data;
    } catch (error) {
      console.error("Decline invite error:", error);
      throw error;
    }
  },
};

// Team API
export const teamAPI = {
  getAllUsers: async () => {
    try {
      const response = await api.get("/team/users");
      return response.data;
    } catch (error) {
      console.error("Get all team users error:", error);
      throw error;
    }
  },
  inviteUser: async (inviteRequest) => {
    try {
      const response = await api.post("/team/invite", inviteRequest);
      return response.data;
    } catch (error) {
      console.error("Invite user error:", error);
      throw error;
    }
  },
};

// Users API
export const usersAPI = {
  getAllUsers: async () => {
    try {
      const response = await api.get("/users");
      return response;
    } catch (error) {
      console.error("Get all users error:", error);
      throw error;
    }
  },
  getUserById: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response;
    } catch (error) {
      console.error(`Get user ${id} error:`, error);
      throw error;
    }
  },
  createUser: async (userData) => {
    try {
      const response = await api.post("/users", userData);
      return response;
    } catch (error) {
      console.error("Create user error:", error);
      throw error;
    }
  },
  updateUser: async (id, userData) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response;
    } catch (error) {
      console.error(`Update user ${id} error:`, error);
      throw error;
    }
  },
  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response;
    } catch (error) {
      console.error(`Delete user ${id} error:`, error);
      throw error;
    }
  },
  getEditors: async () => {
    try {
      const response = await api.get("/users/editors");
      return response;
    } catch (error) {
      console.error("Get editors error:", error);
      throw error;
    }
  },
  getAdmins: async () => {
    try {
      const response = await api.get("/users/admins");
      return response.data;
    } catch (error) {
      console.error("Get admins error:", error);
      throw error;
    }
  },
  updateUserProfile: async (id, profileData) => {
    try {
      const response = await api.put(`/users/${id}/profile`, profileData);
      return response;
    } catch (error) {
      console.error(`Update user ${id} profile error:`, error);
      throw error;
    }
  },
  changePassword: async (id, passwordData) => {
    try {
      const response = await api.put(`/users/${id}/password`, passwordData);
      return response;
    } catch (error) {
      console.error(`Change password for user ${id} error:`, error);
      throw error;
    }
  },
};

// Raw Video API - ENHANCED
export const rawVideoAPI = {
  // Get all raw videos for a task
  getRawVideosByTask: (taskId) => {
    console.log(`Fetching raw videos for task ${taskId}`);
    return api.get(`/tasks/${taskId}/raw-videos`);
  },
  
  // Add new raw video to existing task
  addRawVideo: (taskId, rawVideoData) => {
    console.log(`Adding raw video to task ${taskId}:`, rawVideoData);
    return api.post(`/tasks/${taskId}/raw-videos`, rawVideoData);
  },
  
  // Update raw video details
  updateRawVideo: (rawVideoId, updateData) => {
    console.log(`Updating raw video ${rawVideoId}:`, updateData);
    return api.put(`/raw-videos/${rawVideoId}`, updateData);
  },
  
  // Delete specific raw video
  deleteRawVideo: (rawVideoId) => {
    console.log(`Deleting raw video ${rawVideoId}`);
    return api.delete(`/raw-videos/${rawVideoId}`);
  },
  
  // Get signed URL for specific raw video
  getRawVideoUrl: (rawVideoId) => {
    console.log(`Getting video URL for raw video ${rawVideoId}`);
    return api.get(`/raw-videos/${rawVideoId}/video-url`);
  },
  
  // Reorder raw videos for a task
  reorderRawVideos: (taskId, rawVideoIds) => {
    console.log(`Reordering raw videos for task ${taskId}:`, rawVideoIds);
    return api.post(`/tasks/${taskId}/raw-videos/reorder`, { rawVideoIds });
  },
  
  // NEW: Get raw videos with comprehensive info
  getRawVideosInfo: (taskId) => {
    console.log(`Fetching comprehensive raw video info for task ${taskId}`);
    return api.get(`/tasks/${taskId}/videos-info`);
  },
};

// Tasks API - Enhanced with Multiple Video Support
export const tasksAPI = {
  getAllTasks: () => {
    console.log("Fetching all tasks...");
    return api.get("/tasks");
  },
  
  getTaskById: (id) => {
    console.log(`Fetching task ${id}...`);
    return api.get(`/tasks/${id}`);
  },
  
  // NEW: Get task with all video information
  getTaskByIdWithAllVideos: async (id) => {
    console.log(`Fetching task ${id} with all video information...`);
    try {
      const [taskResponse, rawVideosResponse, revisionsResponse] = await Promise.all([
        api.get(`/tasks/${id}`),
        rawVideoAPI.getRawVideosByTask(id).catch(() => ({ data: [] })),
        revisionsAPI.getRevisionsByTask(id).catch(() => ({ data: [] }))
      ]);
      
      return {
        ...taskResponse,
        data: {
          ...taskResponse.data,
          rawVideos: rawVideosResponse.data,
          revisions: revisionsResponse.data
        }
      };
    } catch (error) {
      console.error(`Error fetching task ${id} with all videos:`, error);
      throw error;
    }
  },
  
  // Legacy method - kept for backward compatibility
  getTaskByIdWithRawVideos: async (id) => {
    console.log(`Fetching task ${id} with raw videos...`);
    try {
      const [taskResponse, rawVideosResponse] = await Promise.all([
        api.get(`/tasks/${id}`),
        rawVideoAPI.getRawVideosByTask(id).catch(() => ({ data: [] }))
      ]);
      return {
        ...taskResponse,
        data: {
          ...taskResponse.data,
          rawVideos: rawVideosResponse.data
        }
      };
    } catch (error) {
      console.error(`Error fetching task ${id} with raw videos:`, error);
      throw error;
    }
  },
  
  // NEW: Get raw videos for task (convenience method)
  getRawVideos: (taskId) => rawVideoAPI.getRawVideosByTask(taskId),
  
  // NEW: Get video count summary
  getVideoCountSummary: (taskId) => {
    console.log(`Fetching video count summary for task ${taskId}`);
    return api.get(`/tasks/${taskId}/video-count`);
  },
  
  createTask: (taskData) => {
    console.log("Creating task with data:", taskData);
    debugger

    const uploadApi = axios.create({
      ...api.defaults,
      timeout: 1 * 60 * 1000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    uploadApi.interceptors.request.use(
      api.interceptors.request.handlers[0].fulfilled
    );
    uploadApi.interceptors.response.use(
      api.interceptors.response.handlers[0].fulfilled,
      api.interceptors.response.handlers[0].rejected
    );

    return uploadApi.post("/tasks", taskData, {
      headers: { "Content-Type": "application/json" },
    });
  },
  
  generateUploadUrl: (filename, type, folder) => {
    console.log(`Generating upload URL for ${filename} in folder ${folder}`);
    const params = new URLSearchParams({
      filename: filename,
      type: type,
      folder: folder,
    });
    return api.post(`/tasks/generate-upload-url?${params.toString()}`);
  },
  
  updateTask: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  
  assignEditor: (taskId, editorId) => {
    console.log(`Assigning editor ${editorId} to task ${taskId}`);
    return api.put(`/tasks/${taskId}/assign`, { editorId });
  },
  
  updateStatus: (taskId, status) => {
    console.log(`Updating task ${taskId} status to ${status}`);
    return api.put(`/tasks/${taskId}/status`, { status });
  },
  
  getTasksByEditor: (editorId) => api.get(`/tasks/editor/${editorId}`),
  getTasksByStatus: (status) => api.get(`/tasks/status/${status}`),
  
  setTaskPrivacy: (taskId, privacyData) => {
    console.log(`Setting privacy for task ${taskId}:`, privacyData);
    return api.post(`/tasks/${taskId}/privacy`, privacyData);
  },
  
  scheduleYouTubeUpload: (taskId, uploadTime) => {
    console.log(`Scheduling YouTube upload for task ${taskId} at ${uploadTime}`);
    return api.post(`/tasks/${taskId}/schedule-upload`, { uploadTime });
  },
  
  // Single video upload (existing)
  doYoutubeUpload: (uploadRequest) => {
    const uploadApi = axios.create({
      ...api.defaults,
      timeout: 0,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    uploadApi.interceptors.request.use(
      api.interceptors.request.handlers[0].fulfilled
    );
    uploadApi.interceptors.response.use(
      api.interceptors.response.handlers[0].fulfilled,
      api.interceptors.response.handlers[0].rejected
    );
    return api.post(`/tasks/upload-to-youtube`, uploadRequest);
  },
  
  // NEW: Multiple video upload to YouTube
  uploadMultipleToYouTube: (taskId, multipleUploadRequest) => {
    console.log(`Uploading multiple videos for task ${taskId}:`, multipleUploadRequest);
    const uploadApi = axios.create({
      ...api.defaults,
      timeout: 0,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    uploadApi.interceptors.request.use(
      api.interceptors.request.handlers[0].fulfilled
    );
    uploadApi.interceptors.response.use(
      api.interceptors.response.handlers[0].fulfilled,
      api.interceptors.response.handlers[0].rejected
    );
    return uploadApi.post(`/tasks/${taskId}/upload-multiple-to-youtube`, multipleUploadRequest);
  },
  
  // NEW: Check upload requirements for videos
  checkUploadRequirements: (taskId, videoIdentifiers) => {
    console.log(`Checking upload requirements for task ${taskId}:`, videoIdentifiers);
    return api.post(`/tasks/${taskId}/check-upload-requirements`, { videoIdentifiers });
  },
  
  // NEW: Get available channels for task
  getAvailableChannels: (taskId) => {
    console.log(`Getting available channels for task ${taskId}`);
    return api.get(`/tasks/${taskId}/available-channels`);
  },
  
  addAudioInstruction: (audioInstruction) => {
    console.log(`Adding audio instruction to task ${audioInstruction.videoTaskId}`);
    return api.post(`/tasks/${audioInstruction.videoTaskId}/audio-instructions`, audioInstruction);
  },
  
  getAudioInstructions: (taskId) => {
    console.log(`Fetching audio instructions for task ${taskId}`);
    return api.get(`/tasks/${taskId}/audio-instructions`);
  },
  
  deleteAudioInstruction: (audioInstructionId) => {
    console.log(`Deleting audio instruction ${audioInstructionId}`);
    return api.delete(`/tasks/audio-instructions/${audioInstructionId}/delete`);
  },
};

// Revisions API
export const revisionsAPI = {
  createRevision: (formData) => {
    console.log("Creating revision with form data");
    const uploadApi = axios.create({
      ...api.defaults,
      timeout: 15 * 60 * 1000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    uploadApi.interceptors.request.use(
      api.interceptors.request.handlers[0].fulfilled
    );
    uploadApi.interceptors.response.use(
      api.interceptors.response.handlers[0].fulfilled,
      api.interceptors.response.handlers[0].rejected
    );
    return uploadApi.post("/revisions", formData, {
      headers: { "Content-Type": "application/json" },
    });
  },
  
  getRevisionsByTask: (taskId) => {
    console.log(`Fetching revisions for task ${taskId}`);
    return api.get(`/revisions/task/${taskId}`);
  },
  
  getLatestRevision: (taskId) => api.get(`/revisions/task/${taskId}/latest`),
  getRevisionById: (id) => api.get(`/revisions/${id}`),
  
  deleteRevision: (id) => {
    console.log(`Deleting revision ${id}`);
    return api.delete(`/revisions/${id}`);
  },
  
  // NEW: Get revision video URL
  getRevisionVideoUrl: (revisionId, taskId) => {
    console.log(`Getting video URL for revision ${revisionId} in task ${taskId}`);
    return api.get(`/revisions/${revisionId}/task/${taskId}/video-url`);
  },
};

// Comments API
export const commentsAPI = {
  addTaskComment: (taskId, commentData) => {
    console.log(`Adding comment to task ${taskId}:`, commentData);
    return api.post(`/comments/task/${taskId}`, commentData);
  },
  
  addRevisionComment: (revisionId, commentData) => {
    console.log(`Adding comment to revision ${revisionId}:`, commentData);
    return api.post(`/comments/revision/${revisionId}`, commentData);
  },
  
  getTaskComments: (taskId) => {
    console.log(`Fetching comments for task ${taskId}`);
    return api.get(`/comments/task/${taskId}`);
  },
  
  getRevisionComments: (revisionId) => {
    console.log(`Fetching comments for revision ${revisionId}`);
    return api.get(`/comments/revision/${revisionId}`);
  },
  
  updateComment: (id, commentData) => {
    console.log(`Updating comment ${id}:`, commentData);
    return api.put(`/comments/${id}`, commentData);
  },
  
  deleteComment: (id) => {
    console.log(`Deleting comment ${id}`);
    return api.delete(`/comments/${id}`);
  },
};

// Metadata API - Enhanced for Multiple Videos
export const metadataAPI = {
  // Task-level metadata (legacy)
  createMetadata: (taskId, metadataData) => {
    console.log(`Creating metadata for task ${taskId}`);
    return api.post(`/metadata/${taskId}`, metadataData, {
      headers: { "Content-Type": "application/json" },
    });
  },
  
  getMetadata: (taskId) => {
    console.log(`Fetching metadata for task ${taskId}`);
    return api.get(`/metadata/task/${taskId}`);
  },
  
  // NEW: Video-specific metadata
  createRevisionMetadata: (revisionId, metadataData) => {
    console.log(`Creating metadata for revision ${revisionId}`);
    return api.post(`/metadata/revision/${revisionId}`, metadataData, {
      headers: { "Content-Type": "application/json" },
    });
  },
  
  createRawVideoMetadata: (rawVideoId, metadataData) => {
    console.log(`Creating metadata for raw video ${rawVideoId}`);
    return api.post(`/metadata/raw-video/${rawVideoId}`, metadataData, {
      headers: { "Content-Type": "application/json" },
    });
  },
  
  // Get metadata by video identifier
  getVideoMetadata: (videoIdentifier) => {
    console.log(`Fetching metadata for video ${videoIdentifier}`);
    return api.get(`/metadata/video/${videoIdentifier}`);
  },
  
  // Check if metadata exists
  hasMetadata: (videoIdentifier) => {
    console.log(`Checking metadata existence for video ${videoIdentifier}`);
    return api.get(`/metadata/video/${videoIdentifier}/exists`);
  },
  
  // Get metadata for multiple videos
  getMultipleVideoMetadata: (videoIdentifiers) => {
    console.log(`Fetching metadata for multiple videos:`, videoIdentifiers);
    return api.post('/metadata/videos/batch', { videoIdentifiers });
  },
  
  // Update video-specific metadata
  updateVideoMetadata: (videoIdentifier, metadataData) => {
    console.log(`Updating metadata for video ${videoIdentifier}`);
    return api.put(`/metadata/video/${videoIdentifier}`, metadataData);
  },
  
  // Delete video-specific metadata
  deleteVideoMetadata: (videoIdentifier) => {
    console.log(`Deleting metadata for video ${videoIdentifier}`);
    return api.delete(`/metadata/video/${videoIdentifier}`);
  },
};

// File API - Enhanced for Multiple Videos
export const fileAPI = {
  // Legacy raw video download
  downloadRawVideo: (taskId) => {
    console.log(`Downloading raw video for task ${taskId}`);
    return api.get(`/files/video/${taskId}`, {
      responseType: "blob",
      timeout: 15 * 60 * 1000,
    });
  },
  
  // NEW: Download specific raw video
  downloadSpecificRawVideo: (rawVideoId) => {
    console.log(`Downloading specific raw video ${rawVideoId}`);
    return api.get(`/files/download/raw-video/${rawVideoId}`);
  },
  
  // Download revision video
  downloadRevisionVideo: (revisionId) => {
    console.log(`Downloading revision video ${revisionId}`);
    return api.get(`/files/download/revision/${revisionId}`);
  },
  
  downloadAudio: (audioId) => {
    console.log(`Downloading audio ${audioId}`);
    return api.get(`/files/audio/${audioId}`, {
      responseType: "blob",
      timeout: 5 * 60 * 1000,
    });
  },
  
  // Streaming URLs for video player
  getVideoUrl: (taskId) => {
    const token = localStorage.getItem("token");
    return `${API_BASE_URL}/files/video/${taskId}?Authorization=Bearer ${encodeURIComponent(token)}`;
  },
  
  // NEW: Get specific raw video streaming URL
  getSpecificRawVideoUrl: (rawVideoId) => {
    const token = localStorage.getItem("token");
    return `${API_BASE_URL}/files/raw-video/${rawVideoId}?Authorization=Bearer ${encodeURIComponent(token)}`;
  },
  
  getRevisionUrl: (revisionId) => {
    const token = localStorage.getItem("token");
    return `${API_BASE_URL}/files/revision/${revisionId}?Authorization=Bearer ${encodeURIComponent(token)}`;
  },
  
  getAudioUrl: (audioId) => {
    const token = localStorage.getItem("token");
    return `${API_BASE_URL}/files/audio/${audioId}?Authorization=Bearer ${encodeURIComponent(token)}`;
  },
  
  // NEW: Get video streaming URL by type and ID
  getVideoStreamingUrl: (videoType, videoId, taskId = null) => {
    switch (videoType) {
      case 'raw':
        return fileAPI.getSpecificRawVideoUrl(videoId);
      case 'revision':
        return fileAPI.getRevisionUrl(videoId);
      case 'legacy_raw':
        return fileAPI.getVideoUrl(taskId || videoId);
      default:
        throw new Error(`Unknown video type: ${videoType}`);
    }
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => {
    console.log("Fetching dashboard stats...");
    return api.get("/dashboard/stats");
  },
  getRecentTasks: () => {
    console.log("Fetching recent tasks...");
    return api.get("/dashboard/recent-tasks");
  },
  getUploadingTasks: () => {
    console.log("Fetching currently uploading tasks...");
    return api.get("/dashboard/uploading-tasks");
  },
};

// Storage API
export const storageAPI = {
  generateSignedUrl: (filename, folder, contentType) => {
    console.log(`Generating signed URL for ${filename} in ${folder} with type ${contentType}`);
    const params = new URLSearchParams({
      filename: filename,
      type: contentType,
      folder: folder,
    });
    return api.post(`/tasks/generate-upload-url?${params.toString()}`);
  },
  verifyUpload: (objectName) => {
    console.log(`Verifying upload for object ${objectName}`);
    return api.post("/storage/verify-upload", { objectName });
  },
  deleteFile: (objectName) => {
    console.log(`Deleting file ${objectName}`);
    return api.delete("/storage/delete", { data: { objectName } });
  },
};

// YouTube Channel API
export const youtubeChannelAPI = {
  getAllChannels: () => {
    console.log("Fetching all YouTube channels...");
    return api.get("/youtube-channels");
  },
  getChannelById: (id) => {
    console.log(`Fetching YouTube channel ${id}...`);
    return api.get(`/youtube-channels/${id}`);
  },
  createChannel: (channelData) => {
    console.log("Creating YouTube channel:", channelData);
    return api.post("/youtube-channels", channelData);
  },
  updateChannel: (id, channelData) => {
    console.log(`Updating YouTube channel ${id}:`, channelData);
    return api.put(`/youtube-channels/${id}`, channelData);
  },
  deleteChannel: (id) => {
    console.log(`Deleting YouTube channel ${id}`);
    return api.delete(`/youtube-channels/${id}`);
  },
  manageChannelAccess: (id, accessData) => {
    console.log(`Managing access for YouTube channel ${id}:`, accessData);
    return api.post(`/youtube-channels/${id}/access`, accessData);
  },
  searchChannels: (query) => {
    console.log(`Searching YouTube channels with query: ${query}`);
    const params = query ? `?q=${encodeURIComponent(query)}` : "";
    return api.get(`/youtube-channels/search${params}`);
  },
  getMyChannels: () => {
    console.log("Fetching user's YouTube channels...");
    return api.get("/youtube-channels/my-channels");
  },
  getChannelStats: () => {
    console.log("Fetching YouTube channel stats...");
    return api.get("/youtube-channels/stats");
  },
};

// YouTube OAuth API
export const youtubeOAuthAPI = {
  startConnect: (channelName) => {
    return api.get("/youtube/oauth/connect", {
      params: { channelName },
      timeout: 180000,
    });
  },
  getConnectedAccounts: () => {
    return api.get("/youtube/oauth/accounts");
  },
  disconnectAccount: (email) => {
    return api.delete(`/youtube/oauth/accounts/${encodeURIComponent(email)}`);
  },
  handleCallback: (code, state) => {
    return api.get("/youtube/oauth/callback", {
      params: { code, state },
    });
  },
};

// NEW: Video Management Utilities
export const videoUtils = {
  // Generate video identifier for metadata
  generateVideoIdentifier: (type, id, taskId = null) => {
    switch (type) {
      case 'revision':
        return `revision-${id}`;
      case 'raw':
        return `raw-${id}`;
      case 'legacy_raw':
      case 'task':
        return `task-${taskId || id}`;
      default:
        throw new Error(`Invalid video type: ${type}`);
    }
  },
  
  // Parse video identifier
  parseVideoIdentifier: (identifier) => {
    const parts = identifier.split('-');
    if (parts.length !== 2) {
      throw new Error(`Invalid video identifier format: ${identifier}`);
    }
    
    const [type, id] = parts;
    return {
      type: type === 'task' ? 'legacy_raw' : type,
      id: type === 'task' ? null : parseInt(id, 10),
      taskId: type === 'task' ? parseInt(id, 10) : null
    };
  },
  
  // Get video display name
  getVideoDisplayName: (video, task, rawVideos = []) => {
    switch (video.type) {
      case 'revision':
        return `Revision #${video.revisionNumber || 'Unknown'}`;
      case 'raw':
        const rawVideoIndex = rawVideos.findIndex(rv => rv.id === video.id);
        const baseIndex = task?.rawVideoUrl ? 2 : 1;
        const description = rawVideos.find(rv => rv.id === video.id)?.description;
        return `Raw Video #${baseIndex + rawVideoIndex}${description ? ` - ${description}` : ''}`;
      case 'legacy_raw':
        return 'Raw Video #1 (Original)';
      default:
        return 'Unknown Video';
    }
  },
  
  // Check if video can be uploaded to YouTube
  canUploadToYouTube: (video) => {
    return ['raw', 'legacy_raw', 'revision'].includes(video.type);
  },
  
  // Get video streaming URL helper
  getVideoStreamingUrl: (video, task) => {
    switch (video.type) {
      case 'raw':
        return fileAPI.getSpecificRawVideoUrl(video.id);
      case 'revision':
        return fileAPI.getRevisionUrl(video.id);
      case 'legacy_raw':
        return fileAPI.getVideoUrl(task?.id || video.taskId);
      default:
        throw new Error(`Cannot stream video type: ${video.type}`);
    }
  },
  
  // Sort videos by priority (latest revision > latest raw > legacy raw)
  sortVideosByPriority: (allVideos) => {
    return allVideos.sort((a, b) => {
      // Type priority: revision > raw > legacy_raw
      const typePriority = { revision: 3, raw: 2, legacy_raw: 1 };
      const priorityDiff = typePriority[b.type] - typePriority[a.type];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Within same type, sort by creation date (newest first)
      const dateA = new Date(a.createdAt || a.uploadedAt || 0);
      const dateB = new Date(b.createdAt || b.uploadedAt || 0);
      return dateB - dateA;
    });
  },
  
  // Get all videos for a task in organized structure
  organizeTaskVideos: (task, rawVideos = [], revisions = []) => {
    const organized = {
      rawVideos: [],
      revisions: revisions.sort((a, b) => b.revisionNumber - a.revisionNumber),
      totalCount: 0,
      hasLegacyRaw: !!(task?.rawVideoUrl)
    };
    
    // Add legacy raw video if exists
    if (task?.rawVideoUrl) {
      organized.rawVideos.push({
        type: 'legacy_raw',
        id: null,
        taskId: task.id,
        filename: task.rawVideoFilename || 'video.mp4',
        description: 'Original upload',
        videoOrder: 0,
        createdAt: task.createdAt,
        isLegacy: true
      });
    }
    
    // Add new raw videos
    const sortedRawVideos = rawVideos.sort((a, b) => (a.videoOrder || 0) - (b.videoOrder || 0));
    organized.rawVideos.push(...sortedRawVideos.map(rv => ({
      ...rv,
      type: 'raw',
      isLegacy: false
    })));
    
    organized.totalCount = organized.rawVideos.length + organized.revisions.length;
    
    return organized;
  }
};

// Utility functions
export const fileUtils = {
  validateFileType: (file, allowedTypes) => {
    const fileType = file.type.toLowerCase();
    return allowedTypes.some((type) => {
      if (type.includes("*")) {
        const baseType = type.split("/")[0];
        return fileType.startsWith(baseType + "/");
      }
      return fileType === type;
    });
  },
  
  validateFileSize: (file, maxSizeInBytes) => {
    return file.size <= maxSizeInBytes;
  },
  
  formatFileSize: (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },
  
  getFileExtension: (fileName) => {
    return fileName.split(".").pop().toLowerCase();
  },
  
  generateUniqueFileName: (originalName) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = fileUtils.getFileExtension(originalName);
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf("."));
    return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
  },
};

// Raw Video utility functions - ENHANCED
export const rawVideoUtils = {
  validateRawVideoData: (rawVideoData) => {
    const errors = [];
    if (!rawVideoData.videoUrl || rawVideoData.videoUrl.trim().length === 0) {
      errors.push("Video URL is required");
    }
    if (!rawVideoData.filename || rawVideoData.filename.trim().length === 0) {
      errors.push("Filename is required");
    }
    if (rawVideoData.fileSize && rawVideoData.fileSize <= 0) {
      errors.push("File size must be greater than 0");
    }
    if (rawVideoData.duration && rawVideoData.duration <= 0) {
      errors.push("Duration must be greater than 0");
    }
    if (rawVideoData.description && rawVideoData.description.length > 500) {
      errors.push("Description must not exceed 500 characters");
    }
    return { isValid: errors.length === 0, errors: errors };
  },
  
  formatDuration: (seconds) => {
    if (!seconds || seconds <= 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  },
  
  formatDurationHuman: (seconds) => {
    if (!seconds || seconds <= 0) return "0 seconds";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
    return parts.join(" ");
  },
  
  // NEW: Get primary video (first in order or legacy)
  getPrimaryVideo: (rawVideos, hasLegacyRaw = false) => {
    if (hasLegacyRaw) return { type: 'legacy_raw', isPrimary: true };
    if (!rawVideos || rawVideos.length === 0) return null;
    
    const sorted = rawVideos.sort((a, b) => (a.videoOrder || 0) - (b.videoOrder || 0));
    return { ...sorted[0], type: 'raw', isPrimary: true };
  },
  
  // NEW: Sort raw videos by order
  sortByUploadOrder: (rawVideos) => {
    if (!rawVideos) return [];
    return [...rawVideos].sort((a, b) => {
      const orderA = a.videoOrder || 0;
      const orderB = b.videoOrder || 0;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  },
  
  validateVideoFile: (file, maxSizeInBytes = 10000 * 1024 * 1024) => {
    const errors = [];
    if (!file.type.startsWith('video/')) {
      errors.push('File must be a video');
    }
    if (file.size > maxSizeInBytes) {
      errors.push(`File size must be less than ${fileUtils.formatFileSize(maxSizeInBytes)}`);
    }
    const supportedFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!supportedFormats.includes(extension)) {
      errors.push(`Unsupported format. Supported: ${supportedFormats.join(', ')}`);
    }
    return { isValid: errors.length === 0, errors: errors };
  },
  
  // NEW: Validate multiple video files
  validateMultipleVideoFiles: (files, maxSizeInBytes = 10000 * 1024 * 1024) => {
    const results = [];
    let totalSize = 0;
    
    files.forEach((file, index) => {
      const validation = rawVideoUtils.validateVideoFile(file, maxSizeInBytes);
      totalSize += file.size;
      
      results.push({
        index,
        file,
        ...validation,
        size: file.size,
        formattedSize: fileUtils.formatFileSize(file.size)
      });
    });
    
    const allValid = results.every(r => r.isValid);
    const maxTotalSize = 50000 * 1024 * 1024; // 50GB total limit
    
    if (totalSize > maxTotalSize) {
      results.forEach(r => {
        r.errors.push(`Total file size exceeds ${fileUtils.formatFileSize(maxTotalSize)}`);
        r.isValid = false;
      });
    }
    
    return {
      isValid: allValid && totalSize <= maxTotalSize,
      results,
      totalSize,
      formattedTotalSize: fileUtils.formatFileSize(totalSize)
    };
  },
  
  // NEW: Generate video upload data for multiple files
  generateUploadData: (files) => {
    return files.map((file, index) => ({
      id: Date.now() + index,
      file,
      filename: file.name,
      fileSize: file.size,
      description: '',
      order: index + 1,
      uploadProgress: 0,
      uploadStatus: 'pending' // pending, uploading, completed, failed
    }));
  }
};

// YouTube Channel utility functions
export const youtubeChannelUtils = {
  validateChannelId: (channelId) => {
    const channelIdRegex = /^UC[a-zA-Z0-9_-]{22}$/;
    return channelIdRegex.test(channelId);
  },
  
  validateChannelUrl: (url) => {
    if (!url) return true;
    const youtubeUrlPatterns = [
      /^https?:\/\/(www\.)?youtube\.com\/channel\/UC[a-zA-Z0-9_-]{22}$/,
      /^https?:\/\/(www\.)?youtube\.com\/c\/[a-zA-Z0-9_-]+$/,
      /^https?:\/\/(www\.)?youtube\.com\/user\/[a-zA-Z0-9_-]+$/,
      /^https?:\/\/(www\.)?youtube\.com\/@[a-zA-Z0-9_-]+$/,
    ];
    return youtubeUrlPatterns.some((pattern) => pattern.test(url));
  },
  
  extractChannelIdFromUrl: (url) => {
    if (!url) return null;
    const match = url.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
    return match ? match[1] : null;
  },
  
  formatChannelUrl: (channelId) => {
    if (!channelId) return "";
    if (youtubeChannelUtils.validateChannelId(channelId)) {
      return `https://www.youtube.com/channel/${channelId}`;
    }
    return "";
  },
  
  generateThumbnailUrl: (channelId) => {
    if (!channelId || !youtubeChannelUtils.validateChannelId(channelId)) {
      return null;
    }
    return `https://yt3.ggpht.com/ytc/default_${channelId}=s240-c-k-c0x00ffffff-no-rj`;
  },
  
  validateChannelData: (channelData) => {
    const errors = [];
    if (!channelData.channelName || channelData.channelName.trim().length === 0) {
      errors.push("Channel name is required");
    }
    if (channelData.channelName && channelData.channelName.length > 100) {
      errors.push("Channel name must not exceed 100 characters");
    }
    if (!channelData.channelId || !youtubeChannelUtils.validateChannelId(channelData.channelId)) {
      errors.push("Valid YouTube channel ID is required (format: UC followed by 22 characters)");
    }
    if (channelData.channelUrl && !youtubeChannelUtils.validateChannelUrl(channelData.channelUrl)) {
      errors.push("Invalid YouTube channel URL format");
    }
    if (channelData.description && channelData.description.length > 500) {
      errors.push("Description must not exceed 500 characters");
    }
    if (channelData.thumbnailUrl && channelData.thumbnailUrl.length > 500) {
      errors.push("Thumbnail URL must not exceed 500 characters");
    }
    return { isValid: errors.length === 0, errors: errors };
  },
};

// NEW: Multiple Video Upload utilities
export const multipleUploadUtils = {
  // Validate upload selection
  validateUploadSelection: (selectedVideos) => {
    const errors = [];
    
    if (!selectedVideos || selectedVideos.length === 0) {
      errors.push("Please select at least one video to upload");
    }
    
    selectedVideos.forEach((video, index) => {
      if (!video.channelId) {
        errors.push(`Video ${index + 1} (${video.name}) needs a channel selection`);
      }
      if (!video.videoIdentifier) {
        errors.push(`Video ${index + 1} (${video.name}) is missing video identifier`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  },
  
  // Group videos by channel
  groupVideosByChannel: (selectedVideos) => {
    const groups = {};
    
    selectedVideos.forEach(video => {
      if (!groups[video.channelId]) {
        groups[video.channelId] = [];
      }
      groups[video.channelId].push(video);
    });
    
    return groups;
  },
  
  // Generate upload request for multiple videos
  generateMultipleUploadRequest: (selectedVideos) => {
    const validation = multipleUploadUtils.validateUploadSelection(selectedVideos);
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    return {
      videosToUpload: selectedVideos.map(video => ({
        videoType: video.type,
        videoId: video.id,
        channelId: video.channelId,
        videoIdentifier: video.videoIdentifier
      }))
    };
  },
  
  // Track upload progress for multiple videos
  createUploadProgressTracker: (videos) => {
    return videos.reduce((tracker, video) => {
      tracker[video.videoIdentifier] = {
        status: 'pending',
        progress: 0,
        error: null,
        startTime: null,
        endTime: null
      };
      return tracker;
    }, {});
  }
};

// NEW: Video State Management Hook Data
export const videoStateUtils = {
  // Initialize video state for a task
  initializeVideoState: (task, rawVideos = [], revisions = []) => {
    const organized = videoUtils.organizeTaskVideos(task, rawVideos, revisions);
    
    // Determine initial selection (priority: latest revision > latest raw > legacy raw)
    let initialSelection = null;
    
    if (organized.revisions.length > 0) {
      const latest = organized.revisions[0];
      initialSelection = { type: 'revision', id: latest.id, ...latest };
    } else if (organized.rawVideos.length > 0) {
      const latest = organized.rawVideos[organized.rawVideos.length - 1];
      initialSelection = { ...latest };
    }
    
    return {
      organized,
      initialSelection,
      totalVideoCount: organized.totalCount
    };
  },
  
  // Check if a video is currently selected
  isVideoSelected: (selectedVideo, targetVideo) => {
    if (!selectedVideo || !targetVideo) return false;
    
    if (targetVideo.type === 'legacy_raw') {
      return selectedVideo.type === 'legacy_raw';
    }
    
    return selectedVideo.type === targetVideo.type && selectedVideo.id === targetVideo.id;
  },
  
  // Get video for streaming
  getVideoForStreaming: (video) => {
    const streamingInfo = {
      ...video,
      streamingUrl: null,
      downloadUrl: null
    };
    
    try {
      switch (video.type) {
        case 'raw':
          streamingInfo.streamingUrl = fileAPI.getSpecificRawVideoUrl(video.id);
          break;
        case 'revision':
          streamingInfo.streamingUrl = fileAPI.getRevisionUrl(video.id);
          break;
        case 'legacy_raw':
          streamingInfo.streamingUrl = fileAPI.getVideoUrl(video.taskId);
          break;
      }
    } catch (error) {
      console.error('Error getting streaming URL:', error);
    }
    
    return streamingInfo;
  }
};

// Export enhanced APIs with backward compatibility
export default api;

// Export all APIs for easy importing
export {
  api,
  isCancel, // Re-export for upload cancellation
  API_BASE_URL
};