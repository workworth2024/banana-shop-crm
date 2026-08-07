import api from './client';

export const getOrderHistory = (params) => {
  const qs = new URLSearchParams(params).toString();
  return api.get(`/order-history?${qs}`);
};

export const getOrderHistoryFilters = () =>
  api.get('/order-history/filters');
