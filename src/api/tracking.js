import api from './client';

const buildQs = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, v);
  });
  return qs.toString() ? '?' + qs.toString() : '';
};

const trackingApi = {
  listLinks: (params = {}) => api.get(`/tracking/links${buildQs(params)}`),
  createLink: (body) => api.post('/tracking/links', body),
  updateLink: (id, body) => api.patch(`/tracking/links/${id}`, body),
  deleteLink: (id) => api.delete(`/tracking/links/${id}`),
  linkStats: (id, params = {}) => api.get(`/tracking/links/${id}/stats${buildQs(params)}`),
  dashboard: (params = {}) => api.get(`/tracking/dashboard${buildQs(params)}`)
};

export default trackingApi;
