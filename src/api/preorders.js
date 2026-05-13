import api from './client';
import { xhrPostFormData } from '../utils/fileTransfer';

export const getPreorders = (params) =>
  api.get(`/preorders?${params.toString()}`);

export const updatePreorderStatus = (id, status) =>
  api.put(`/preorders/${id}/status`, { status });

export const deletePreorder = (id) =>
  api.delete(`/preorders/${id}`);

export const uploadPreorderFiles = async (id, formData, { onUploadProgress } = {}) => {
  const base = import.meta.env.VITE_API_URL || '';
  return xhrPostFormData(`${base}/preorders/${id}/files`, formData, { onUploadProgress });
};

export const deletePreorderFile = (id, fileId) =>
  api.delete(`/preorders/${id}/files/${fileId}`);
