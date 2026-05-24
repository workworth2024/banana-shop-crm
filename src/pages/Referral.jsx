import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { GitBranch, Save, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

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

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <GitBranch size={24} style={{ color: '#f59e0b' }} />
        <h1 style={{ margin: 0, fontWeight: 700, fontSize: '1.5rem' }}>Реферальная система</h1>
      </div>

      {settings && (
        <SettingsPanel settings={settings} onSave={handleSaveSettings} saving={saving} />
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
