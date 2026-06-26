/**
 * Attachments API service.
 *
 * Handles upload, listing, and deletion of file attachments
 * using the polymorphic entity_type + entity_id pattern.
 */
import apiClient from './client';

const BASE_URL = 'http://localhost:8008';

export const attachmentService = {
  /**
   * List all attachments for an entity (e.g., issue #5).
   * @param {string} entityType - "issue" | "project" | "comment"
   * @param {number} entityId
   */
  async getForEntity(entityType, entityId) {
    const response = await apiClient.get(`/attachments/${entityType}/${entityId}`);
    return response.data;
  },

  /**
   * Upload a file attachment to an entity.
   * @param {string} entityType
   * @param {number} entityId
   * @param {File} file - The File object from an <input type="file">
   */
  async upload(entityType, entityId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(
      `/attachments/${entityType}/${entityId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  /**
   * Delete an attachment by ID.
   * @param {number} attachmentId
   */
  async delete(attachmentId) {
    const response = await apiClient.delete(`/attachments/${attachmentId}`);
    return response.data;
  },

  /**
   * Build the download URL for a stored attachment.
   * @param {string} filePath - relative path stored in the DB
   */
  getDownloadUrl(filePath) {
    return `${BASE_URL}/uploads/${filePath}`;
  },

  /**
   * Format bytes into a human-readable string (e.g., "2.4 MB").
   * @param {number} bytes
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  },
};
