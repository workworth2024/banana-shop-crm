import api from './client';

export const getContactForms = (params) =>
  api.get(`/contact-forms?${params.toString()}`);

export const updateContactFormStatus = (id, status) =>
  api.put(`/contact-forms/${id}/status`, { status });

export const deleteContactForm = (id) =>
  api.delete(`/contact-forms/${id}`);
