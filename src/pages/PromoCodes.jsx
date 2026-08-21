import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Search, BarChart3, Power, Copy, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getPromoCodes, createPromoCode, updatePromoCode, setPromoCodeStatus,
  deletePromoCode, getPromoCodeRedemptions
} from '../api/promoCodes';
import { getClients } from '../api/clients';
import { useConfirm } from '../components/ConfirmDialog';

const TYPE_LABELS = { balance: 'Баланс', discount: 'Скидка' };
const SCOPE_LABELS = { any: 'Любой продукт', google_ads: 'Google Ads', youtube: 'YouTube', service: 'Услуга' };

const SITE_URL = (import.meta.env.VITE_API_URL || 'https://banana-traff-shop.com').replace(/\/api\/v3\/?$/, '');
const promoLink = (code) => `${SITE_URL}/?promo=${encodeURIComponent(code)}`;

function copyToClipboard(value, label) {
  navigator.clipboard.writeText(value).then(() => toast.success(label || 'Скопировано'));
}

function CopyBtn({ value, label, title, icon: Icon = Copy }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); copyToClipboard(value, label); }}
      title={title || 'Скопировать'}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0 0.2rem', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
    >
      <Icon size={12} />
    </button>
  );
}

const emptyForm = {
  name: '',
  code: '',
  type: 'discount',
  scope: 'any',
  discountType: 'fixed',
  amount: '',
  maxDiscountAmount: '',
  audience: 'all',
  allowedCustomerIds: [],
  activationMode: 'manual',
  usageLimit: '',
  expiresAt: ''
};

