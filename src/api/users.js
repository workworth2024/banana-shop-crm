import api from './client';

export const getUsers = (params) =>
  api.get(`/users?${params.toString()}`);

export const getRoles = () =>
  api.get('/users/roles');

export const createUser = (data) =>
  api.post('/users', data);

export const updateUser = (id, data) =>
  api.put(`/users/${id}`, data);

export const deleteUser = (id) =>
  api.request(`/users/${id}`, { method: 'DELETE' });
