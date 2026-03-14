import { useState, useEffect, useCallback } from 'react';
import { Trash2, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Search, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPreorders, updatePreorderStatus, deletePreorder } from '../api/preorders';
import { useAuthStore } from '../stores/authStore';

const StatusBadge = ({ status }) => {
  const cfg = {
    pending:   { bg: 'rgba(234,179,8,0.1)',  color: '#92400e', border: 'rgba(234,179,8,0.3)',   icon: <Clock size={12} />,        label: 'В обработке' },
    completed: { bg: 'rgba(16,185,129,0.1)', color: '#065f46', border: 'rgba(16,185,129,0.3)',  icon: <CheckCircle size={12} />,  label: 'Выполнен' },
    canceled:  { bg: 'rgba(239,68,68,0.1)',  color: '#991b1b', border: 'rgba(239,68,68,0.3)',   icon: <XCircle size={12} />,      label: 'Отменён' },
  }[status] || {};
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
      backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
    }}>
      {cfg.icon}{cfg.label}
    </span>
  );
};

const Preorders = () => {
  const [preorders, setPreorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const fetchPreorders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 20, search });
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const data = await getPreorders(params);
      setPreorders(data.preorders);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Fetch preorders error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, startDate, endDate]);

  useEffect(() => { fetchPreorders(); }, [fetchPreorders]);

  const handleStatusChange = async (id, status) => {
    try {
      await updatePreorderStatus(id, status);
      fetchPreorders();
      toast.success(status === 'completed' ? 'Отмечен как выполненный' : 'Предзаказ отменён');
    } catch (err) {
      toast.error(err.message || 'Ошибка обновления статуса');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить предзаказ?')) return;
    try {
      await deletePreorder(id);
      fetchPreorders();
      toast.success('Предзаказ удалён');
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getProductTitle = (p) => {
    if (!p?.google_item_id) return '—';
    const t = p.google_item_id.title;
    return t?.ru || t?.en || '—';
  };

  const statusOptions = [
    { value: '', label: 'Все' },
    { value: 'pending', label: 'В обработке' },
    { value: 'completed', label: 'Выполненные' },
    { value: 'canceled', label: 'Отменённые' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Предзаказы</h1>
        <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>Заявки на товары не в наличии</p>
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Поиск по имени или Telegram..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setCurrentPage(1); }}
              style={{
                padding: '0.5rem 1rem', fontSize: '0.8125rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600',
                backgroundColor: statusFilter === opt.value ? '#374151' : '#f3f4f6',
                color: statusFilter === opt.value ? 'white' : '#4b5563'
              }}
            >
              {opt.label}
            </button>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <Calendar size={16} style={{ color: '#9ca3af' }} />
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} style={{ padding: '0.5rem', width: 'auto' }} />
            <span style={{ color: '#9ca3af' }}>—</span>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} style={{ padding: '0.5rem', width: 'auto' }} />
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Сбросить
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</div>
        ) : preorders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Предзаказов нет</div>
        ) : (
          preorders.map((p, idx) => (
            <div key={p._id} style={{ borderBottom: idx < preorders.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', cursor: 'pointer', transition: 'background-color 0.15s' }}
                onClick={() => setExpandedId(expandedId === p._id ? null : p._id)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9375rem', color: 'var(--text-main)' }}>{p.name}</span>
                    <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>@{p.telegram.replace(/^@/, '')}</span>
                    <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontStyle: 'italic' }}>{getProductTitle(p)}</span>
                    <span style={{ fontSize: '0.8125rem', color: '#374151', fontWeight: '600' }}>×{p.desired_quantity}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                    {p._id.slice(-8)} · {formatDate(p.createdAt)}
                  </div>
                </div>

                {canManage && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleStatusChange(p._id, 'completed')}
                      disabled={p.status === 'completed'}
                      title="Выполнен"
                      style={{ padding: '0.5rem', backgroundColor: p.status === 'completed' ? '#d1fae5' : 'rgba(16,185,129,0.1)', color: '#065f46', borderRadius: '8px', border: 'none', cursor: p.status === 'completed' ? 'default' : 'pointer', opacity: p.status === 'completed' ? 0.5 : 1 }}
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={() => handleStatusChange(p._id, 'canceled')}
                      disabled={p.status === 'canceled'}
                      title="Отменить"
                      style={{ padding: '0.5rem', backgroundColor: p.status === 'canceled' ? '#fee2e2' : 'rgba(239,68,68,0.1)', color: '#991b1b', borderRadius: '8px', border: 'none', cursor: p.status === 'canceled' ? 'default' : 'pointer', opacity: p.status === 'canceled' ? 0.5 : 1 }}
                    >
                      <XCircle size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p._id)}
                      title="Удалить"
                      style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {expandedId === p._id && (
                <div style={{ padding: '0 1.5rem 1.25rem 1.5rem', backgroundColor: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                      <b>ID товара:</b> {p.google_item_id?._id || '—'}
                    </div>
                    {p.comment && (
                      <div style={{ fontSize: '0.9375rem', color: '#374151', whiteSpace: 'pre-wrap' }}>
                        <b>Комментарий:</b> {p.comment}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Всего: <b>{total}</b></div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: currentPage === 1 ? '#d1d5db' : '#374151', borderRadius: '8px', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{currentPage} / {pages || 1}</span>
            <button disabled={currentPage === pages || pages === 0} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: (currentPage === pages || pages === 0) ? '#d1d5db' : '#374151', borderRadius: '8px', border: 'none', cursor: (currentPage === pages || pages === 0) ? 'not-allowed' : 'pointer' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preorders;
