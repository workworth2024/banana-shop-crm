import api from './client';

export const getServices = (params) =>
  api.get(`/services?${params.toString()}`);

export const saveService = (formData, id = null) => {
  const endpoint = id ? `/services/${id}` : '/services';
  return api.request(endpoint, { method: id ? 'PUT' : 'POST', body: formData });
};

export const deleteService = (id) =>
  api.request(`/services/${id}`, { method: 'DELETE' });