function toDatetimeLocal(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function summarizeAmount(promo) {
  if (promo.type === 'balance') return `+$${promo.amount}`;
  if (promo.discountType === 'percent') return `-${promo.amount}%${promo.maxDiscountAmount ? ` (до $${promo.maxDiscountAmount})` : ''}`;
  return `-$${promo.amount}`;
}

function CustomerMultiSelect({ selected, onChange }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) { setOptions([]); return undefined; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      const params = new URLSearchParams({ search: query.trim(), limit: '10' });
      getClients(params)
        .then((data) => { if (!cancelled) setOptions(data.customers || []); })
        .catch(() => { if (!cancelled) setOptions([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const add = (c) => {
    if (!selected.some((s) => s._id === c._id)) onChange([...selected, { _id: c._id, username: c.username, uid: c.uid }]);
    setQuery('');
    setOpen(false);
  };

  const remove = (id) => onChange(selected.filter((s) => s._id !== id));

  return (
    <div>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
          {selected.map((c) => (
            <span key={c._id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '999px', padding: '0.25rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}>
              {c.username}
              <button type="button" onClick={() => remove(c._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          placeholder="Найти пользователя по имени/UID..."
          style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', outline: 'none', boxSizing: 'border-box' }}
        />
        {open && query.trim().length >= 2 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20, maxHeight: '220px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem', color: '#6b7280' }}>Поиск...</div>
            ) : options.length === 0 ? (
              <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem', color: '#6b7280' }}>Ничего не найдено</div>
            ) : options.map((c) => (
              <button key={c._id} type="button" onClick={() => add(c)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.8rem', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.username || '—'}</div>
                <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#6b7280' }}>{c.uid}</div>
              </button>
            ))}
          </div>
        )}
        {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />}
      </div>
    </div>
  );
}

function PromoCodeModal({ promo, onClose, onSaved }) {
  const [form, setForm] = useState(() => promo ? {
    name: promo.name,
    code: promo.code,
    type: promo.type,
    scope: promo.scope,
    discountType: promo.discountType,
    amount: String(promo.amount),
    maxDiscountAmount: promo.maxDiscountAmount != null ? String(promo.maxDiscountAmount) : '',
    audience: promo.audience,
    allowedCustomerIds: promo.allowedCustomerIds || [],
    activationMode: promo.activationMode,
    usageLimit: promo.usageLimit != null ? String(promo.usageLimit) : '',
    expiresAt: toDatetimeLocal(promo.expiresAt)
  } : emptyForm);
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Укажите название');
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(form.code.trim())) return toast.error('Код: 3-40 символов, латиница/цифры/-/_');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Укажите сумму больше 0');
    if (!form.expiresAt) return toast.error('Укажите срок действия');
    if (form.audience === 'specific' && form.allowedCustomerIds.length === 0) return toast.error('Выберите пользователей');

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      type: form.type,
      amount: Number(form.amount),
      audience: form.audience,
      allowedCustomerIds: form.audience === 'specific' ? form.allowedCustomerIds.map((c) => c._id) : [],
      activationMode: form.activationMode,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      expiresAt: new Date(form.expiresAt).toISOString()
    };
    if (form.type === 'discount') {
      payload.scope = form.scope;
      payload.discountType = form.discountType;
      payload.maxDiscountAmount = form.discountType === 'percent' && form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null;
    }

    setSaving(true);
    try {
      if (promo) await updatePromoCode(promo._id, payload);
      else await createPromoCode(payload);
      toast.success(promo ? 'Промокод обновлён' : 'Промокод создан');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' };

  return (
    <div onClick={() => !saving && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{promo ? 'Редактировать промокод' : 'Новый промокод'}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Название (для админов)</label>
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Летняя распродажа" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Код промокода</label>
              <input type="text" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="SUMMER25" style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.03em' }} />
            </div>
          </div>

          {/^[A-Za-z0-9_-]{3,40}$/.test(form.code.trim()) && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => copyToClipboard(form.code.trim().toUpperCase(), 'Код скопирован')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: 0, border: 'none', background: 'none', color: '#6b7280', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                <Copy size={13} /> Скопировать код
              </button>
              <button type="button" onClick={() => copyToClipboard(promoLink(form.code.trim().toUpperCase()), 'Ссылка для активации скопирована')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: 0, border: 'none', background: 'none', color: '#6b7280', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                <Link2 size={13} /> Скопировать ссылку для активации
              </button>
            </div>
          )}

          <div>
            <label style={labelStyle}>Тип промокода</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[['discount', 'Скидка на покупку'], ['balance', 'Начисление на баланс']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('type', v)}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: `1.5px solid ${form.type === v ? 'var(--primary)' : '#e5e7eb'}`, background: form.type === v ? 'var(--primary)' : 'white', color: form.type === v ? '#fff' : 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'discount' && (
            <>
              <div>
                <label style={labelStyle}>На что действует</label>
                <select value={form.scope} onChange={(e) => set('scope', e.target.value)} style={inputStyle}>
                  <option value="any">Любой продукт/услуга</option>
                  <option value="google_ads">Google Ads товары</option>
                  <option value="youtube">YouTube товары</option>
                  <option value="service">Услуги</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: form.discountType === 'percent' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Формат скидки</label>
                  <select value={form.discountType} onChange={(e) => set('discountType', e.target.value)} style={inputStyle}>
                    <option value="fixed">Фикс. сумма $</option>
                    <option value="percent">Процент %</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{form.discountType === 'percent' ? 'Процент скидки' : 'Сумма скидки, $'}</label>
                  <input type="number" min="0.01" step="0.01" max={form.discountType === 'percent' ? 100 : undefined} value={form.amount} onChange={(e) => set('amount', e.target.value)} style={inputStyle} />
                </div>
                {form.discountType === 'percent' && (
                  <div>
                    <label style={labelStyle}>Макс. сумма скидки, $</label>
                    <input type="number" min="0" step="0.01" value={form.maxDiscountAmount} onChange={(e) => set('maxDiscountAmount', e.target.value)} placeholder="без лимита" style={inputStyle} />
                  </div>
                )}
              </div>
            </>
          )}

          {form.type === 'balance' && (
            <div>
              <label style={labelStyle}>Сумма начисления на баланс, $</label>
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} style={inputStyle} />
            </div>
          )}

          <div>
            <label style={labelStyle}>Для кого</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {[['all', 'Для всех'], ['specific', 'Выбранные пользователи']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('audience', v)}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: `1.5px solid ${form.audience === v ? 'var(--primary)' : '#e5e7eb'}`, background: form.audience === v ? 'var(--primary)' : 'white', color: form.audience === v ? '#fff' : 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
            {form.audience === 'specific' && (
              <CustomerMultiSelect selected={form.allowedCustomerIds} onChange={(v) => set('allowedCustomerIds', v)} />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Способ активации</label>
              <select value={form.activationMode} onChange={(e) => set('activationMode', e.target.value)} style={inputStyle}>
                <option value="manual">Вручную (ввод кода)</option>
                <option value="link">По ссылке</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Лимит активаций</label>
              <input type="number" min="1" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} placeholder="без лимита" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Действует до</label>
            <input type="datetime-local" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>Отмена</button>
            <button type="submit" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RedemptionsModal({ promo, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    getPromoCodeRedemptions(promo._id, new URLSearchParams({ page, limit: 20 }))
      .then((data) => { setItems(data.items || []); setPages(data.pages || 1); })
      .catch(() => toast.error('Ошибка загрузки статистики'))
      .finally(() => setLoading(false));
  }, [promo._id, page]);

  const STATUS_LABELS = { active: 'Активен', used: 'Использован', cancelled: 'Отменён', expired: 'Истёк' };
  const STATUS_COLORS = { active: '#6366f1', used: '#059669', cancelled: '#9ca3af', expired: '#ef4444' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Активации промокода</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontFamily: 'monospace', color: 'var(--primary)', fontSize: '0.85rem' }}>
              {promo.code}
              <CopyBtn value={promo.code} label="Код скопирован" title="Скопировать код" />
              <CopyBtn value={promoLink(promo.code)} label="Ссылка для активации скопирована" title="Скопировать ссылку активации" icon={Link2} />
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Загрузка...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Пока никто не применял этот промокод</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map((r) => (
              <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.6rem 0.85rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.customerId?.username || '—'}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{new Date(r.claimedAt).toLocaleString('ru-RU')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: (STATUS_COLORS[r.status] || '#9ca3af') + '22', color: STATUS_COLORS[r.status] || '#9ca3af' }}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
                    {r.amountCredited > 0 ? `+$${r.amountCredited.toFixed(2)}` : r.discountApplied > 0 ? `-$${r.discountApplied.toFixed(2)}` : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>‹</button>
            <span style={{ fontSize: '0.82rem', color: '#6b7280', alignSelf: 'center' }}>{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.4 : 1 }}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderRight: '1px solid #d1d5db', background: '#f9fafb' };
const tdStyle = { padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' };

const PromoCodes = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalPromo, setModalPromo] = useState(undefined); // undefined = closed, null = create, obj = edit
  const [statsPromo, setStatsPromo] = useState(null);
  const { confirm, ConfirmNode } = useConfirm();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const data = await getPromoCodes(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      toast.error('Ошибка загрузки промокодов');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter]);

  const handleToggleStatus = async (promo) => {
    try {
      await setPromoCodeStatus(promo._id, promo.status === 'active' ? 'disabled' : 'active');
      toast.success(promo.status === 'active' ? 'Промокод отключён' : 'Промокод включён');
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    }
  };

  const handleDelete = async (promo) => {
    const ok = await confirm({
      title: 'Удалить промокод?',
      message: `«${promo.name}» (${promo.code}) будет удалён безвозвратно.`,
      confirmText: 'Удалить',
      danger: true
    });
    if (!ok) return;
    try {
      await deletePromoCode(promo._id);
      toast.success('Промокод удалён');
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  const now = Date.now();

  return (
    <div className="orders-page" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {ConfirmNode}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Промокоды</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>Скидки на покупки и начисления на баланс по промокоду.</p>
        </div>
        <button onClick={() => setModalPromo(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> Новый промокод
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 240 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Поиск по названию или коду..." style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Поиск</button>
          </form>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '0.85rem', outline: 'none' }}>
            <option value="">Все типы</option>
            <option value="discount">Скидка</option>
            <option value="balance">Баланс</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '0.85rem', outline: 'none' }}>
            <option value="">Все статусы</option>
            <option value="active">Активен</option>
            <option value="disabled">Отключён</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                {['Код', 'Название', 'Тип', 'Область/сумма', 'Аудитория', 'Активации', 'Действует до', 'Статус', 'Действия'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Загрузка...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Промокодов нет</td></tr>
              ) : items.map((promo) => {
                const expired = new Date(promo.expiresAt).getTime() < now;
                return (
                  <tr key={promo._id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{promo.code}</span>
                        <CopyBtn value={promo.code} label="Код скопирован" title="Скопировать код" />
                        <CopyBtn value={promoLink(promo.code)} label="Ссылка для активации скопирована" title="Скопировать ссылку активации" icon={Link2} />
                      </div>
                    </td>
                    <td style={tdStyle}>{promo.name}</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.73rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '6px', background: '#f3f4f6', color: '#6b7280' }}>
                        {TYPE_LABELS[promo.type]}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, color: promo.type === 'balance' ? '#059669' : '#dc2626' }}>{summarizeAmount(promo)}</div>
                      {promo.type === 'discount' && <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{SCOPE_LABELS[promo.scope]}</div>}
                    </td>
                    <td style={tdStyle}>
                      {promo.audience === 'all' ? 'Все' : `${promo.allowedCustomerIds.length} польз.`}
                    </td>
                    <td style={tdStyle}>
                      <strong>{promo.usedCount}</strong> {promo.usageLimit ? `/ ${promo.usageLimit}` : '/ ∞'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.8rem', color: expired ? '#ef4444' : '#374151' }}>
                        {new Date(promo.expiresAt).toLocaleDateString('ru-RU')}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.73rem', fontWeight: '700', background: (promo.status === 'active' && !expired ? '#059669' : '#9ca3af') + '22', color: promo.status === 'active' && !expired ? '#059669' : '#9ca3af' }}>
                        {expired ? 'Истёк' : promo.status === 'active' ? 'Активен' : 'Отключён'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, borderRight: 'none' }}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button onClick={() => setStatsPromo(promo)} title="Статистика активаций" style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                          <BarChart3 size={13} />
                        </button>
                        <button onClick={() => handleToggleStatus(promo)} title={promo.status === 'active' ? 'Отключить' : 'Включить'} style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: promo.status === 'active' ? '#f59e0b' : '#059669', display: 'flex' }}>
                          <Power size={13} />
                        </button>
                        <button onClick={() => setModalPromo(promo)} title="Редактировать" style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(promo)} title="Удалить" disabled={promo.usedCount > 0} style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: promo.usedCount > 0 ? 'not-allowed' : 'pointer', color: promo.usedCount > 0 ? '#d1d5db' : '#ef4444', display: 'flex' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {items.length > 0 && (
          <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Стр. {page} / {pages} · Всего {total}</span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>‹</button>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.4 : 1 }}>›</button>
            </div>
          </div>
        )}
      </div>

      {modalPromo !== undefined && (
        <PromoCodeModal
          promo={modalPromo}
          onClose={() => setModalPromo(undefined)}
          onSaved={() => { setModalPromo(undefined); fetchItems(); }}
        />
      )}

      {statsPromo && <RedemptionsModal promo={statsPromo} onClose={() => setStatsPromo(null)} />}
    </div>
  );
};

export default PromoCodes;
