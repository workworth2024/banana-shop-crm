import api from './client';

export const getScenarios = (params) =>
  api.get(`/scenarios?${params.toString()}`);

export const getScenarioById = (id) =>
  api.get(`/scenarios/${id}`);

export const createScenario = (data) =>
  api.post('/scenarios', data);

export const updateScenario = (id, data) =>
  api.put(`/scenarios/${id}`, data);

export const deleteScenario = (id) =>
  api.delete(`/scenarios/${id}`);
