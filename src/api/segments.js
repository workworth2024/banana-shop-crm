import api from './client';

export const getSegmentFields = () =>
  api.get('/segments/fields');

export const previewSegmentCount = (conditions) =>
  api.post('/segments/preview', { conditions });

export const getSegments = (params) =>
  api.get(`/segments?${params.toString()}`);

export const getSegment = (id) =>
  api.get(`/segments/${id}`);

export const createSegment = (data) =>
  api.post('/segments', data);

export const updateSegment = (id, data) =>
  api.patch(`/segments/${id}`, data);

export const recomputeSegment = (id) =>
  api.post(`/segments/${id}/recompute`);

export const deleteSegment = (id) =>
  api.delete(`/segments/${id}`);

export const getSegmentMembers = (id, params) =>
  api.get(`/segments/${id}/members?${params.toString()}`);
