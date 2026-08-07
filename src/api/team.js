import api from './client';

export const getTeamMembers = () =>
  api.get('/team');

export const deleteTeamMember = (id) =>
  api.delete(`/team/${id}`);

export const saveTeamMember = (formData, id = null) => {
  const endpoint = id ? `/team/${id}` : '/team';
  return api.request(endpoint, { method: id ? 'PUT' : 'POST', body: formData });
};

export const reorderTeamMembers = (ids) =>
  api.put('/team/reorder', { ids });
