import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useSupportStore } from '../stores/supportStore';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'https://banana-traff-shop.com').replace('/api/v3', '');

let sharedSocket = null;
let refCount = 0;

export function useSupportSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    refCount += 1;

    if (!sharedSocket) {
      sharedSocket = io(`${SOCKET_URL}/support`, {
        withCredentials: true,
        transports: ['polling']
      });
    }
    socketRef.current = sharedSocket;

    const store = useSupportStore.getState();

    const onTicketCreated = ({ ticket }) => store.upsertTicket(ticket);
    const onTicketUpdated = ({ ticket }) => store.upsertTicket(ticket);
    const onMessageNew = ({ message }) => {
      if (!message?.ticketId) return;
      const tid = String(message.ticketId);
      store.appendMessage(tid, message);
      const cur = useSupportStore.getState().tickets.find((t) => String(t._id) === tid);
      if (cur) {
        const isActive = useSupportStore.getState().activeTicketId === tid;
        const incFromCustomer = message.senderRole === 'customer' && !isActive;
        store.upsertTicket({
          ...cur,
          lastMessageAt: message.createdAt || new Date(),
          lastMessagePreview: message.text?.slice(0, 140) || (message.attachments?.length ? '📎' : ''),
          lastMessageBy: message.senderRole,
          unreadByStaff: incFromCustomer ? (cur.unreadByStaff || 0) + 1 : (cur.unreadByStaff || 0)
        });
      }
      store.refreshUnreadCount();
    };
    const onTicketRead = ({ ticketId, by, at }) => store.applyTicketRead(String(ticketId), by, at);
    const onTicketClosed = ({ ticketId }) => {
      const cur = useSupportStore.getState().tickets.find((t) => String(t._id) === String(ticketId));
      if (cur) store.upsertTicket({ ...cur, status: 'closed' });
    };
    const onPresence = ({ ticketId, role, online }) => {
      if (role === 'customer') store.setCustomerOnline(String(ticketId), !!online);
    };
    const onTyping = ({ ticketId, by, typing }) => {
      if (by === 'customer') store.setCustomerTyping(String(ticketId), !!typing);
    };

    sharedSocket.on('ticket:created', onTicketCreated);
    sharedSocket.on('ticket:updated', onTicketUpdated);
    sharedSocket.on('message:new', onMessageNew);
    sharedSocket.on('ticket:read', onTicketRead);
    sharedSocket.on('ticket:closed', onTicketClosed);
    sharedSocket.on('presence', onPresence);
    sharedSocket.on('ticket:typing', onTyping);

    return () => {
      sharedSocket?.off('ticket:created', onTicketCreated);
      sharedSocket?.off('ticket:updated', onTicketUpdated);
      sharedSocket?.off('message:new', onMessageNew);
      sharedSocket?.off('ticket:read', onTicketRead);
      sharedSocket?.off('ticket:closed', onTicketClosed);
      sharedSocket?.off('presence', onPresence);
      sharedSocket?.off('ticket:typing', onTyping);
      refCount = Math.max(0, refCount - 1);
      if (refCount === 0) {
        sharedSocket?.disconnect();
        sharedSocket = null;
      }
    };
  }, [isAuthenticated]);

  return socketRef;
}

export const supportEmit = (event, payload) => {
  if (sharedSocket?.connected) sharedSocket.emit(event, payload);
};
