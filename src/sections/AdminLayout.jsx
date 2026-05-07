import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../stores/authStore';
import { LogOut, User as UserIcon, Bell, Search, X, CheckCheck, Trash2 } from 'lucide-react';
import api from '../api/client';
import { io as socketIO } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'https://banana-traff-shop.com').replace('/api/v3', '');

const CATEGORY_LABELS = {
  transaction: 'Транзакции',
  user: 'Пользователи',
  order: 'Покупки',
  preorder: 'Предзаказы',
  replacement: 'Замены',
  support: 'Поддержка'
};

function NotifPopup({ onClose }) {
  const [tab, setTab] = useState('unread');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const ref = useRef(null);

  const load = useCallback(async (pg = 1, isRead = undefined) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 20 });
      if (isRead !== undefined) params.set('isRead', String(isRead));
      const data = await api.get(`/admin-notifications?${params}`);
      setItems(data.items || []);
      setPages(data.pages || 1);
      setPage(pg);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load(1, tab === 'unread' ? false : tab === 'read' ? true : undefined);
  }, [tab, load]);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const markAll = async () => {
    await api.request('/admin-notifications/mark-all-read', { method: 'PATCH' });
    load(1, tab === 'unread' ? false : tab === 'read' ? true : undefined);
  };

  const clearAll = async () => {
    await api.request('/admin-notifications/clear', { method: 'DELETE' });
    load(1, tab === 'unread' ? false : tab === 'read' ? true : undefined);
  };

  const markOne = async (id) => {
    await api.request(`/admin-notifications/${id}/read`, { method: 'PATCH' });
    setItems(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const fmt = (d) => new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
      width: '400px', maxHeight: '540px',
      background: 'white', borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      border: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column',
      zIndex: 100, overflow: 'hidden'
    }}>
      <div style={{ padding: '1rem 1.25rem 0', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111' }}>Уведомления</span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={markAll} title="Прочитать все" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.73rem', fontWeight: '600', padding: '0.25rem 0.5rem', borderRadius: '6px', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <CheckCheck size={14} /> Прочитать все
            </button>
            <button onClick={clearAll} title="Очистить" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.73rem', fontWeight: '600', padding: '0.25rem 0.5rem', borderRadius: '6px', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <Trash2 size={14} /> Очистить
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[['unread', 'Непрочитанные'], ['read', 'Прочитанные'], ['all', 'Все']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '0.45rem 0', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: '700',
              color: tab === key ? 'var(--primary)' : '#9ca3af',
              borderBottom: `2px solid ${tab === key ? 'var(--primary)' : 'transparent'}`,
              transition: 'all 0.15s'
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '0.85rem' }}>Загрузка...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '0.85rem' }}>Нет уведомлений</div>
        ) : items.map(n => (
          <div key={n._id}
            onClick={() => !n.isRead && markOne(n._id)}
            style={{
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid #f3f4f6',
              background: n.isRead ? 'white' : '#fafbff',
              cursor: n.isRead ? 'default' : 'pointer',
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              transition: 'background 0.1s'
            }}
            onMouseEnter={e => { if (!n.isRead) e.currentTarget.style.background = '#f0f4ff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = n.isRead ? 'white' : '#fafbff'; }}
          >
            {!n.isRead && (
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: '5px' }} />
            )}
            <div style={{ flex: 1, minWidth: 0, marginLeft: n.isRead ? '16px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111', lineHeight: 1.3 }}>{n.title}</span>
                <span style={{ fontSize: '0.68rem', color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmt(n.createdAt)}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem', lineHeight: 1.4 }}>{n.message}</div>
              <span style={{ display: 'inline-block', marginTop: '0.25rem', fontSize: '0.65rem', fontWeight: '600', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#f3f4f6', color: '#6b7280', textTransform: 'uppercase' }}>
                {CATEGORY_LABELS[n.category] || n.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div style={{ padding: '0.6rem 1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => load(p, tab === 'unread' ? false : tab === 'read' ? true : undefined)}
              style={{ padding: '0.2rem 0.5rem', borderRadius: '5px', border: `1px solid ${p === page ? 'var(--primary)' : '#e5e7eb'}`, background: p === page ? 'var(--primary)' : 'white', color: p === page ? 'white' : '#374151', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const AdminLayout = () => {
  const { user, logout, checkAuth, isAuthenticated, authChecked } = useAuthStore();
  const navigate = useNavigate();
  const [bellOpen, setBellOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef(null);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (authChecked && !isAuthenticated) navigate('/login');
  }, [authChecked, isAuthenticated, navigate]);

  const fetchCount = useCallback(async () => {
    try {
      const d = await api.get('/admin-notifications/count');
      setUnreadCount(d.unreadCount || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCount();
    const socket = socketIO(`${SOCKET_URL}/admin`, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    socket.on('admin_notification', (data) => {
      if (data.unreadCount !== undefined) setUnreadCount(data.unreadCount);
      else setUnreadCount(prev => prev + 1);
    });
    return () => socket.disconnect();
  }, [isAuthenticated, fetchCount]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-content)', color: 'var(--text-main)' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-content)' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '280px', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          height: '72px', backgroundColor: 'white', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 2.5rem',
          borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" placeholder="Поиск по системе..."
              style={{ padding: '0.625rem 1rem 0.625rem 2.5rem', fontSize: '0.875rem', backgroundColor: '#f3f4f6', border: 'none', width: '100%' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setBellOpen(v => !v); if (!bellOpen) fetchCount(); }}
                style={{ backgroundColor: 'transparent', padding: '0.5rem', color: '#6b7280', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '0px', right: '0px',
                    background: '#ef4444', color: 'white',
                    fontSize: '0.6rem', fontWeight: '800',
                    minWidth: '16px', height: '16px',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', lineHeight: 1,
                    border: '2px solid white'
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <NotifPopup onClose={() => { setBellOpen(false); fetchCount(); }} />
              )}
            </div>

            <div style={{ height: '24px', width: '1px', backgroundColor: '#e5e7eb' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.9375rem', color: 'var(--text-main)', fontWeight: '600' }}>{user?.username}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '500', textTransform: 'uppercase' }}>{user?.role}</span>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--bg-header)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <UserIcon size={20} />
              </div>
            </div>

            <button onClick={handleLogout} title="Выйти"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#ef4444', padding: 0, border: 'none', cursor: 'pointer' }}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main style={{ flex: 1, padding: '2.5rem', color: 'var(--text-main)', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
