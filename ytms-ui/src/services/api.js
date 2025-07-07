// Fixed API Services - Complete File

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Fixed: Extract methods to avoid instanceof issues
const { isCancel, CancelToken } = axios;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`, {
      headers: config.headers,
      data: config.data instanceof FormData ? 'FormData' : config.data,
      timeout: config.timeout
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response.status, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      timeout: error.config?.timeout
    });
    
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.error('Request timeout');
      error.message = 'Request timeout. Please try again.';
    }
    
    if (error.response?.status === 401) {
      console.log('401 Unauthorized - removing token and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => {
    console.log('Attempting login with:', credentials);
    return api.post('/auth/login', credentials);
  },
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => {
    console.log('Fetching current user...');
    return api.get('/auth/me');
  },
  refreshToken: () => api.post('/auth/refresh'),
};

// Users API
export const usersAPI = {
  getAllUsers: () => api.get('/users'),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getEditors: () => api.get('/users/editors'),
  getAdmins: () => api.get('/users/admins'),
};

// Tasks API
export const tasksAPI = {
  getAllTasks: () => {
    console.log('Fetching all tasks...');
    return api.get('/tasks');
  },
  getTaskById: (id) => {
    console.log(`Fetching task ${id}...`);
    return api.get(`/tasks/${id}`);
  },
  createTask: (taskData) => {
    console.log('Creating task with data:', taskData instanceof FormData ? 'FormData' : taskData);
    
    const uploadApi = axios.create({
      ...api.defaults,
      timeout: 10 * 60 * 1000, // 10 minutes
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    uploadApi.interceptors.request.use(api.interceptors.request.handlers[0].fulfilled);
    uploadApi.interceptors.response.use(
      api.interceptors.response.handlers[0].fulfilled,
      api.interceptors.response.handlers[0].rejected
    );
    
    return uploadApi.post('/tasks', taskData, {
      headers: taskData instanceof FormData ? {} : { 'Content-Type': 'application/json' }
    });
  },
  generateUploadUrl: (filename, type, folder) => {
    console.log(`Generating upload URL for ${filename} in folder ${folder}`);
    
    const params = new URLSearchParams({
      filename: filename,
      type: type,
      folder: folder
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
  addAudioInstruction: (taskId, formData) => {
    console.log(`Adding audio instruction to task ${taskId}`);
    return api.post(`/tasks/${taskId}/audio-instructions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 5 * 60 * 1000
    });
  },
  getAudioInstructions: (taskId) => {
    console.log(`Fetching audio instructions for task ${taskId}`);
    return api.get(`/tasks/${taskId}/audio-instructions`);
  },
};

// Revisions API
export const revisionsAPI = {
  createRevision: (formData) => {
    console.log('Creating revision with form data');
    
    const uploadApi = axios.create({
      ...api.defaults,
      timeout: 15 * 60 * 1000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    uploadApi.interceptors.request.use(api.interceptors.request.handlers[0].fulfilled);
    uploadApi.interceptors.response.use(
      api.interceptors.response.handlers[0].fulfilled,
      api.interceptors.response.handlers[0].rejected
    );
    
    return uploadApi.post('/revisions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getRevisionsByTask: (taskId) => {
    console.log(`Fetching revisions for task ${taskId}`);
    return api.get(`/revisions/task/${taskId}`);
  },
  getLatestRevision: (taskId) => api.get(`/revisions/task/${taskId}/latest`),
  getRevisionById: (id) => api.get(`/revisions/${id}`),
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
};

// File API
export const fileAPI = {
  downloadRawVideo: (taskId) => {
    console.log(`Downloading raw video for task ${taskId}`);
    return api.get(`/files/video/${taskId}`, { 
      responseType: 'blob',
      timeout: 15 * 60 * 1000
    });
  },
  downloadRevisionVideo: (revisionId) => {
    console.log(`Downloading revision video ${revisionId}`);
    return api.get(`/files/revision/${revisionId}`, { 
      responseType: 'blob',
      timeout: 15 * 60 * 1000
    });
  },
  downloadAudio: (audioId) => {
    console.log(`Downloading audio ${audioId}`);
    return api.get(`/files/audio/${audioId}`, { 
      responseType: 'blob',
      timeout: 5 * 60 * 1000
    });
  },
  getVideoUrl: (taskId) => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/files/video/${taskId}?Authorization=Bearer ${encodeURIComponent(token)}`;
  },
  getRevisionUrl: (revisionId) => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/files/revision/${revisionId}?Authorization=Bearer ${encodeURIComponent(token)}`;
  },
  getAudioUrl: (audioId) => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/files/audio/${audioId}?Authorization=Bearer ${encodeURIComponent(token)}`;
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => {
    console.log('Fetching dashboard stats...');
    return api.get('/dashboard/stats');
  },
  getRecentTasks: () => {
    console.log('Fetching recent tasks...');
    return api.get('/dashboard/recent-tasks');
  },
};

// Storage API
export const storageAPI = {
  generateSignedUrl: (fileName, folder, contentType) => {
    console.log(`Generating signed URL for ${fileName} in ${folder} with type ${contentType}`);
    return api.post('/storage/generate-signed-url', {
      fileName,
      folder,
      contentType
    });
  },
  verifyUpload: (objectName) => {
    console.log(`Verifying upload for object ${objectName}`);
    return api.post('/storage/verify-upload', { objectName });
  },
  deleteFile: (objectName) => {
    console.log(`Deleting file ${objectName}`);
    return api.delete('/storage/delete', { data: { objectName } });
  },
};

// Utility functions
export const fileUtils = {
  validateFileType: (file, allowedTypes) => {
    const fileType = file.type.toLowerCase();
    return allowedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return fileType.startsWith(baseType + '/');
      }
      return fileType === type;
    });
  },
  
  validateFileSize: (file, maxSizeInBytes) => {
    return file.size <= maxSizeInBytes;
  },
  
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  getFileExtension: (fileName) => {
    return fileName.split('.').pop().toLowerCase();
  },
  
  generateUniqueFileName: (originalName) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = fileUtils.getFileExtension(originalName);
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
    return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
  }
};

export default api;