import api from './client';

export const getClients = (params) =>
  api.get(`/customers?${params.toString()}`);

export const getClient = (id) =>
  api.get(`/customers/${id}`);

export const toggleClientStatus = (id) =>
  api.request(`/customers/${id}/status`, { method: 'PATCH' });

export const adjustClientBalance = (id, amount, note = '') =>
  api.request(`/customers/${id}/balance`, {
    method: 'PATCH',
    body: JSON.stringify({ amount, note }),
    headers: { 'Content-Type': 'application/json' }
  });

export const resetClientPassword = (id, newPassword) =>
  api.request(`/customers/${id}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ newPassword }),
    headers: { 'Content-Type': 'application/json' }
  });
