import api from './client';

export const getPromoCodes = (params) =>
  api.get(`/promo-codes?${params.toString()}`);

export const getPromoCode = (id) =>
  api.get(`/promo-codes/${id}`);

export const createPromoCode = (data) =>
  api.post('/promo-codes', data);

export const updatePromoCode = (id, data) =>
  api.patch(`/promo-codes/${id}`, data);

export const setPromoCodeStatus = (id, status) =>
  api.patch(`/promo-codes/${id}/status`, { status });

export const deletePromoCode = (id) =>
  api.delete(`/promo-codes/${id}`);

export const getPromoCodeRedemptions = (id, params) =>
  api.get(`/promo-codes/${id}/redemptions?${params.toString()}`);
