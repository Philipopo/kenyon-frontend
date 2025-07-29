import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api/';

// Create Axios instance
const API = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // for CSRF
});

// 🔑 Centralized Logout Function
export const handleLogout = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    if (token) {
      await API.post('auth/logout/', {}); // API instance handles auth headers
    }
  } catch (error) {
    console.warn('Error blacklisting token:', error?.response?.data || error.message);
  }

  // Clear auth state
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.clear();

  // Redirect
  window.location.href = '/login';
};

// 🔑 Request Interceptor
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
  }

  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken'))
    ?.split('=')[1];
  if (csrfToken) config.headers['X-CSRFToken'] = csrfToken;

  return config;
});

// 🔑 Response Interceptor (refresh token logic)
API.interceptors.response.use(
  res => res,
  async error => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem('refreshToken')
    ) {
      originalRequest._retry = true;
      try {
        const refreshRes = await API.post('token/refresh/', {
          refresh: localStorage.getItem('refreshToken'),
        });

        const newAccessToken = refreshRes.data.access;
        localStorage.setItem('accessToken', newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        console.error('🔒 Token refresh failed:', refreshError);
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default API;
