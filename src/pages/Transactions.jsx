import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowLeftRight, Wallet, Copy } from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';

const TYPE_LABELS = {
  deposit_cash: 'Пополнение (касса)',
  deposit_admin: 'Пополнение (админ)',
  withdraw_admin: 'Списание (админ)',
  order: 'Покупка'
};
const TYPE_COLORS = {
  deposit_cash: '#059669',
  deposit_admin: '#059669',
  withdraw_admin: '#ef4444',
  order: '#3b82f6'
};

const BALANCE_TYPES = ['deposit_cash', 'deposit_admin', 'withdraw_admin'];

const thStyle = {
  padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700',
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
  whiteSpace: 'nowrap', borderRight: '1px solid #d1d5db', background: '#f9fafb'
};
const tdStyle = {
  padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db',
  borderBottom: '1px solid #e5e7eb', verticalAlign: 'top', userSelect: 'text'
};

function CopyBtn({ value }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(value).then(() => toast.success('Скопировано')); }}
      title="Скопировать"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0 0.2rem', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
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
            style={{ padding: '0.3rem 0.65rem', borderRadius: '7px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', border: `1.5px solid ${active ? 'var(--primary)' : '#e5e7eb'}`, background: active ? 'var(--primary)' : 'white', color: active ? '#fff' : '#6b7280', transition: 'all 0.15s' }}>
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

function TransactionsTable({ balanceOnly }) {
  const [searchParams] = useSearchParams();
  const initSearch = searchParams.get('search') || '';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initSearch);
  const [search, setSearch] = useState(initSearch);
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (balanceOnly) {
        if (typeFilter && BALANCE_TYPES.includes(typeFilter)) params.set('type', typeFilter);
      } else {
        if (typeFilter) params.set('type', typeFilter);
      }
      const data = await api.get(`/customers/admin/transactions?${params}`);
      let txs = data.transactions || [];
      if (balanceOnly) {
        txs = txs.filter(t => BALANCE_TYPES.includes(t.type));
      }
      setItems(txs);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { toast.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  }, [search, typeFilter, startDate, endDate, balanceOnly]);

  useEffect(() => { fetchData(currentPage); }, [fetchData, currentPage]);

  const handleReset = () => {
    setSearchInput(''); setSearch(''); setTypeFilter('');
    setStartDate(''); setEndDate(''); setCurrentPage(1);
  };

  const typeOptions = balanceOnly
    ? BALANCE_TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }))
    : Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));

  return (
    <>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <form onSubmit={e => { e.preventDefault(); setCurrentPage(1); setSearch(searchInput); }} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 220 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Поиск по нику или UID клиента..."
                style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', color: '#374151', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Поиск</button>
            <button type="button" onClick={handleReset} style={{ padding: '0.55rem 0.875rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Сброс</button>
          </form>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontSize: '0.85rem', outline: 'none' }}>
            <option value="">Все типы</option>
            {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <DateQuickFilters startDate={startDate} endDate={endDate} onSet={(s, e) => { setStartDate(s); setEndDate(e); setCurrentPage(1); }} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {['UID транзакции', 'Клиент', 'Тип', 'Сумма', 'Комментарий', 'Дата'].map(h => (
                <th key={h} style={h === 'Дата' ? { ...thStyle, borderRight: 'none' } : thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Загрузка...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Транзакций нет</td></tr>
            ) : items.map(tx => (
              <tr key={tx._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>{tx.uid}</span>
                    {tx.uid && <CopyBtn value={tx.uid} />}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{tx.userId?.username || '—'}</div>
                  {tx.userId?.uid && (
                    <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                      {tx.userId.uid}<CopyBtn value={tx.userId.uid} />
                    </div>
                  )}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '20px',
                    fontSize: '0.72rem', fontWeight: '700',
                    background: (TYPE_COLORS[tx.type] || '#9ca3af') + '22',
                    color: TYPE_COLORS[tx.type] || '#9ca3af'
                  }}>
                    {TYPE_LABELS[tx.type] || tx.type}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: tx.amount >= 0 ? '#059669' : '#ef4444' }}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount?.toFixed(2)} {tx.currency || 'USD'}
                  </span>
                </td>
                <td style={{ ...tdStyle, maxWidth: '200px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#374151' }}>{tx.note || '—'}</span>
                </td>
                <td style={{ ...tdStyle, borderRight: 'none', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '0.8rem', color: '#374151' }}>{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(tx.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Стр. {currentPage} / {pages} · Всего {total}</span>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1, color: '#374151', fontWeight: '600' }}>‹</button>
          <button disabled={currentPage >= pages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: currentPage >= pages ? 'not-allowed' : 'pointer', opacity: currentPage >= pages ? 0.4 : 1, color: '#374151', fontWeight: '600' }}>›</button>
        </div>
      </div>
    </>
  );
}

const Transactions = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isBalanceHistory = location.pathname === '/balance-history';
  const tabs = [
    { key: 'transactions', label: 'Транзакции', path: '/transactions', icon: ArrowLeftRight },
    { key: 'balance', label: 'История баланса', path: '/balance-history', icon: Wallet },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
          {isBalanceHistory ? 'История баланса' : 'Транзакции'}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          {isBalanceHistory ? 'Пополнения и списания баланса клиентов' : 'Все финансовые транзакции системы'}
        </p>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', padding: '0 1.5rem', gap: '0' }}>
          {tabs.map(tab => {
            const active = location.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => navigate(tab.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.875rem 1.25rem', background: 'none', border: 'none',
                  borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: '-2px', color: active ? 'var(--primary)' : '#6b7280',
                  fontWeight: active ? '700' : '500', fontSize: '0.9rem', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <TransactionsTable key={location.pathname} balanceOnly={isBalanceHistory} />
      </div>
    </div>
  );
};

export default Transactions;
