import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, Edit2, X, RefreshCw, DollarSign, Copy, Upload, Download, Receipt } from 'lucide-react';
import {
  updateOrderStatus,
  getOrderReplaceRequest, getAvailableItemsForOrder,
  processReplacement, processRefund, getReplacementsHistory
} from '../api/orders';
import { updatePreorderStatus, processPreorderRefund, uploadPreorderFiles, deletePreorderFile } from '../api/preorders';
import { updateServiceOrderStatus, processServiceOrderRefund, uploadResultFiles, deleteResultFile, downloadCustomerFile } from '../api/serviceOrders';
import { getOrderHistory, getOrderHistoryFilters } from '../api/orderHistory';
import { getClients } from '../api/clients';
import { useConfirm } from '../components/ConfirmDialog';
import { useAdminNotifStore } from '../stores/adminNotifStore';
import TransferProgressOverlay from '../components/TransferProgressOverlay';
import toast from 'react-hot-toast';

const TYPE_LABELS = { order: 'Заказ', preorder: 'Предзаказ', service_order: 'Услуга' };

const STATUS_META = {
  order: {
    unpaid: { label: 'Ожидает', color: '#9ca3af' },
    pending: { label: 'Ожидает', color: '#f59e0b' },
    paid: { label: 'Принят', color: '#6366f1' },
    delivered: { label: 'Доставлен', color: '#059669' },
    cancelled: { label: 'Отменён', color: '#ef4444' },
    replaced: { label: 'Заменён', color: '#8b5cf6' },
    waiting_replacement: { label: 'Ждёт замены', color: '#f97316' }
  },
  preorder: {
    pending: { label: 'Ожидает', color: '#f59e0b' },
    in_progress: { label: 'В работе', color: '#6366f1' },
    completed: { label: 'Выполнен', color: '#059669' },
    cancelled: { label: 'Отменён', color: '#ef4444' }
  },
  service_order: {
    pending: { label: 'Ожидает', color: '#f59e0b' },
    in_progress: { label: 'В работе', color: '#6366f1' },
    completed: { label: 'Выполнена', color: '#059669' },
    cancelled: { label: 'Отменена', color: '#ef4444' }
  }
};

function getStatusOptions(type) {
  if (type === 'order') return ['unpaid', 'pending', 'paid', 'delivered', 'waiting_replacement', 'replaced', 'cancelled'];
  return ['pending', 'in_progress', 'completed', 'cancelled'];
}

function statusMeta(type, status) {
  const map = STATUS_META[type] || STATUS_META.order;
  return map[status] || { label: status || '—', color: '#9ca3af' };
}

const PRODUCT_TYPE_LABELS = { GoogleAdsProduct: 'Google Ads', YoutubeProduct: 'YouTube' };

const PAYMENT_CFG = { unpaid: { color: '#9ca3af', label: 'Не оплачен' }, paid: { color: '#3b82f6', label: 'Оплачен' } };

/** Orders track payment through `status` (unpaid until paid/delivered); preorders and
 * service orders have their own explicit `paymentStatus`. */
function isRecordPaid(rec) {
  if (rec.type === 'order') return rec.status !== 'unpaid';
  if (rec.paymentStatus) return rec.paymentStatus === 'paid';
  return rec.status !== 'unpaid' && rec.status !== 'pending';
}

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

function ClientCell({ customer }) {
  const navigate = useNavigate();
  if (!customer?._id) return <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{customer?.username || '—'}</div>;
  return (
    <button
      type="button"
      onClick={() => navigate(`/clients?openClient=${customer._id}`)}
      style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
      title="Открыть карточку клиента"
    >
      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--primary)' }}>{customer.username || '—'}</div>
    </button>
  );
}

const CRM_API_BASE = import.meta.env.VITE_API_URL || '';

