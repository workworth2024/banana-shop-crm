import api from './client';

export const getPartnerTags = () =>
  api.get('/partner-tags');

export const createPartnerTag = (data) =>
  api.post('/partner-tags', data);

export const updatePartnerTag = (id, data) =>
  api.put(`/partner-tags/${id}`, data);

export const deletePartnerTag = (id) =>
  api.delete(`/partner-tags/${id}`);
