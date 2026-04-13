import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refreshToken }
        );
        
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// User Services
export const userService = {
  getProfile: async (userId) => {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  },
  
  updateProfile: async (userId, data) => {
    const response = await api.put(`/users/${userId}/profile`, data);
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
  updateLocation: async (userId, locationData) => {
    const response = await api.put(`/users/${userId}/location`, locationData);
    return response.data;
  },
  
  getHostedGames: async (userId) => {
    const response = await api.get(`/users/${userId}/games/hosting`);
    return response.data;
  },
  
  getJoinedGames: async (userId) => {
    const response = await api.get(`/users/${userId}/games/joined`);
    return response.data;
  },
};

// Game Services
export const gameService = {
  createGame: async (gameData) => {
    const response = await api.post('/games', gameData);
    return response.data;
  },
  
  getAllGames: async (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    const url = `/games${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await api.get(url);
    return response.data;
  },
  
  getGameById: async (gameId) => {
    const response = await api.get(`/games/${gameId}`);
    return response.data;
  },
  
  joinGame: async (gameId) => {
    const response = await api.post(`/games/${gameId}/join`);
    return response.data;
  },
  
  leaveGame: async (gameId) => {
    const response = await api.delete(`/games/${gameId}/leave`);
    return response.data;
  },
  
  cancelGame: async (gameId, reason = '') => {
    const response = await api.put(`/games/${gameId}/cancel`, { reason });
    return response.data;
  },
};

export default api;