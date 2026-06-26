/**
 * AI & RAG API service.
 */
import apiClient from './client';

export const aiService = {
  async chat(projectId, message, history = []) {
    const response = await apiClient.post('/ai/chat', {
      project_id: projectId,
      message,
      history,
    });
    return response.data;
  },

  async semanticSearch(projectId, query, limit = 10) {
    const response = await apiClient.post('/ai/semantic-search', {
      project_id: projectId,
      query,
      limit,
    });
    return response.data;
  },

  async enhanceDescription(title, description) {
    const response = await apiClient.post('/ai/enhance-description', {
      title,
      description,
    });
    return response.data;
  },

  async suggestAssignee(projectId, title, description) {
    const response = await apiClient.post('/ai/suggest-assignee', {
      project_id: projectId,
      title,
      description,
    });
    return response.data;
  },

  async reindex(projectId) {
    const response = await apiClient.post('/ai/reindex', {
      project_id: projectId,
    });
    return response.data;
  },

  async getInfo() {
    const response = await apiClient.get('/ai/info');
    return response.data;
  },
};
