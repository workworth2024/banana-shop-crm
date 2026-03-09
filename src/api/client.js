const BASE_URL = 'http://localhost:8000/api/v3';

const api = {
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    const headers = {
      ...options.headers
    };

    // Only set Content-Type if not using FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Automatically add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        credentials: 'include',
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        // If 401, token might be invalid
        if (response.status === 401) {
          localStorage.removeItem('token');
        }
        throw new Error(data.message || 'Network response was not ok');
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET'
    });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }
};

export default api;
