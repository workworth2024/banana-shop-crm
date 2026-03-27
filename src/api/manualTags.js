import api from './client';

export const getManualTags = () =>
  api.get('/manual-tags');

export const createManualTag = (data) =>
  api.post('/manual-tags', data);

export const updateManualTag = (id, data) =>
  api.put(`/manual-tags/${id}`, data);

export const deleteManualTag = (id) =>
  api.delete(`/manual-tags/${id}`);
