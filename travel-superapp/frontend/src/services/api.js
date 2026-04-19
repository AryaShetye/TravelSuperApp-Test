/**
 * Axios API client
 * Centralized HTTP client with interceptors for auth and error handling
 */

import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 60000, // 60s — allows for image uploads + geocoding
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';

    // Auto-logout on 401
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      // Don't show toast for auth check on page load
      if (!error.config.url.includes('/auth/me')) {
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    }

    // Show error toast for 5xx errors
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject({ ...error, message });
  }
);

export default api;
