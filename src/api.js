// src/api.js
import axios from 'axios';

// 🔑 Use env variable with a fallback
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api/';

// Create Axios instance
const API = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// 🔑 Centralized Logout Function
export const handleLogout = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    if (token) {
      await API.post('auth/logout/', {});
    }
  } catch (error) {
    console.warn('Error blacklisting token:', error?.response?.data || error.message);
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.clear();

  window.location.href = '/login';
};

// 🔑 Request Interceptor
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
  }

  // Skip CSRF for JWT endpoints
  const jwtEndpoints = ['auth/login/', 'auth/api-keys/', 'auth/verify-otp/', 'token/refresh/'];
  if (!jwtEndpoints.some(endpoint => config.url.includes(endpoint))) {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken'))
      ?.split('=')[1];
    if (csrfToken) config.headers['X-CSRFToken'] = csrfToken;
  }

  return config;
});

// 🔑 Response Interceptor - Token Refresh + Auto Logout
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      // Handle logout endpoint separately
      if (originalRequest.url.includes('auth/logout/')) {
        handleLogout();
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken || originalRequest._retry) {
        handleLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return API(originalRequest);
        }).catch(err => {
          handleLogout();
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await API.post('token/refresh/', {
          refresh: refreshToken,
        });

        const newAccessToken = refreshRes.data.access;
        localStorage.setItem('accessToken', newAccessToken);

        processQueue(null, newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        console.error('🔒 Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        isRefreshing = false;
        handleLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ✅ Export as default so `import api from './api'` works
export default API;