function ReplaceRequestPhotoThumb({ orderId, index, raw }) {
  const r = typeof raw === 'string' ? raw.trim() : '';
  const directCdnUrl = /^https?:\/\//i.test(r) ? r : null;

  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (directCdnUrl) {
      setSrc(directCdnUrl);
      setFailed(false);
      return undefined;
    }

    let cancelled = false;
    let objectUrl = null;
    setFailed(false);
    setSrc(null);

    fetch(`${CRM_API_BASE}/orders/${orderId}/replace-photos/${index}`, {
      credentials: 'include',
      redirect: 'follow',
    })
      .then((res) => {
        if (!res.ok) throw new Error('bad');
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orderId, index, directCdnUrl]);

  const openTab = () => {
    if (!src) return;
    window.open(src, '_blank', 'noopener,noreferrer');
  };

  if (failed) {
    return <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>нет фото</span>;
  }
  if (!src) {
    return (
      <div style={{
        width: '72px', height: '72px', borderRadius: '8px', background: '#f3f4f6',
        border: '1px solid #e5e7eb', flexShrink: 0,
      }} />
    );
  }

  return (
    <button type="button" onClick={openTab} title="Открыть в новой вкладке" style={{
      border: 'none', padding: 0, margin: 0, background: 'transparent', cursor: 'pointer', lineHeight: 0,
    }}>
      <img src={src} alt="" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'block' }} />
    </button>
  );
}

