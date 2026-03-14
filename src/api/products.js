import api from './client';

export const getFilters = () =>
  api.get('/products/filters');

export const createFilter = (data) =>
  api.post('/products/filters', data);

export const updateFilter = (id, data) =>
  api.put(`/products/filters/${id}`, data);

export const deleteFilter = (id) =>
  api.request(`/products/filters/${id}`, { method: 'DELETE' });

export const getYoutubeProducts = (params) =>
  api.get(`/products/youtube?${params.toString()}`);

export const getGoogleAdsProducts = (params) =>
  api.get(`/products/google-ads?${params.toString()}`);

export const saveProduct = (formData, tab, id = null) => {
  const base = tab === 'youtube' ? '/products/youtube' : '/products/google-ads';
  const endpoint = id ? `${base}/${id}` : base;
  return api.request(endpoint, { method: id ? 'PUT' : 'POST', body: formData });
};

export const deleteProduct = (tab, id) => {
  const base = tab === 'youtube' ? '/products/youtube' : '/products/google-ads';
  return api.request(`${base}/${id}`, { method: 'DELETE' });
};
