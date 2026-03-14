import api from './client';

export const getPreorders = (params) =>
  api.get(`/preorders?${params.toString()}`);

export const updatePreorderStatus = (id, status) =>
  api.put(`/preorders/${id}/status`, { status });

export const deletePreorder = (id) =>
  api.delete(`/preorders/${id}`);
