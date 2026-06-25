/**
 * Authentication API service.
 */
import apiClient from './client';

export const authService = {
  async register(username, email, password, fullName) {
    const response = await apiClient.post('/auth/register', {
      username,
      email,
      password,
      full_name: fullName,
    });
    return response.data;
  },

  async login(usernameOrEmail, password) {
    const response = await apiClient.post('/auth/login', {
      username_or_email: usernameOrEmail,
      password,
    });
    return response.data;
  },

  async getProfile() {
    const response = await apiClient.get('/users/me');
    return response.data;
  },
};