import api from './client';

export const getBlogPosts = (params) =>
  api.get(`/admin/blog/posts?${params.toString()}`);

export const getBlogPost = (id) =>
  api.get(`/admin/blog/posts/${id}`);

export const deleteBlogPost = (id) =>
  api.request(`/admin/blog/posts/${id}`, { method: 'DELETE' });

export const saveBlogPost = (formData, id = null) => {
  const endpoint = id ? `/admin/blog/posts/${id}` : '/admin/blog/posts';
  return api.request(endpoint, { method: id ? 'PUT' : 'POST', body: formData });
};

export const importBlogPostFromTeletype = (url) =>
  api.post('/admin/blog/posts/import-teletype', { url });
