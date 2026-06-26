/**
 * Projects API service.
 */
import apiClient from './client';

export const projectService = {
  async getAll() {
    const response = await apiClient.get('/projects');
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await apiClient.post('/projects', data);
    return response.data;
  },

  async update(id, data) {
    const response = await apiClient.patch(`/projects/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },

  async addMember(projectId, email, role) {
    const response = await apiClient.post(`/projects/${projectId}/members`, {
      email,
      role,
    });
    return response.data;
  },

  async projectDetailsUpdate(projectId, data) {
    const response = await apiClient.patch(`/projects/${projectId}`, data);
    return response.data;
  },

  async removeMember(projectId, userId) {
    const response = await apiClient.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
  },
};