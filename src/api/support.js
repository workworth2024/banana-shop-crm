import api from './client';

const buildFormData = (text, files) => {
  const fd = new FormData();
  if (text) fd.append('text', text);
  if (files?.length) for (const f of files) fd.append('attachments', f);
  return fd;
};

const supportApi = {
  listTickets: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) qs.set(k, v);
    });
    return api.get(`/support/tickets${qs.toString() ? '?' + qs.toString() : ''}`);
  },
  getTicket: (id) => api.get(`/support/tickets/${id}`),
  getMessages: (id, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) qs.set(k, v);
    });
    return api.get(`/support/tickets/${id}/messages${qs.toString() ? '?' + qs.toString() : ''}`);
  },
  sendMessage: (id, { text, files }) => {
    return api.request(`/support/tickets/${id}/messages`, {
      method: 'POST',
      body: buildFormData(text, files)
    });
  },
  assign: (id, userId) => api.post(`/support/tickets/${id}/assign`, { userId }),
  close: (id) => api.post(`/support/tickets/${id}/close`, {}),
  reopen: (id) => api.post(`/support/tickets/${id}/reopen`, {}),
  markRead: (id) => api.post(`/support/tickets/${id}/read`, {}),
  stats: () => api.get('/support/stats')
};

export default supportApi;
