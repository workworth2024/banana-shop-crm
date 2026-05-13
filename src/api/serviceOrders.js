import api from './client';
import { xhrPostFormData, xhrDownloadBlob } from '../utils/fileTransfer';

export const getServiceOrders = (params) =>
  api.get(`/service-orders?${params.toString()}`);

export const updateServiceOrderStatus = (id, status, adminComment) =>
  api.put(`/service-orders/${id}/status`, { status, adminComment });

export const uploadResultFiles = async (id, formData, { onUploadProgress } = {}) => {
  const base = import.meta.env.VITE_API_URL || '';
  return xhrPostFormData(`${base}/service-orders/${id}/result-files`, formData, { onUploadProgress });
};

export const deleteResultFile = (id, fileId) =>
  api.delete(`/service-orders/${id}/result-files/${fileId}`);

export async function downloadCustomerFile(orderId, fileId, { onDownloadProgress } = {}) {
  const base = import.meta.env.VITE_API_URL || '';
  return xhrDownloadBlob(`${base}/service-orders/${orderId}/customer-files/${fileId}/download`, { onDownloadProgress });
}
