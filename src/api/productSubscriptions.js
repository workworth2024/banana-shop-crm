import api from './client';

export const getSubscriptionsSummary = () =>
  api.get('/product-subscriptions/summary');

export const getSubscribersForProduct = (productId, productType) =>
  api.get(`/product-subscriptions?productId=${productId}&productType=${productType}`);
