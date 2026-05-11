import api from './client';

export const getServiceOrders = (params) =>
  api.get(`/service-orders?${params.toString()}`);

export const updateServiceOrderStatus = (id, status, adminComment) =>
  api.put(`/service-orders/${id}/status`, { status, adminComment });

export const uploadResultFiles = async (id, formData) => {
  const base = import.meta.env.VITE_API_URL || '';
  const res = await fetch(`${base}/service-orders/${id}/result-files`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Ошибка');
  return data;
};

export const deleteResultFile = (id, fileId) =>
  api.delete(`/service-orders/${id}/result-files/${fileId}`);

export const downloadCustomerFile = (orderId, fileId) => {
  const base = import.meta.env.VITE_API_URL || '';
  window.open(`${base}/service-orders/${orderId}/customer-files/${fileId}/download`, '_blank');
};
