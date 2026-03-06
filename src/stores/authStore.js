import { create } from 'zustand';
import api from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('token'),
  token: localStorage.getItem('token'),
  
  setUser: (user) => set({ user, isAuthenticated: true }),
  
  login: async (username, password) => {
    try {
      const data = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true });
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
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const data = await api.get('/auth/me');
      set({ user: data.user, isAuthenticated: true });
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  }
}));
