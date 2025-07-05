import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS with credentials
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log the request for debugging
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`, {
      headers: config.headers,
      data: config.data instanceof FormData ? 'FormData' : config.data,
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
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
      message: error.message
    });
    
    if (error.response?.status === 401) {
      console.log('401 Unauthorized - removing token and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    if (error.response?.status === 403) {
      console.log('403 Forbidden - insufficient permissions');
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
  createTask: (formData) => {
    console.log('Creating task with form data:', formData);
    return api.post('/tasks', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data'
      }
    });
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
  setTaskPrivacy: (taskId, privacyData) => api.post(`/tasks/${taskId}/privacy`, privacyData),
  scheduleYouTubeUpload: (taskId, uploadTime) => api.post(`/tasks/${taskId}/schedule-upload`, { uploadTime }),
  addAudioInstruction: (taskId, formData) => {
    console.log(`Adding audio instruction to task ${taskId}`);
    return api.post(`/tasks/${taskId}/audio-instructions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
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
    console.log('Creating revision with form data:', formData);
    return api.post('/revisions', formData, {
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
  addRevisionComment: (revisionId, commentData) => api.post(`/comments/revision/${revisionId}`, commentData),
  getTaskComments: (taskId) => {
    console.log(`Fetching comments for task ${taskId}`);
    return api.get(`/comments/task/${taskId}`);
  },
};

// File API
export const fileAPI = {
  downloadRawVideo: (taskId) => api.get(`/files/video/${taskId}`, { responseType: 'blob' }),
  downloadRevisionVideo: (revisionId) => api.get(`/files/revision/${revisionId}`, { responseType: 'blob' }),
  downloadAudio: (audioId) => api.get(`/files/audio/${audioId}`, { responseType: 'blob' }),
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

// Helper function to create form data
export const createFormData = (data) => {
  const formData = new FormData();
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(item => formData.append(key, item));
      } else {
        formData.append(key, value);
      }
    }
  });
  
  return formData;
};

export default api;