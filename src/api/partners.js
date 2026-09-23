import api from './client';

export const getPartners = (params) =>
  api.get(`/partners?${params.toString()}`);

export const getPartner = (id) =>
  api.get(`/partners/${id}`);

export const deletePartner = (id) =>
  api.request(`/partners/${id}`, { method: 'DELETE' });

export const savePartner = (formData, id = null) => {
  const endpoint = id ? `/partners/${id}` : '/partners';
  return api.request(endpoint, { method: id ? 'PUT' : 'POST', body: formData });
};
