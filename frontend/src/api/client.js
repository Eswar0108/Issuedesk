/**
 * API Client configuration.
 * Axios instance pre-configured with base URL and auth headers.
 */
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8008/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to every request automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors — skip for login/register endpoints
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    // Don't redirect on auth endpoints (login/register failures return 401)
    if (error.response?.status === 401 && !url.includes('/auth/')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('current_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;