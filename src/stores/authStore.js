import { create } from 'zustand';
import api from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  authChecked: false,

  setUser: (user) => set({ user, isAuthenticated: true }),

  login: async (username, password) => {
    try {
      const data = await api.post('/auth/login', { username, password });
      set({ user: data.user, isAuthenticated: true, authChecked: true });
      return data;
    } catch (error) {
      throw error;
    }
  },

  register: async (username, email, password) => {
    try {
      const data = await api.post('/auth/register', { username, email, password });
      return data;
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (_) {}
    set({ user: null, isAuthenticated: false, authChecked: true });
  },

  checkAuth: async () => {
    try {
      const data = await api.get('/auth/me');
      set({ user: data.user, isAuthenticated: true, authChecked: true });
    } catch (error) {
      set({ user: null, isAuthenticated: false, authChecked: true });
    }
  }
}));
