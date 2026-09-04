import api from './client';

export const uploadBroadcastImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.request('/broadcasts/upload-image', { method: 'POST', body: formData });
};

export const previewBroadcastAudience = (payload) =>
  api.post('/broadcasts/preview-audience', payload);

export const getBroadcasts = (params) =>
  api.get(`/broadcasts?${params.toString()}`);

export const getBroadcast = (id) =>
  api.get(`/broadcasts/${id}`);

export const createBroadcast = (data) =>
  api.post('/broadcasts', data);

export const cancelBroadcast = (id) =>
  api.post(`/broadcasts/${id}/cancel`);

export const deleteBroadcast = (id) =>
  api.delete(`/broadcasts/${id}`);
