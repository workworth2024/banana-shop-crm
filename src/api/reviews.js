import api from './client';

export const getReviews = (params) =>
  api.get(`/reviews?${params.toString()}`);

export const deleteReview = (id) =>
  api.delete(`/reviews/${id}`);

export const saveReview = (formData, id = null) => {
  const endpoint = id ? `/reviews/${id}` : '/reviews';
  return api.request(endpoint, { method: id ? 'PUT' : 'POST', body: formData });
};
