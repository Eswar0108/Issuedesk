/**
 * Comments API service.
 */
import apiClient from './client';

export const commentService = {
  async getByIssue(issueId) {
    const response = await apiClient.get(`/issues/${issueId}/comments`);
    return response.data;
  },

  async create(issueId, content) {
    const response = await apiClient.post(`/issues/${issueId}/comments`, { content });
    return response.data;
  },

  async update(issueId, commentId, content) {
    const response = await apiClient.patch(`/issues/${issueId}/comments/${commentId}`, { content });
    return response.data;
  },

  async delete(issueId, commentId) {
    const response = await apiClient.delete(`/issues/${issueId}/comments/${commentId}`);
    return response.data;
  },
};