import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { GitBranch, Save, ChevronDown, ChevronUp, Search, X, Plus, Trash2, Check, Pencil } from 'lucide-react';

const card = {
  background: 'white', borderRadius: '16px', padding: '1.5rem',
  border: '1px solid #e5e7eb', marginBottom: '1.25rem',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
};

const PERIODS = [
  { value: 'all', label: 'Всё время' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' }
];

const ORDER_TYPE_LABELS = {
  order: 'Заказ',
  preorder: 'Предзаказ',
  service_order: 'Услуга'
};

function SettingsPanel({ settings, onSave, saving }) {
  const [local, setLocal] = useState(settings);
  useEffect(() => { setLocal(settings); }, [settings]);

  const FIELDS = [
    { key: 'googleAds', label: 'Google Ads товары / предзаказы, %' },
    { key: 'youtube', label: 'YouTube товары / предзаказы, %' },
    { key: 'services', label: 'Услуги, %' }
  ];

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 1.25rem', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <GitBranch size={18} /> Настройки процентов
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem', maxWidth: '520px' }}>
        {FIELDS.map(f => (
          <label
            key={f.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'nowrap',
              padding: '0.6rem 0.85rem',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '10px'
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', flex: '1 1 auto', minWidth: 0 }}>
              {f.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '0 0 auto' }}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={local[f.key] ?? ''}
                onChange={e => setLocal(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{
                  width: '88px', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '0.9rem', outline: 'none', textAlign: 'right',
                  background: '#fff'
                }}
              />
              <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>%</span>
            </div>
          </label>
        ))}
      </div>
      <button
        onClick={() => onSave(local)}
        disabled={saving}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: '#f59e0b', color: '#fff', border: 'none',
          borderRadius: '10px', padding: '0.6rem 1.25rem',
          fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
        }}
      >
        <Save size={15} /> {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  );
}

function ReferrerRow({ row, onExpand, expanded }) {
  return (
    <>
      <tr
        onClick={onExpand}
        style={{ cursor: 'pointer', background: expanded ? '#fef9ec' : 'transparent' }}
      >
        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
          {row.username}
          {row.telegramUsername && <span style={{ color: '#2563eb', fontWeight: 400, marginLeft: '0.4rem', fontSize: '0.82rem' }}>@{row.telegramUsername}</span>}
        </td>
        <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.82rem', fontFamily: 'monospace' }}>{row.uid}</td>
        <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.82rem', fontFamily: 'monospace' }}>{row.referralCode}</td>
        <td style={{ padding: '0.75rem 1rem', color: '#374151', textAlign: 'center' }}>{row.referralCount}</td>
        <td style={{ padding: '0.75rem 1rem', color: '#374151', textAlign: 'center' }}>{row.purchaseCount}</td>
        <td style={{ padding: '0.75rem 1rem', color: '#16a34a', fontWeight: 700 }}>${(row.totalEarned || 0).toFixed(2)}</td>
        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: 0 }}>
            <ReferrerDetail id={row._id} />
          </td>
        </tr>
      )}
    </>
  );
}

