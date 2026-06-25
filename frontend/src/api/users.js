import apiClient from './client';

export const userService = {
  /**
   * Get all active users with optional search filter.
   * 
   * @param {string} search - Search query for username or email
   * @returns {Promise<any>} Paginated response containing list of users
   */
  async getAll(search = '') {
    const response = await apiClient.get('/users', {
      params: { search, page_size: 100 }
    });
    return response.data;
  }
};
