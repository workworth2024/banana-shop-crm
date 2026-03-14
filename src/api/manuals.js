import api from './client';

export const getManuals = (params) =>
  api.get(`/manuals?${params.toString()}`);

export const deleteManual = (id) =>
  api.request(`/manuals/${id}`, { method: 'DELETE' });

export const saveManual = (formData, id = null) => {
  const endpoint = id ? `/manuals/${id}` : '/manuals';
  return api.request(endpoint, { method: id ? 'PUT' : 'POST', body: formData });
};