function ReferrerDetail({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get(`/referral/referrers/${id}?page=${page}&limit=10`);
      setData(d);
    } catch {
      toast.error('Ошибка загрузки деталей');
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af' }}>Загрузка...</div>;
  if (!data) return null;

  const { referrer, summary, transactions, referrals, pages } = data;

  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0 0 12px 12px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.75rem 1.25rem', minWidth: '120px' }}>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, marginBottom: '0.25rem' }}>НАЧИСЛЕНО</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a' }}>${(summary.active?.total || 0).toFixed(2)}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{summary.active?.count || 0} начислений</div>
        </div>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.75rem 1.25rem', minWidth: '120px' }}>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, marginBottom: '0.25rem' }}>ВОЗВРАТЫ</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>-${(summary.clawedBack?.total || 0).toFixed(2)}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{summary.clawedBack?.count || 0} возвратов</div>
        </div>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.75rem 1.25rem', minWidth: '120px' }}>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, marginBottom: '0.25rem' }}>РЕФЕРАЛОВ</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e40af' }}>{referrals?.length || 0}</div>
        </div>
      </div>

      {referrals?.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Приглашённые пользователи</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {referrals.map(u => (
              <span key={u._id} style={{ background: '#eff6ff', color: '#1e40af', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.78rem', fontWeight: 500 }}>
                {u.username}
                {u.telegramUsername ? ` (@${u.telegramUsername})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>История начислений</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: '#9ca3af', fontWeight: 500 }}>Реферал</th>
            <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: '#9ca3af', fontWeight: 500 }}>Тип</th>
            <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: '#9ca3af', fontWeight: 500 }}>UID</th>
            <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', color: '#9ca3af', fontWeight: 500 }}>Сумма заказа</th>
            <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', color: '#9ca3af', fontWeight: 500 }}>%</th>
            <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', color: '#9ca3af', fontWeight: 500 }}>Начислено</th>
            <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: '#9ca3af', fontWeight: 500 }}>Статус</th>
            <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: '#9ca3af', fontWeight: 500 }}>Дата</th>
          </tr>
        </thead>
        <tbody>
          {transactions?.map(tx => (
            <tr key={tx._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '0.4rem 0.75rem' }}>{tx.referralId?.username || '—'}</td>
              <td style={{ padding: '0.4rem 0.75rem', color: '#6b7280' }}>{ORDER_TYPE_LABELS[tx.orderType] || tx.orderType}</td>
              <td style={{ padding: '0.4rem 0.75rem', fontFamily: 'monospace', color: '#6b7280' }}>{tx.orderUid || '—'}</td>
              <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right' }}>${(tx.orderAmount || 0).toFixed(2)}</td>
              <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right', color: '#6b7280' }}>{tx.rewardPercent}%</td>
              <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right', fontWeight: 700, color: tx.status === 'active' ? '#16a34a' : '#ef4444' }}>
                {tx.status === 'clawed_back' ? '-' : '+'}${(tx.rewardAmount || 0).toFixed(2)}
              </td>
              <td style={{ padding: '0.4rem 0.75rem' }}>
                <span style={{
                  padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                  background: tx.status === 'active' ? '#dcfce7' : '#fee2e2',
                  color: tx.status === 'active' ? '#15803d' : '#b91c1c'
                }}>
                  {tx.status === 'active' ? 'Активно' : 'Возврат'}
                </span>
              </td>
              <td style={{ padding: '0.4rem 0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                {new Date(tx.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>→</button>
        </div>
      )}
    </div>
  );
}

const RATE_FIELDS = [
  { key: 'googleAds', label: 'GA', fullLabel: 'Google Ads' },
  { key: 'youtube', label: 'YT', fullLabel: 'YouTube' },
  { key: 'services', label: 'Сер.', fullLabel: 'Услуги' }
];

function RateBadge({ value, defaultLabel = 'базовый' }) {
  const isSet = value !== null && value !== undefined;
  return (
    <span style={{
      display: 'inline-block', minWidth: '44px', textAlign: 'center',
      padding: '0.18rem 0.55rem', borderRadius: '20px', fontWeight: 700, fontSize: '0.82rem',
      background: isSet ? '#fef9ec' : '#f3f4f6',
      color: isSet ? '#b45309' : '#9ca3af',
      border: `1px solid ${isSet ? '#fde68a' : '#e5e7eb'}`
    }}>
      {isSet ? `${value}%` : defaultLabel}
    </span>
  );
}

function IndividualRatesPanel({ globalSettings }) {
  const [rates, setRates] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState([]);
  const [addTarget, setAddTarget] = useState(null);
  const [addValues, setAddValues] = useState({ googleAds: '', youtube: '', services: '' });
  const [addSaving, setAddSaving] = useState(false);
  const searchTimer = useRef(null);

  const loadRates = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: p, limit: 20 }).toString();
      const d = await api.get(`/referral/customer-rates?${params}`);
      setRates(d.rates || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
    } catch {
      toast.error('Ошибка загрузки индивидуальных ставок');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadRates(page); }, [search, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const startEdit = (row) => {
    setEditingId(String(row.customerId));
    setEditValues({ googleAds: row.googleAds ?? '', youtube: row.youtube ?? '', services: row.services ?? '' });
  };

  const cancelEdit = () => { setEditingId(null); setEditValues({}); };

  const saveEdit = async (customerId) => {
    setSaving(true);
    try {
      const body = {
        googleAds: editValues.googleAds === '' ? null : Number(editValues.googleAds),
        youtube: editValues.youtube === '' ? null : Number(editValues.youtube),
        services: editValues.services === '' ? null : Number(editValues.services)
      };
      const updated = await api.put(`/referral/customer-rates/${customerId}`, body);
      setRates(prev => prev.map(r => String(r.customerId) === String(customerId) ? { ...r, ...updated } : r));
      setEditingId(null);
      toast.success('Ставка сохранена');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const deleteRate = async (customerId, username) => {
    if (!window.confirm(`Сбросить индивидуальную ставку для ${username}? Будет применяться базовая.`)) return;
    try {
      await api.delete(`/referral/customer-rates/${customerId}`);
      setRates(prev => prev.filter(r => String(r.customerId) !== String(customerId)));
      setTotal(t => t - 1);
      toast.success('Ставка сброшена до базовой');
    } catch {
      toast.error('Ошибка');
    }
  };

  const handleAddQueryChange = (val) => {
    setAddQuery(val);
    setAddTarget(null);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setAddResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await api.get(`/referral/customer-rates/search?q=${encodeURIComponent(val.trim())}`);
        setAddResults(Array.isArray(results) ? results : []);
      } catch { setAddResults([]); }
    }, 320);
  };

  const selectAddTarget = (user) => {
    setAddTarget(user);
    setAddQuery(user.username);
    setAddResults([]);
  };

  const saveAdd = async () => {
    if (!addTarget) return;
    setAddSaving(true);
    try {
      const body = {
        googleAds: addValues.googleAds === '' ? null : Number(addValues.googleAds),
        youtube: addValues.youtube === '' ? null : Number(addValues.youtube),
        services: addValues.services === '' ? null : Number(addValues.services)
      };
      const created = await api.put(`/referral/customer-rates/${addTarget._id}`, body);
      setRates(prev => {
        const exists = prev.find(r => String(r.customerId) === String(addTarget._id));
        if (exists) return prev.map(r => String(r.customerId) === String(addTarget._id) ? { ...r, ...created } : r);
        return [created, ...prev];
      });
      setTotal(t => t + 1);
      setShowAdd(false);
      setAddQuery('');
      setAddTarget(null);
      setAddValues({ googleAds: '', youtube: '', services: '' });
      toast.success(`Ставка назначена для ${addTarget.username}`);
    } catch {
      toast.error('Ошибка');
    } finally {
      setAddSaving(false);
    }
  };

  const inputStyle = {
    width: '70px', padding: '0.3rem 0.4rem', border: '1.5px solid #fde68a',
    borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center', outline: 'none',
    background: '#fffbeb'
  };

  return (
    <div style={{ ...card, marginBottom: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Индивидуальные ставки</h3>
        <button
          onClick={() => { setShowAdd(s => !s); setAddQuery(''); setAddTarget(null); setAddResults([]); setAddValues({ googleAds: '', youtube: '', services: '' }); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', background: showAdd ? '#f3f4f6' : '#f59e0b', color: showAdd ? '#374151' : '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
        >
          {showAdd ? <X size={14} /> : <Plus size={14} />}
          {showAdd ? 'Отмена' : 'Добавить'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', marginBottom: '0.6rem' }}>Назначить индивидуальную ставку</div>
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <input
              value={addQuery}
              onChange={e => handleAddQueryChange(e.target.value)}
              placeholder="Поиск клиента по UID или username..."
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
            {addResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
                {addResults.map(u => (
                  <div key={u._id} onClick={() => selectAddTarget(u)} style={{ padding: '0.55rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <span style={{ fontWeight: 600 }}>{u.username}</span>
                    {u.telegramUsername && <span style={{ color: '#6b7280', marginLeft: '0.4rem' }}>@{u.telegramUsername}</span>}
                    <span style={{ fontFamily: 'monospace', color: '#9ca3af', marginLeft: '0.4rem', fontSize: '0.78rem' }}>{u.uid}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {addTarget && (
            <>
              <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '0.5rem', fontWeight: 600 }}>
                Клиент: <span style={{ color: '#b45309' }}>{addTarget.username}</span> <span style={{ fontFamily: 'monospace', color: '#9ca3af', fontSize: '0.75rem' }}>({addTarget.uid})</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {RATE_FIELDS.map(f => (
                  <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 600, color: '#6b7280' }}>
                    {f.fullLabel}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input type="number" min="0" max="100" step="0.5" placeholder={String(globalSettings?.[f.key] ?? '')} value={addValues[f.key]} onChange={e => setAddValues(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>%</span>
                    </div>
                  </label>
                ))}
              </div>
              <button onClick={saveAdd} disabled={addSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                <Check size={14} /> {addSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Поиск по UID, username или % (напр. 10)..." style={{ width: '100%', padding: '0.42rem 0.75rem 0.42rem 2rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button type="submit" style={{ padding: '0.42rem 0.8rem', background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Search size={13} /></button>
        {search && <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} style={{ padding: '0.42rem 0.6rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><X size={13} /></button>}
      </form>

      <div style={{ flex: 1, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Загрузка...</div>
        ) : rates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
            {search ? 'Ничего не найдено' : 'Нет индивидуальных ставок'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                <th style={{ padding: '0.55rem 0.6rem', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>UID</th>
                <th style={{ padding: '0.55rem 0.6rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Username</th>
                <th style={{ padding: '0.55rem 0.6rem', textAlign: 'center', fontWeight: 600, color: '#16a085', whiteSpace: 'nowrap' }}>GA %</th>
                <th style={{ padding: '0.55rem 0.6rem', textAlign: 'center', fontWeight: 600, color: '#c0392b', whiteSpace: 'nowrap' }}>YT %</th>
                <th style={{ padding: '0.55rem 0.6rem', textAlign: 'center', fontWeight: 600, color: '#8e44ad', whiteSpace: 'nowrap' }}>Сер. %</th>
                <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontWeight: 600, color: '#374151' }}></th>
              </tr>
            </thead>
            <tbody>
              {rates.map(row => {
                const isEditing = editingId === String(row.customerId);
                return (
                  <tr key={String(row.customerId)} style={{ borderBottom: '1px solid #f3f4f6', background: isEditing ? '#fffbeb' : 'transparent' }}>
                    <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'monospace', color: '#9ca3af', fontSize: '0.75rem' }}>{row.uid}</td>
                    <td style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>
                      {row.username}
                      {row.telegramUsername && <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '0.78rem', marginLeft: '0.3rem' }}>@{row.telegramUsername}</span>}
                    </td>
                    {isEditing ? (
                      <>
                        {RATE_FIELDS.map(f => (
                          <td key={f.key} style={{ padding: '0.4rem 0.4rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center' }}>
                              <input type="number" min="0" max="100" step="0.5" placeholder={String(globalSettings?.[f.key] ?? '')} value={editValues[f.key]} onChange={e => setEditValues(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...inputStyle, width: '60px' }} />
                              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>%</span>
                            </div>
                          </td>
                        ))}
                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => saveEdit(row.customerId)} disabled={saving} style={{ padding: '0.3rem 0.55rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Check size={12} /></button>
                            <button onClick={cancelEdit} style={{ padding: '0.3rem 0.55rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={12} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        {RATE_FIELDS.map(f => (
                          <td key={f.key} style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>
                            <RateBadge value={row[f.key]} />
                          </td>
                        ))}
                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => startEdit(row)} style={{ padding: '0.3rem 0.55rem', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Редактировать"><Pencil size={12} /></button>
                            <button onClick={() => deleteRate(row.customerId, row.username)} style={{ padding: '0.3rem 0.55rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Сбросить"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginTop: '0.85rem' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.35rem 0.65rem', borderRadius: '7px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{page} / {pages} · {total} всего</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.35rem 0.65rem', borderRadius: '7px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>→</button>
        </div>
      )}
    </div>
  );
}

export default function Referral() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [referrers, setReferrers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 900);
  const [activeTab, setActiveTab] = useState('global');

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    api.get('/referral/settings').then(d => setSettings(d)).catch(() => {});
  }, []);

  const loadReferrers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, search, page, limit: 20 }).toString();
      const d = await api.get(`/referral/referrers?${params}`);
      setReferrers(d.referrers || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
    } catch {
      toast.error('Ошибка загрузки рефоводов');
    } finally {
      setLoading(false);
    }
  }, [period, search, page]);

  useEffect(() => { loadReferrers(); }, [loadReferrers]);

  const handleSaveSettings = async (vals) => {
    setSaving(true);
    try {
      const d = await api.put('/referral/settings', {
        googleAds: Number(vals.googleAds),
        youtube: Number(vals.youtube),
        services: Number(vals.services)
      });
      setSettings(d);
      toast.success('Настройки сохранены');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
    setExpandedId(null);
  };

  const tabBtn = (tab, label) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        flex: 1, padding: '0.55rem 0.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', border: '1.5px solid',
        borderColor: activeTab === tab ? '#f59e0b' : '#e5e7eb',
        background: activeTab === tab ? '#fef9ec' : 'white',
        color: activeTab === tab ? '#b45309' : '#6b7280'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <GitBranch size={24} style={{ color: '#f59e0b' }} />
        <h1 style={{ margin: 0, fontWeight: 700, fontSize: '1.5rem' }}>Реферальная система</h1>
      </div>

      {isMobile ? (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {tabBtn('global', 'Базовые %')}
            {tabBtn('individual', 'Индивидуальные')}
          </div>
          {activeTab === 'global' && settings && (
            <SettingsPanel settings={settings} onSave={handleSaveSettings} saving={saving} />
          )}
          {activeTab === 'individual' && (
            <IndividualRatesPanel globalSettings={settings} />
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ flex: '0 0 360px' }}>
            {settings && <SettingsPanel settings={settings} onSave={handleSaveSettings} saving={saving} />}
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <IndividualRatesPanel globalSettings={settings} />
          </div>
        </div>
      )}

      <div style={card}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => { setPeriod(p.value); setPage(1); setExpandedId(null); }}
                style={{
                  padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  borderColor: period === p.value ? '#f59e0b' : '#d1d5db',
                  background: period === p.value ? '#f59e0b' : 'white',
                  color: period === p.value ? '#fff' : '#374151',
                  whiteSpace: 'nowrap'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.4rem', flex: '1 1 280px', minWidth: '220px', maxWidth: '480px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Поиск по нику, Telegram, UID..."
                style={{ width: '100%', padding: '0.48rem 0.75rem 0.48rem 2.1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button type="submit" style={{ padding: '0.48rem 1rem', background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Найти
            </button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
                style={{ padding: '0.48rem 0.7rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}>
                <X size={14} />
              </button>
            )}
          </form>
          <span style={{ fontSize: '0.82rem', color: '#9ca3af', marginLeft: 'auto', whiteSpace: 'nowrap' }}>Всего: {total}</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Загрузка...</div>
        ) : referrers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Нет данных</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <colgroup>
                <col style={{ minWidth: '160px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '70px' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Пользователь</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>UID</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Реф. код</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Рефералов</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Покупок</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Заработано</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Детали</th>
                </tr>
              </thead>
              <tbody>
                {referrers.map(row => (
                  <ReferrerRow
                    key={row._id}
                    row={row}
                    expanded={expandedId === String(row._id)}
                    onExpand={() => setExpandedId(expandedId === String(row._id) ? null : String(row._id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginTop: '1rem' }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>←</button>
            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}
