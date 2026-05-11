import api from './client';

export const getPreorders = (params) =>
  api.get(`/preorders?${params.toString()}`);

export const updatePreorderStatus = (id, status) =>
  api.put(`/preorders/${id}/status`, { status });

export const deletePreorder = (id) =>
  api.delete(`/preorders/${id}`);

export const uploadPreorderFiles = async (id, formData) => {
  const base = import.meta.env.VITE_API_URL || '';
  const token = document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1] || '';
  const res = await fetch(`${base}/preorders/${id}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Ошибка');
  return data;
};

export const deletePreorderFile = (id, fileId) =>
  api.delete(`/preorders/${id}/files/${fileId}`);
