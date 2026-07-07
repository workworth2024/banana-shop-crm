import { create } from 'zustand';
import api from '../api/client';

export const useAdminNotifStore = create((set, get) => ({
  categoryCounts: {},

  fetchCategoryCounts: async () => {
    try {
      const data = await api.get('/admin-notifications/category-counts');
      set({ categoryCounts: data.counts || {} });
    } catch {}
  },

  setCategoryCount: (category, count) => {
    if (!category) return;
    set((s) => ({ categoryCounts: { ...s.categoryCounts, [category]: count } }));
  },

  markCategoryRead: async (categories) => {
    const list = Array.isArray(categories) ? categories : [categories];
    if (!list.length) return;
    const hasUnread = list.some((c) => (get().categoryCounts[c] || 0) > 0);
    if (!hasUnread) return;
    set((s) => {
      const next = { ...s.categoryCounts };
      list.forEach((c) => { next[c] = 0; });
      return { categoryCounts: next };
    });
    try {
      await api.patch('/admin-notifications/mark-category-read', { categories: list });
    } catch {}
  }
}));
