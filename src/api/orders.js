import api from './client';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const getAllOrders = (params) => {
  const qs = new URLSearchParams(params).toString();
  return api.get(`/orders?${qs}`);
};

export const updateOrderStatus = (id, status) =>
  api.patch(`/orders/${id}/status`, { status });

export const deleteOrder = (id) =>
  api.request(`/orders/${id}`, { method: 'DELETE' });

export const getOrderReplaceRequest = (id) =>
  api.get(`/orders/${id}/replace-request`);

export const getAvailableItemsForOrder = (id) =>
  api.get(`/orders/${id}/available-items`);

export const processReplacement = (id, newItemId) =>
  api.post(`/orders/${id}/replacement`, { newItemId });

export const processRefund = (id) =>
  api.post(`/orders/${id}/refund`, {});

export const getReplacementsHistory = (params) => {
  const qs = new URLSearchParams(params).toString();
  return api.get(`/orders/replacements?${qs}`);
};
