/**
 * Issues API service.
 */
import apiClient from './client';

export const issueService = {
  async getAll(params = {}) {
    const response = await apiClient.get('/issues', { params });
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/issues/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await apiClient.post('/issues', data);
    return response.data;
  },

  async update(id, data) {
    const response = await apiClient.patch(`/issues/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/issues/${id}`);
    return response.data;
  },
};