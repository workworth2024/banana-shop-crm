import { useState, useEffect, useCallback } from 'react';
import { Trash2, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Search, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPreorders, updatePreorderStatus, deletePreorder } from '../api/preorders';
import { useAuthStore } from '../stores/authStore';

const STATUS_CFG = {
  pending:   { bg: '#fef3c7', color: '#92400e', label: 'В обработке' },
  completed: { bg: '#d1fae5', color: '#065f46', label: 'Выполнен' },
  canceled:  { bg: '#fee2e2', color: '#991b1b', label: 'Отменён' },
};

const thStyle = {
  padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700',
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
  whiteSpace: 'nowrap', borderRight: '1px solid #d1d5db', background: '#f9fafb',
  userSelect: 'none'
};
const tdStyle = {
  padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db',
  borderBottom: '1px solid #e5e7eb', verticalAlign: 'top', userSelect: 'text'
};

function CopyBtn({ value }) {
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => toast.success('Скопировано'));
  };
  return (
    <button
      onClick={handleCopy}
      title="Скопировать"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0 0.2rem', display: 'inline-flex', alignItems: 'center' }}
    >
      <Copy size={11} />
    </button>
  );
}

function DateQuickFilters({ startDate, endDate, onSet }) {
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const presets = [
    { label: 'Сегодня', s: fmt(today), e: fmt(today) },
    { label: 'Вчера', s: fmt(new Date(today - 86400000)), e: fmt(new Date(today - 86400000)) },
    { label: '7 дней', s: fmt(new Date(today - 6 * 86400000)), e: fmt(today) },
    { label: 'Месяц', s: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), e: fmt(today) },
  ];
  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {presets.map(p => {
        const active = startDate === p.s && endDate === p.e;
        return (
          <button key={p.label} type="button"
            onClick={() => active ? onSet('', '') : onSet(p.s, p.e)}
            style={{ padding: '0.3rem 0.65rem', borderRadius: '7px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', border: `1.5px solid ${active ? 'var(--primary)' : '#e5e7eb'}`, background: active ? 'var(--primary)' : 'white', color: active ? '#fff' : '#6b7280' }}>
            {p.label}
          </button>
        );
      })}
      <input type="date" value={startDate} onChange={e => onSet(e.target.value, endDate)}
        style={{ padding: '0.28rem 0.5rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', fontSize: '0.78rem', color: '#374151', outline: 'none' }} />
      <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>—</span>
      <input type="date" value={endDate} onChange={e => onSet(startDate, e.target.value)}
        style={{ padding: '0.28rem 0.5rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', fontSize: '0.78rem', color: '#374151', outline: 'none' }} />
    </div>
  );
}

const Preorders = () => {
  const [preorders, setPreorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const fetchPreorders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const data = await getPreorders(params);
      setPreorders(data.preorders || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, startDate, endDate]);

  useEffect(() => { fetchPreorders(currentPage); }, [fetchPreorders, currentPage]);

  const handleStatusChange = async (id, status) => {
    try {
      await updatePreorderStatus(id, status);
      fetchPreorders(currentPage);
      toast.success(status === 'completed' ? 'Выполнен' : 'Отменён');
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить предзаказ?')) return;
    try {
      await deletePreorder(id);
      fetchPreorders(currentPage);
      toast.success('Удалён');
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    }
  };

  const handleReset = () => {
    setSearchInput(''); setSearch(''); setStatusFilter(''); setStartDate(''); setEndDate(''); setCurrentPage(1);
  };

  const getProductTitle = (p) => {
    if (!p?.google_item_id) return '—';
    const t = p.google_item_id.title;
    return t?.ru || t?.en || '—';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 0.25rem' }}>Предзаказы</h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Заявки на товары не в наличии</p>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <form onSubmit={e => { e.preventDefault(); setCurrentPage(1); setSearch(searchInput); }} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 240 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Поиск по имени, Telegram, товару..." style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Поиск</button>
              <button type="button" onClick={handleReset} style={{ padding: '0.55rem 0.875rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Сброс</button>
            </form>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'white', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}>
              <option value="">Все статусы</option>
              <option value="pending">В обработке</option>
              <option value="completed">Выполненные</option>
              <option value="canceled">Отменённые</option>
            </select>
          </div>
          <DateQuickFilters startDate={startDate} endDate={endDate} onSet={(s, e) => { setStartDate(s); setEndDate(e); setCurrentPage(1); }} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                {['ID', 'Имя', 'Telegram', 'Товар', 'Кол-во', 'Комментарий', 'Статус', 'Дата', 'Действия'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Загрузка...</td></tr>
              ) : preorders.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Предзаказов нет</td></tr>
              ) : preorders.map(p => {
                const cfg = STATUS_CFG[p.status] || {};
                return (
                  <tr key={p._id}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#6b7280' }}>{p._id.slice(-8)}</span>
                      <CopyBtn value={p._id} />
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{p.name}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.82rem', color: '#374151' }}>@{p.telegram?.replace(/^@/, '') || '—'}</span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: '200px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getProductTitle(p)}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <strong>{p.desired_quantity || 1}</strong>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: '200px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#374151', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.comment || '—'}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.73rem', fontWeight: '700', background: cfg.bg, color: cfg.color }}>{cfg.label || p.status}</span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.8rem', color: '#374151' }}>{new Date(p.createdAt).toLocaleDateString('ru-RU')}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(p.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td style={{ ...tdStyle, borderRight: 'none' }}>
                      {canManage && (
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button onClick={() => handleStatusChange(p._id, 'completed')} disabled={p.status === 'completed'} title="Выполнен" style={{ padding: '0.35rem', borderRadius: '7px', border: '1.5px solid #d1fae5', background: '#ecfdf5', cursor: p.status === 'completed' ? 'not-allowed' : 'pointer', color: '#065f46', opacity: p.status === 'completed' ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
                            <CheckCircle size={13} />
                          </button>
                          <button onClick={() => handleStatusChange(p._id, 'canceled')} disabled={p.status === 'canceled'} title="Отменить" style={{ padding: '0.35rem', borderRadius: '7px', border: '1.5px solid #fee2e2', background: '#fff5f5', cursor: p.status === 'canceled' ? 'not-allowed' : 'pointer', color: '#ef4444', opacity: p.status === 'canceled' ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
                            <XCircle size={13} />
                          </button>
                          <button onClick={() => handleDelete(p._id)} title="Удалить" style={{ padding: '0.35rem', borderRadius: '7px', border: '1.5px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Стр. {currentPage} / {pages} · Всего {total}</span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1, color: 'var(--text-main)', fontWeight: '600' }}>‹</button>
            <button disabled={currentPage >= pages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: currentPage >= pages ? 'not-allowed' : 'pointer', opacity: currentPage >= pages ? 0.4 : 1, color: 'var(--text-main)', fontWeight: '600' }}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preorders;
