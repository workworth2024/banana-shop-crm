import api from './client';

const buildQs = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, v);
  });
  return qs.toString() ? '?' + qs.toString() : '';
};

const dashboardApi = {
  get: (params = {}) => api.get(`/admin/dashboard${buildQs(params)}`),
  top: (kind, params = {}) => api.get(`/admin/dashboard/top/${kind}${buildQs(params)}`)
};

export default dashboardApi;
