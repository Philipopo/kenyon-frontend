import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api/';

// Create instance
const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable for CSRF
});

const handleLogout = async () => {
  try {
    // Optional: tell backend to blacklist the token
    const token = localStorage.getItem('token');
    if (token) {
      await axios.post('http://127.0.0.1:8000/api/auth/logout/', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.warn('Error blacklisting token:', error?.response?.data || error.message);
  }

  // 🧨 Critical: Clear ALL local storage and session
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.clear();

  // 🧼 Optionally reload the app to clear any cached auth state
  window.location.href = '/login'; // hard reload to flush in-memory state
};

// Automatically attach access token and CSRF token to every request
API.interceptors.request.use((config) => {
  // Attach access token
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Dynamically set Content-Type for multipart/form-data if FormData is used
  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
  }

  // Attach CSRF token if available
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken'))
    ?.split('=')[1];
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }

  return config;
});

// Automatically handle token expiration
API.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
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
        return API(originalRequest); // Retry original request
      } catch (refreshError) {
        console.error('🔒 Token refresh failed:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default API;