import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, Trash2, Edit2, X, RefreshCw, DollarSign, Copy } from 'lucide-react';
import {
  getAllOrders, updateOrderStatus, deleteOrder,
  getOrderReplaceRequest, getAvailableItemsForOrder,
  processReplacement, processRefund, getReplacementsHistory
} from '../api/orders';
import { useConfirm } from '../components/ConfirmDialog';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  unpaid: '#9ca3af', pending: '#f59e0b', paid: '#3b82f6',
  delivered: '#059669', cancelled: '#ef4444', replaced: '#8b5cf6',
  waiting_replacement: '#f97316'
};
const STATUS_LABELS = {
  unpaid: 'Не оплачен', pending: 'Ожидает', paid: 'Оплачен',
  delivered: 'Доставлен', cancelled: 'Отменён', replaced: 'Заменён',
  waiting_replacement: 'Ждёт замены'
};
const PRODUCT_TYPE_LABELS = { GoogleAdsProduct: 'Google Ads', YoutubeProduct: 'YouTube' };
const ALL_STATUSES = ['unpaid', 'pending', 'paid', 'delivered', 'waiting_replacement', 'replaced', 'cancelled'];

const VITE_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v3$/, '');

const tdStyle = { padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top', userSelect: 'text' };
const thStyle = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderRight: '1px solid #d1d5db', background: '#f9fafb' };

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

function StatusBadge({ status }) {
  return (
    <span style={{
      display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px',
      fontSize: '0.73rem', fontWeight: '700', whiteSpace: 'nowrap',
      background: (STATUS_COLORS[status] || '#9ca3af') + '22',
      color: STATUS_COLORS[status] || '#9ca3af'
    }}>{STATUS_LABELS[status] || status}</span>
  );
}

