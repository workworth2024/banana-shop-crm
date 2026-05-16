import { create } from 'zustand';
import supportApi from '../api/support';

const statusRank = (s) => (s === 'closed' ? 1 : 0);
const sortByLastMessage = (arr) =>
  [...arr].sort((a, b) => {
    const r = statusRank(a.status) - statusRank(b.status);
    if (r !== 0) return r;
    return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
  });

export const useSupportStore = create((set, get) => ({
  tickets: [],
  total: 0,
  pages: 1,
  filters: { status: '', q: '', from: '', to: '', page: 1, limit: 30 },
  activeTicketId: null,
  messagesByTicket: {},
  customerOnlineByTicket: {},
  customerTypingByTicket: {},
  hasMoreByTicket: {},
  loadingOlderByTicket: {},
  unreadActive: 0,

  setFilter: (patch) => set((s) => ({ filters: { ...s.filters, ...patch, page: patch.page ?? 1 } })),
  setActive: (id) => set({ activeTicketId: id }),

  loadList: async () => {
    try {
      const data = await supportApi.listTickets(get().filters);
      set({
        tickets: sortByLastMessage(data.items || []),
        total: data.total || 0,
        pages: data.pages || 1
      });
      get().refreshUnreadCount();
    } catch (e) { console.error(e); }
  },

  refreshUnreadCount: async () => {
    try {
      const stats = await supportApi.stats();
      set({ unreadActive: stats.unread || 0 });
    } catch {}
  },

  upsertTicket: (ticket) => {
    if (!ticket?._id) return;
    const arr = get().tickets;
    const idx = arr.findIndex((t) => String(t._id) === String(ticket._id));
    const next = idx >= 0
      ? arr.map((t, i) => i === idx ? { ...t, ...ticket } : t)
      : [ticket, ...arr];
    set({ tickets: sortByLastMessage(next) });
    get().refreshUnreadCount();
  },

  loadMessages: async (id) => {
    const data = await supportApi.getTicket(id);
    set((s) => ({
      messagesByTicket: { ...s.messagesByTicket, [id]: data.messages || [] },
      hasMoreByTicket: { ...s.hasMoreByTicket, [id]: !!data.hasMore }
    }));
    get().upsertTicket(data.ticket);
    return data;
  },

  loadOlderMessages: async (id) => {
    const state = get();
    if (state.loadingOlderByTicket[id]) return;
    if (state.hasMoreByTicket[id] === false) return;
    const cur = state.messagesByTicket[id] || [];
    if (!cur.length) return;
    const before = cur[0]?.createdAt;
    if (!before) return;
    set((s) => ({ loadingOlderByTicket: { ...s.loadingOlderByTicket, [id]: true } }));
    try {
      const { messages = [], hasMore } = await supportApi.getMessages(id, { before, limit: 30 });
      set((s) => {
        const list = s.messagesByTicket[id] || [];
        const ids = new Set(list.map((m) => String(m._id)));
        const merged = [...messages.filter((m) => !ids.has(String(m._id))), ...list];
        return {
          messagesByTicket: { ...s.messagesByTicket, [id]: merged },
          hasMoreByTicket: { ...s.hasMoreByTicket, [id]: !!hasMore },
          loadingOlderByTicket: { ...s.loadingOlderByTicket, [id]: false }
        };
      });
      return messages.length;
    } catch {
      set((s) => ({ loadingOlderByTicket: { ...s.loadingOlderByTicket, [id]: false } }));
      return 0;
    }
  },

  appendMessage: (ticketId, message) => {
    set((s) => {
      const cur = s.messagesByTicket[ticketId] || [];
      if (cur.some((m) => String(m._id) === String(message._id))) return s;
      return { messagesByTicket: { ...s.messagesByTicket, [ticketId]: [...cur, message] } };
    });
  },

  applyTicketRead: (ticketId, by, at) => {
    set((s) => {
      const list = s.messagesByTicket[ticketId];
      if (!list) return s;
      const stamp = at ? new Date(at) : new Date();
      const updated = list.map((m) => {
        if (by === 'staff' && m.senderRole === 'customer' && !m.readByStaffAt) {
          return { ...m, readByStaffAt: stamp };
        }
        if (by === 'customer' && m.senderRole === 'staff' && !m.readByCustomerAt) {
          return { ...m, readByCustomerAt: stamp };
        }
        return m;
      });
      return { messagesByTicket: { ...s.messagesByTicket, [ticketId]: updated } };
    });
  },

  setCustomerOnline: (ticketId, online) => set((s) => ({
    customerOnlineByTicket: { ...s.customerOnlineByTicket, [ticketId]: online }
  })),

  setCustomerTyping: (ticketId, typing) => set((s) => ({
    customerTypingByTicket: { ...s.customerTypingByTicket, [ticketId]: typing }
  }))
}));
