import api from './client';

export const getBlogTags = () =>
  api.get('/admin/blog/tags');

export const createBlogTag = (data) =>
  api.post('/admin/blog/tags', data);

export const updateBlogTag = (id, data) =>
  api.put(`/admin/blog/tags/${id}`, data);

export const deleteBlogTag = (id) =>
  api.delete(`/admin/blog/tags/${id}`);