function FilesCell({ items }) {
  const [open, setOpen] = useState(false);
  if (!items?.length) return <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>;
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} style={{
        background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px',
        cursor: 'pointer', fontSize: '0.73rem', fontWeight: '600', color: '#6b7280',
        padding: '0.18rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
      }}>
        {items.length} {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {open && (
        <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {items.map(item => (
            <div key={item.uid || item._id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.25rem 0.5rem' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: '600', color: 'var(--text-main)' }}>{item.originalName}</div>
              <div style={{ fontSize: '0.67rem', fontFamily: 'monospace', color: '#6b7280' }}>{item.uid}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditOrderModal({ order, onClose, onRefresh }) {
  const [status, setStatus] = useState(order.status);
  const [replaceRequest, setReplaceRequest] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [loadingReq, setLoadingReq] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [showReplacePicker, setShowReplacePicker] = useState(false);
  const { confirm, ConfirmNode } = useConfirm();

  useEffect(() => {
    getOrderReplaceRequest(order._id)
      .then(d => setReplaceRequest(d.request || null))
      .catch(() => setReplaceRequest(null))
      .finally(() => setLoadingReq(false));
  }, [order._id]);

  const loadAvailableItems = async () => {
    setLoadingItems(true);
    try {
      const d = await getAvailableItemsForOrder(order._id);
      setAvailableItems(d.items || []);
      setShowReplacePicker(true);
    } catch (e) {
      toast.error(e.message || 'Ошибка загрузки товаров');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleStatusSave = async () => {
    setSaving(true);
    try {
      await updateOrderStatus(order._id, status);
      toast.success('Статус обновлён');
      onRefresh();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleReplacement = async () => {
    if (!selectedItemId) { toast.error('Выберите товар для замены'); return; }
    const ok = await confirm({ title: 'Выдать замену?', message: 'Старый товар будет помечен как "заменён", новый передан клиенту.', confirmText: 'Выдать' });
    if (!ok) return;
    setReplacing(true);
    try {
      await processReplacement(order._id, selectedItemId);
      toast.success('Замена выдана');
      onRefresh();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Ошибка');
    } finally {
      setReplacing(false);
    }
  };

  const handleRefund = async () => {
    const ok = await confirm({
      title: 'Оформить возврат?',
      message: `$${order.amount?.toFixed(2)} будет возвращено на баланс клиента, статус заказа → Отменён.`,
      confirmText: 'Возврат', danger: true
    });
    if (!ok) return;
    setRefunding(true);
    try {
      await processRefund(order._id);
      toast.success('Возврат выполнен');
      onRefresh();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Ошибка');
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      {ConfirmNode}
      <div style={{ background: 'white', borderRadius: '18px', padding: '1.75rem', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>Заказ</h3>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.2rem' }}>{order.uid}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
          <div><span style={{ color: '#6b7280' }}>Покупатель:</span> <strong>{order.customerId?.username || '—'}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Тип:</span> <strong>{PRODUCT_TYPE_LABELS[order.productType] || order.productType || '—'}</strong></div>
          <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#6b7280' }}>Товар:</span> <strong>{order.productSnapshot?.title || '—'}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Кол-во:</span> <strong>{order.quantity || 1}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Сумма:</span> <strong style={{ color: '#059669' }}>${order.amount?.toFixed(2)}</strong></div>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Статус</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'white', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none' }}>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <button onClick={handleStatusSave} disabled={saving || status === order.status} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '700', fontSize: '0.875rem', cursor: saving || status === order.status ? 'not-allowed' : 'pointer', opacity: saving || status === order.status ? 0.6 : 1 }}>
              {saving ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {!loadingReq && replaceRequest && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f97316', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Заявка на замену от клиента</div>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '0.875rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>{replaceRequest.reason}</div>
              {replaceRequest.photos?.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  {replaceRequest.photos.map((p, i) => (
                    <a key={i} href={`${VITE_BASE}${p}`} target="_blank" rel="noopener noreferrer">
                      <img src={`${VITE_BASE}${p}`} alt="" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer' }} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {!showReplacePicker ? (
              <button onClick={loadAvailableItems} disabled={loadingItems} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', border: '1.5px solid #f97316', background: '#fff7ed', color: '#ea580c', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer' }}>
                <RefreshCw size={15} /> {loadingItems ? 'Загрузка...' : 'Выдать замену'}
              </button>
            ) : (
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Выберите доступный товар:</div>
                {availableItems.length === 0 ? (
                  <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>Нет доступных товаров</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '0.75rem' }}>
                    {availableItems.map(item => (
                      <label key={item._id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: '8px', border: `1.5px solid ${selectedItemId === item._id ? '#f97316' : '#e5e7eb'}`, background: selectedItemId === item._id ? '#fff7ed' : '#f9fafb', cursor: 'pointer' }}>
                        <input type="radio" name="replaceItem" value={item._id} checked={selectedItemId === item._id} onChange={() => setSelectedItemId(item._id)} style={{ accentColor: '#f97316', flex: '0 0 16px', width: '16px', height: '16px', cursor: 'pointer' }} />
                        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.originalName}</div>
                          <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#6b7280' }}>{item.uid}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setShowReplacePicker(false); setSelectedItemId(''); }} style={{ padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>Отмена</button>
                  <button onClick={handleReplacement} disabled={!selectedItemId || replacing} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#f97316', color: '#fff', fontWeight: '700', fontSize: '0.875rem', cursor: !selectedItemId || replacing ? 'not-allowed' : 'pointer', opacity: !selectedItemId || replacing ? 0.6 : 1 }}>
                    <RefreshCw size={14} /> {replacing ? '...' : 'Подтвердить замену'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {order.replacements?.length > 0 && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>История замен ({order.replacements.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {order.replacements.map((r, i) => (
                <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.73rem', color: '#6b7280', marginBottom: '0.35rem' }}>
                    {new Date(r.createdAt).toLocaleString('ru-RU')} · Замена #{i + 1}
                  </div>
                  {r.reason && <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>{r.reason}</div>}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {r.oldItemId && <div style={{ fontSize: '0.75rem' }}><span style={{ color: '#6b7280' }}>Старый:</span> <span style={{ fontFamily: 'monospace', color: '#ef4444' }}>{r.oldItemId.uid || String(r.oldItemId).slice(-8)}</span></div>}
                    {r.newItemId && <div style={{ fontSize: '0.75rem' }}><span style={{ color: '#6b7280' }}>Новый:</span> <span style={{ fontFamily: 'monospace', color: '#059669' }}>{r.newItemId.uid || String(r.newItemId).slice(-8)}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {order.status !== 'cancelled' && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem' }}>
            <button onClick={handleRefund} disabled={refunding} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', border: '1.5px solid #ef4444', background: '#fff5f5', color: '#ef4444', fontWeight: '700', fontSize: '0.875rem', cursor: refunding ? 'not-allowed' : 'pointer', opacity: refunding ? 0.6 : 1 }}>
              <DollarSign size={15} /> {refunding ? '...' : `Возврат $${order.amount?.toFixed(2)}`}
            </button>
          </div>
        )}
      </div>
    </div>
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

function OrdersTab({ onEdit }) {
  const [searchParams] = useSearchParams();
  const initSearch = searchParams.get('search') || '';

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initSearch);
  const [search, setSearch] = useState(initSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { confirm, ConfirmNode } = useConfirm();

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await getAllOrders(params);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { toast.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  }, [search, statusFilter, startDate, endDate]);

  useEffect(() => { fetchOrders(currentPage); }, [fetchOrders, currentPage]);

  const handleDelete = async (order) => {
    const ok = await confirm({ title: 'Удалить заказ?', message: `Заказ ${order.uid} будет удалён.`, confirmText: 'Удалить', danger: true });
    if (!ok) return;
    try { await deleteOrder(order._id); toast.success('Удалён'); fetchOrders(currentPage); }
    catch (e) { toast.error(e.message || 'Ошибка'); }
  };

  const handleReset = () => { setSearchInput(''); setSearch(''); setStatusFilter(''); setStartDate(''); setEndDate(''); setCurrentPage(1); };

  return (
    <>
      {ConfirmNode}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <form onSubmit={e => { e.preventDefault(); setCurrentPage(1); setSearch(searchInput); }} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 240 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Поиск по ID, покупателю, товару, UID файла..." style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Поиск</button>
            <button type="button" onClick={handleReset} style={{ padding: '0.55rem 0.875rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Сброс</button>
          </form>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'white', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}>
            <option value="">Все статусы</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <DateQuickFilters startDate={startDate} endDate={endDate} onSet={(s, e) => { setStartDate(s); setEndDate(e); setCurrentPage(1); }} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {['ID заказа', 'Покупатель', 'ID товара', 'Название', 'Тип', 'Кол-во', 'Сумма', 'Статус', 'Файлы', 'Действия'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Загрузка...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Заказов нет</td></tr>
            ) : orders.map(order => (
              <tr key={order._id}>
                <td style={tdStyle}>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    {order.uid}<CopyBtn value={order.uid} />
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>{new Date(order.createdAt).toLocaleDateString('ru-RU')}</div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{order.customerId?.username || '—'}</div>
                  {order.customerId?.uid && (
                    <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                      {order.customerId.uid}<CopyBtn value={order.customerId.uid} />
                    </div>
                  )}
                </td>
                <td style={{ ...tdStyle, maxWidth: '90px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#6b7280' }}>
                      {order.productId ? String(order.productId).slice(-8) : '—'}
                    </span>
                    {order.productId && <CopyBtn value={String(order.productId)} />}
                  </div>
                </td>
                <td style={{ ...tdStyle, maxWidth: '180px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.productSnapshot?.title || '—'}
                  </span>
                  {order.productSnapshot?.productSubType && (
                    <span style={{ fontSize: '0.68rem', color: '#92400e', background: '#fef3c7', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {order.productSnapshot.productSubType}
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: '0.73rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '6px', background: '#f3f4f6', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {PRODUCT_TYPE_LABELS[order.productType] || order.productType || '—'}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <strong>{order.quantity || 1}</strong>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: '700', color: '#059669' }}>${(order.amount || 0).toFixed(2)}</span>
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={order.status} />
                  {order.replacements?.length > 0 && (
                    <div style={{ fontSize: '0.67rem', color: '#8b5cf6', marginTop: '0.2rem' }}>× {order.replacements.length} замен</div>
                  )}
                </td>
                <td style={tdStyle}><FilesCell items={order.digitalItemIds} /></td>
                <td style={{ ...tdStyle, borderRight: 'none' }}>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button onClick={() => onEdit(order)} title="Редактировать" style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(order)} title="Удалить" style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length > 0 && (
        <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Стр. {currentPage} / {pages} · Всего {total}</span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1, color: 'var(--text-main)', fontWeight: '600' }}>‹</button>
            <button disabled={currentPage >= pages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: currentPage >= pages ? 'not-allowed' : 'pointer', opacity: currentPage >= pages ? 0.4 : 1, color: 'var(--text-main)', fontWeight: '600' }}>›</button>
          </div>
        </div>
      )}
    </>
  );
}

function ReplacementsTab() {
  const [searchParams] = useSearchParams();
  const initSearch = searchParams.get('search') || '';

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initSearch);
  const [search, setSearch] = useState(initSearch);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const data = await getReplacementsHistory(params);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { toast.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchData(currentPage); }, [fetchData, currentPage]);

  return (
    <>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem' }}>
        <form onSubmit={e => { e.preventDefault(); setCurrentPage(1); setSearch(searchInput); }} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Поиск по ID заказа, покупателю..." style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Поиск</button>
          <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setCurrentPage(1); }} style={{ padding: '0.55rem 0.875rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Сброс</button>
        </form>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {['ID заказа', 'Покупатель', 'Товар', 'Статус', 'Кол-во замен', 'История замен'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Загрузка...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Замен нет</td></tr>
            ) : orders.map(order => (
              <tr key={order._id}>
                <td style={tdStyle}>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    {order.uid}<CopyBtn value={order.uid} />
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>{new Date(order.createdAt).toLocaleDateString('ru-RU')}</div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{order.customerId?.username || '—'}</div>
                </td>
                <td style={{ ...tdStyle, maxWidth: '200px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.productSnapshot?.title || '—'}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{PRODUCT_TYPE_LABELS[order.productType] || order.productType}</div>
                </td>
                <td style={tdStyle}><StatusBadge status={order.status} /></td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span style={{ fontWeight: '700', color: '#8b5cf6' }}>{order.replacements?.length || 0}</span>
                </td>
                <td style={{ ...tdStyle, borderRight: 'none', minWidth: '220px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {(order.replacements || []).map((r, i) => (
                      <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>
                        <div style={{ color: '#6b7280', marginBottom: '0.2rem' }}>#{i + 1} · {new Date(r.createdAt).toLocaleDateString('ru-RU')}</div>
                        {r.reason && <div style={{ color: 'var(--text-main)', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</div>}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          {r.oldItemId && <span style={{ color: '#ef4444' }}>→ {r.oldItemId.uid || '...'}</span>}
                          {r.newItemId && <span style={{ color: '#059669' }}>← {r.newItemId.uid || '...'}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length > 0 && (
        <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Стр. {currentPage} / {pages} · Всего {total}</span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1, color: 'var(--text-main)', fontWeight: '600' }}>‹</button>
            <button disabled={currentPage >= pages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: currentPage >= pages ? 'not-allowed' : 'pointer', opacity: currentPage >= pages ? 0.4 : 1, color: 'var(--text-main)', fontWeight: '600' }}>›</button>
          </div>
        </div>
      )}
    </>
  );
}

const Orders = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [editingOrder, setEditingOrder] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeTab = location.pathname.endsWith('/replacements') ? 'replacements'
    : location.pathname.endsWith('/services') ? 'services'
    : 'orders';

  const tabs = [
    { key: 'orders', label: 'История заказов', path: '/orders' },
    { key: 'replacements', label: 'История замен', path: '/orders/replacements' },
    { key: 'services', label: 'История услуг', path: '/orders/services' }
  ];

  const handleRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div style={{ padding: '2rem' }}>
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onRefresh={() => { handleRefresh(); }}
        />
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 0.25rem' }}>История заказов</h1>
      </div>

      <div style={{
        background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb',
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              style={{
                padding: '0.875rem 1.5rem', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: activeTab === tab.key ? '700' : '500',
                color: activeTab === tab.key ? 'var(--primary)' : '#6b7280',
                borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'orders' && <OrdersTab key={refreshKey} onEdit={setEditingOrder} />}
        {activeTab === 'replacements' && <ReplacementsTab key={`r-${refreshKey}`} />}
        {activeTab === 'services' && (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🚧</div>
            <div style={{ fontWeight: '600' }}>Скоро</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Раздел в разработке</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