function StatusBadge({ status, type = 'order' }) {
  const meta = statusMeta(type, status);
  return (
    <span style={{
      display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px',
      fontSize: '0.73rem', fontWeight: '700', whiteSpace: 'nowrap',
      background: meta.color + '22',
      color: meta.color
    }}>{meta.label}</span>
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

function ClientSelect({ customerId, customerLabel, onChange }) {
  const [query, setQuery] = useState(customerLabel || '');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setQuery(customerLabel || ''); }, [customerLabel]);

  useEffect(() => {
    if (!open) return undefined;
    if (!query || query.trim().length < 2) { setOptions([]); return undefined; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      const params = new URLSearchParams({ search: query.trim(), limit: '10' });
      getClients(params)
        .then(data => { if (!cancelled) setOptions(data.customers || []); })
        .catch(() => { if (!cancelled) setOptions([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, open]);

  const pick = (c) => {
    onChange(c._id, c.username || c.uid || c._id);
    setQuery(c.username || c.uid || '');
    setOpen(false);
  };

  const clear = () => {
    onChange('', '');
    setQuery('');
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', minWidth: '200px' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (customerId) onChange('', ''); }}
          placeholder="Клиент..."
          style={{ width: '100%', padding: '0.55rem 1.8rem 0.55rem 1.9rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }}
        />
        {(customerId || query) && (
          <button type="button" onClick={clear} title="Сбросить" style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
            <X size={13} />
          </button>
        )}
      </div>
      {open && (query.trim().length >= 2) && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20, maxHeight: '260px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem', color: '#6b7280' }}>Поиск...</div>
          ) : options.length === 0 ? (
            <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem', color: '#6b7280' }}>Ничего не найдено</div>
          ) : options.map(c => (
            <button key={c._id} type="button" onClick={() => pick(c)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.8rem', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '0.82rem' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{c.username || '—'}</div>
              <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#6b7280' }}>{c.uid}</div>
            </button>
          ))}
        </div>
      )}
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />}
    </div>
  );
}

function ProductTitleSelect({ value, onChange }) {
  const [titles, setTitles] = useState([]);
  const [input, setInput] = useState(value || '');
  const [open, setOpen] = useState(false);

  useEffect(() => { setInput(value || ''); }, [value]);

  useEffect(() => {
    getOrderHistoryFilters().then(d => setTitles(d.titles || [])).catch(() => setTitles([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (input !== value) onChange(input); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const filtered = input.trim()
    ? titles.filter(t => t.toLowerCase().includes(input.trim().toLowerCase()))
    : titles;

  const pick = (t) => {
    setInput(t);
    onChange(t);
    setOpen(false);
  };

  const clear = () => {
    setInput('');
    onChange('');
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', minWidth: '200px' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={input}
          onFocus={() => setOpen(true)}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          placeholder="Товар / услуга..."
          style={{ width: '100%', padding: '0.55rem 1.8rem 0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }}
        />
        {input && (
          <button type="button" onClick={clear} title="Сбросить" style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
            <X size={13} />
          </button>
        )}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20, maxHeight: '260px', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem', color: '#6b7280' }}>Ничего не найдено</div>
          ) : filtered.map(t => (
            <button key={t} type="button" onClick={() => pick(t)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.8rem', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-main)' }}>
              {t}
            </button>
          ))}
        </div>
      )}
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />}
    </div>
  );
}

function HistoryEditModal({ record, onClose, onRefresh }) {
  const [status, setStatus] = useState(record.displayStatus);
  const [saving, setSaving] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundQty, setRefundQty] = useState(1);
  const [refundAmountInput, setRefundAmountInput] = useState('');

  const [replaceRequest, setReplaceRequest] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [loadingReq, setLoadingReq] = useState(record.type === 'order');
  const [loadingItems, setLoadingItems] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [showReplacePicker, setShowReplacePicker] = useState(false);
  const { confirm, ConfirmNode } = useConfirm();

  const isOrder = record.type === 'order';
  const isService = record.type === 'service_order';
  const isPreorder = record.type === 'preorder';

  const [files, setFiles] = useState(isPreorder ? (record.files || []) : (record.resultFiles || []));
  const [customerFiles] = useState(record.customerFiles || []);
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState(null);
  const [transferPct, setTransferPct] = useState(null);
  const [transferTitle, setTransferTitle] = useState('');
  const fileInputRef = useRef();

  const totalQty = record.totalQty || 1;
  const alreadyRefundedQty = record.refundedQuantity || 0;
  const remainingQty = totalQty - alreadyRefundedQty;
  const totalAmount = record.displayAmount || 0;
  const alreadyRefundedAmount = record.refundedAmount || 0;
  const remainingAmount = parseFloat((totalAmount - alreadyRefundedAmount).toFixed(2));
  const unitPrice = totalQty > 0 ? totalAmount / totalQty : totalAmount;
  const fullyRefunded = isService ? remainingAmount <= 0 : remainingQty <= 0;

  useEffect(() => {
    if (!isOrder) return;
    getOrderReplaceRequest(record._id)
      .then(d => setReplaceRequest(d.request || null))
      .catch(() => setReplaceRequest(null))
      .finally(() => setLoadingReq(false));
  }, [record._id, isOrder]);

  useEffect(() => {
    if (!isService) setRefundQty(Math.min(1, remainingQty) || 0);
    else setRefundAmountInput(remainingAmount > 0 ? remainingAmount.toFixed(2) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAvailableItems = async () => {
    setLoadingItems(true);
    try {
      const d = await getAvailableItemsForOrder(record._id);
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
      if (record.type === 'order') await updateOrderStatus(record._id, status);
      else if (record.type === 'preorder') await updatePreorderStatus(record._id, status);
      else await updateServiceOrderStatus(record._id, status);
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
      await processReplacement(record._id, selectedItemId);
      toast.success('Замена выдана');
      onRefresh();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Ошибка');
    } finally {
      setReplacing(false);
    }
  };

  const handleUploadFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const fd = new FormData();
    picked.forEach(f => fd.append('files', f));
    setUploading(true);
    setTransferTitle(isPreorder ? 'Загрузка файлов предзаказа' : 'Загрузка результата');
    setTransferPct(0);
    try {
      if (isPreorder) {
        const d = await uploadPreorderFiles(record._id, fd, { onUploadProgress: setTransferPct });
        setFiles(d.files || []);
      } else {
        const d = await uploadResultFiles(record._id, fd, { onUploadProgress: setTransferPct });
        setFiles(d.resultFiles || []);
      }
      toast.success(`${picked.length} файл(ов) загружено`);
      onRefresh();
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
      setTransferPct(null);
      setTransferTitle('');
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId) => {
    setDeletingFileId(fileId);
    try {
      if (isPreorder) await deletePreorderFile(record._id, fileId);
      else await deleteResultFile(record._id, fileId);
      setFiles(prev => prev.filter(f => f._id !== fileId));
      toast.success('Файл удалён');
      onRefresh();
    } catch {
      toast.error('Ошибка удаления');
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleDownloadCustomerFile = async (fileId, originalName) => {
    setTransferTitle('Скачивание файла клиента');
    setTransferPct(0);
    try {
      const blob = await downloadCustomerFile(record._id, fileId, { onDownloadProgress: setTransferPct });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName || 'file';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || 'Ошибка скачивания');
    } finally {
      setTransferPct(null);
      setTransferTitle('');
    }
  };

  const handleRefund = async () => {
    let amountToShow;
    if (isService) {
      const amt = parseFloat(refundAmountInput);
      amountToShow = Number.isFinite(amt) ? amt : 0;
    } else {
      amountToShow = parseFloat((unitPrice * refundQty).toFixed(2));
    }
    const ok = await confirm({
      title: 'Оформить возврат?',
      message: `$${amountToShow.toFixed(2)} будет возвращено на баланс клиента.`,
      confirmText: 'Возврат', danger: true
    });
    if (!ok) return;
    setRefunding(true);
    try {
      if (record.type === 'order') await processRefund(record._id, refundQty);
      else if (record.type === 'preorder') await processPreorderRefund(record._id, refundQty);
      else await processServiceOrderRefund(record._id, parseFloat(refundAmountInput));
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
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>{TYPE_LABELS[record.type] || 'Запись'}</h3>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.2rem' }}>{record.uid}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
          <div><span style={{ color: '#6b7280' }}>Покупатель:</span> <strong>{record.customer?.username || '—'}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Тип:</span> <strong>{TYPE_LABELS[record.type] || record.type}</strong></div>
          <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#6b7280' }}>Товар/услуга:</span> <strong>{record.displayTitle || '—'}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Кол-во:</span> <strong>{record.displayQuantity || 1}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Сумма:</span> <strong style={{ color: '#059669' }}>${totalAmount?.toFixed(2)}</strong></div>
          {isPreorder && Array.isArray(record.geoBreakdown) && record.geoBreakdown.length > 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <span style={{ color: '#6b7280' }}>Гео:</span>{' '}
              <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.35rem', verticalAlign: 'middle' }}>
                {record.geoBreakdown.map((g, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.1rem 0.5rem', fontWeight: 700 }}>
                    {g.geo} × {g.quantity}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Статус</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'white', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none' }}>
              {getStatusOptions(record.type).map(s => <option key={s} value={s}>{statusMeta(record.type, s).label}</option>)}
            </select>
            <button onClick={handleStatusSave} disabled={saving || status === record.displayStatus} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '700', fontSize: '0.875rem', cursor: saving || status === record.displayStatus ? 'not-allowed' : 'pointer', opacity: saving || status === record.displayStatus ? 0.6 : 1 }}>
              {saving ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {isOrder && !loadingReq && replaceRequest && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f97316', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Заявка на замену от клиента</div>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '0.875rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>{replaceRequest.reason}</div>
              {replaceRequest.photos?.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  {replaceRequest.photos.map((_, i) => (
                    <ReplaceRequestPhotoThumb key={i} orderId={record._id} index={i} raw={replaceRequest.photos[i]} />
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
                    <RefreshCw size={14} /> {replacing ? '...' : 'Подтвердить'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {(isPreorder || isService) && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
            <TransferProgressOverlay title={transferTitle} percent={transferPct} subtitle={record.uid} />
            {isService && (record.responses || []).length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '0.3rem' }}>Ответы клиента:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {record.responses.map((r, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.4rem 0.6rem' }}>
                      <strong>{r.label}:</strong> {Array.isArray(r.value) ? r.value.join(', ') : String(r.value ?? '')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isPreorder ? 'Файлы предзаказа' : 'Файлы результата'}
            </div>

            {isService && customerFiles.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '0.3rem' }}>Файлы клиента:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {customerFiles.map(f => (
                    <button key={f._id} type="button" onClick={() => handleDownloadCustomerFile(f._id, f.originalName)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '8px', padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: '#0369a1', cursor: 'pointer' }}>
                      <Download size={11} />
                      {f.originalName}
                      {f.size ? <span style={{ color: '#64748b' }}>({Math.round(f.size / 1024)}KB)</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
              {files.length === 0 && <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Файлов пока нет</span>}
              {files.map(f => (
                <div key={f._id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.3rem 0.6rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#374151', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.originalName}</span>
                  <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>({Math.round((f.size || 0) / 1024)}KB)</span>
                  <button onClick={() => handleDeleteFile(f._id)} disabled={deletingFileId === f._id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1.5px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontWeight: '600', fontSize: '0.85rem', cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <Upload size={13} />
              {uploading ? 'Загрузка...' : (isPreorder ? 'Загрузить файлы' : 'Загрузить результат')}
            </button>
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleUploadFiles} />
          </div>
        )}

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Возврат средств</div>

          {alreadyRefundedAmount > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.6rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
              Возвращено: ${alreadyRefundedAmount.toFixed(2)}{!isService && ` (${alreadyRefundedQty}/${totalQty} шт.)`}
            </div>
          )}

          {fullyRefunded ? (
            <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '600' }}>Возврат оформлен полностью</div>
          ) : isService ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number" min="0.01" max={remainingAmount} step="0.01"
                value={refundAmountInput}
                onChange={e => setRefundAmountInput(e.target.value)}
                style={{ width: '120px', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.875rem', outline: 'none' }}
              />
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>из ${remainingAmount.toFixed(2)}</span>
              <button onClick={handleRefund} disabled={refunding || !(parseFloat(refundAmountInput) > 0)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', border: '1.5px solid #ef4444', background: '#fff5f5', color: '#ef4444', fontWeight: '700', fontSize: '0.875rem', cursor: refunding ? 'not-allowed' : 'pointer', opacity: refunding ? 0.6 : 1 }}>
                <DollarSign size={15} /> {refunding ? '...' : 'Возврат'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number" min="1" max={remainingQty} step="1"
                value={refundQty}
                onChange={e => setRefundQty(Math.max(1, Math.min(remainingQty, parseInt(e.target.value, 10) || 1)))}
                style={{ width: '90px', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.875rem', outline: 'none' }}
              />
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>из {remainingQty} шт. · ${parseFloat((unitPrice * refundQty).toFixed(2)).toFixed(2)}</span>
              <button onClick={handleRefund} disabled={refunding} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', border: '1.5px solid #ef4444', background: '#fff5f5', color: '#ef4444', fontWeight: '700', fontSize: '0.875rem', cursor: refunding ? 'not-allowed' : 'pointer', opacity: refunding ? 0.6 : 1 }}>
                <DollarSign size={15} /> {refunding ? '...' : 'Возврат'}
              </button>
            </div>
          )}
        </div>
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

function HistoryTab({ onEdit, initialType }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initSearch = searchParams.get('search') || '';

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initSearch);
  const [search, setSearch] = useState(initSearch);
  const [typeFilter, setTypeFilter] = useState(initialType || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [productTitle, setProductTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { setTypeFilter(initialType || ''); }, [initialType]);

  const fetchHistory = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (customerId) params.customerId = customerId;
      if (productTitle) params.productTitle = productTitle;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await getOrderHistory(params);
      setRecords(data.history || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { toast.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  }, [search, typeFilter, statusFilter, customerId, productTitle, startDate, endDate]);

  useEffect(() => { fetchHistory(currentPage); }, [fetchHistory, currentPage]);
  useEffect(() => { setCurrentPage(1); }, [typeFilter, statusFilter, customerId, productTitle, startDate, endDate, search]);

  const handleReset = () => {
    setSearchInput(''); setSearch(''); setTypeFilter(initialType || ''); setStatusFilter('');
    setCustomerId(''); setCustomerLabel(''); setProductTitle(''); setStartDate(''); setEndDate('');
  };

  const statusOptions = typeFilter ? getStatusOptions(typeFilter) : ['pending', 'in_progress', 'completed', 'unpaid', 'paid', 'delivered', 'waiting_replacement', 'replaced', 'cancelled'];

  return (
    <>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 240 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Поиск по ID, покупателю, товару..." style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Поиск</button>
            <button type="button" onClick={handleReset} style={{ padding: '0.55rem 0.875rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Сброс</button>
          </form>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'white', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}>
            <option value="">Все типы</option>
            <option value="order">Заказ</option>
            <option value="preorder">Предзаказ</option>
            <option value="service_order">Услуга</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'white', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}>
            <option value="">Все статусы</option>
            {[...new Set(statusOptions)].map(s => <option key={s} value={s}>{statusMeta(typeFilter || 'order', s).label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <ClientSelect customerId={customerId} customerLabel={customerLabel} onChange={(id, label) => { setCustomerId(id); setCustomerLabel(label); }} />
          <ProductTitleSelect value={productTitle} onChange={setProductTitle} />
        </div>
        <DateQuickFilters startDate={startDate} endDate={endDate} onSet={(s, e) => { setStartDate(s); setEndDate(e); }} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {['ID', 'Дата', 'Тип', 'Покупатель', 'Товар/услуга', 'Кол-во', 'Сумма', 'Возврат', 'Статус', 'Оплата', 'Действия'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Загрузка...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Записей нет</td></tr>
            ) : records.map(rec => (
              <tr key={rec._id}>
                <td style={tdStyle}>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    {rec.uid}<CopyBtn value={rec.uid} />
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{new Date(rec.createdAt).toLocaleDateString('ru-RU')}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: '0.73rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '6px', background: '#f3f4f6', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {TYPE_LABELS[rec.type] || rec.type}
                  </span>
                </td>
                <td style={tdStyle}>
                  <ClientCell customer={rec.customer} />
                  {rec.customer?.uid && (
                    <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                      {rec.customer.uid}<CopyBtn value={rec.customer.uid} />
                    </div>
                  )}
                </td>
                <td style={{ ...tdStyle, maxWidth: '200px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rec.displayTitle || '—'}
                  </span>
                  {rec.type === 'order' && rec.productType && (
                    <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>{PRODUCT_TYPE_LABELS[rec.productType] || rec.productType}</span>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <strong>{rec.displayQuantity || 1}</strong>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: '700', color: '#059669' }}>${(rec.displayAmount || 0).toFixed(2)}</span>
                </td>
                <td style={tdStyle}>
                  {rec.refundedAmount > 0 ? (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>
                      ${rec.refundedAmount.toFixed(2)}{rec.type !== 'service_order' && ` (${rec.refundedQuantity || 0}/${rec.totalQty || 1})`}
                    </span>
                  ) : <span style={{ color: '#9ca3af' }}>—</span>}
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={rec.displayStatus} type={rec.type} />
                </td>
                <td style={tdStyle}>
                  {rec.displayStatus === 'cancelled' ? (
                    <span style={{ color: '#9ca3af', fontSize: '0.73rem' }}>—</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.73rem', fontWeight: '700',
                        background: (isRecordPaid(rec) ? PAYMENT_CFG.paid.color : PAYMENT_CFG.unpaid.color) + '22',
                        color: isRecordPaid(rec) ? PAYMENT_CFG.paid.color : PAYMENT_CFG.unpaid.color
                      }}>
                        {isRecordPaid(rec) ? PAYMENT_CFG.paid.label : PAYMENT_CFG.unpaid.label}
                      </span>
                      {isRecordPaid(rec) && (
                        <button
                          type="button"
                          title="Перейти к транзакции"
                          onClick={() => navigate(`/transactions?search=${encodeURIComponent(rec.uid || '')}`)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer' }}
                        >
                          <Receipt size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td style={{ ...tdStyle, borderRight: 'none' }}>
                  <button onClick={() => onEdit(rec)} title="Редактировать" style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                    <Edit2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {records.length > 0 && (
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await getReplacementsHistory(params);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { toast.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  }, [search, startDate, endDate]);

  useEffect(() => { fetchData(currentPage); }, [fetchData, currentPage]);

  return (
    <>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <form onSubmit={e => { e.preventDefault(); setCurrentPage(1); setSearch(searchInput); }} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Поиск по ID заказа, покупателю..." style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Поиск</button>
          <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setStartDate(''); setEndDate(''); setCurrentPage(1); }} style={{ padding: '0.55rem 0.875rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Сброс</button>
        </form>
        <DateQuickFilters startDate={startDate} endDate={endDate} onSet={(s, e) => { setStartDate(s); setEndDate(e); setCurrentPage(1); }} />
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
                  <ClientCell customer={order.customerId} />
                </td>
                <td style={{ ...tdStyle, maxWidth: '200px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.productSnapshot?.title || '—'}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{PRODUCT_TYPE_LABELS[order.productType] || order.productType}</div>
                </td>
                <td style={tdStyle}><StatusBadge status={order.status} type="order" /></td>
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
  const [editingRecord, setEditingRecord] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeTab = location.pathname.endsWith('/replacements') ? 'replacements' : 'orders';
  const initialType = location.pathname.startsWith('/preorders') ? 'preorder'
    : location.pathname.startsWith('/service-orders') ? 'service_order'
    : '';

  useEffect(() => {
    if (activeTab === 'replacements') {
      useAdminNotifStore.getState().markCategoryRead('replacement');
    } else if (initialType === 'preorder') {
      useAdminNotifStore.getState().markCategoryRead('order_preorder');
    } else if (initialType === 'service_order') {
      useAdminNotifStore.getState().markCategoryRead('order_service');
    } else {
      useAdminNotifStore.getState().markCategoryRead('order');
    }
  }, [activeTab, initialType]);

  const tabs = [
    { key: 'orders', label: 'История заказов', path: '/orders' },
    { key: 'replacements', label: 'История замен', path: '/orders/replacements' }
  ];

  const handleRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="orders-page" style={{ padding: '2rem' }}>
      {editingRecord && (
        <HistoryEditModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
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

        {activeTab === 'orders' && <HistoryTab key={`h-${refreshKey}-${initialType}`} onEdit={setEditingRecord} initialType={initialType} />}
        {activeTab === 'replacements' && <ReplacementsTab key={`r-${refreshKey}`} />}
      </div>
    </div>
  );
};

export default Orders;
