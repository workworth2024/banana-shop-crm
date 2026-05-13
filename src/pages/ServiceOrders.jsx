import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Search, ChevronLeft, ChevronRight, Upload, X, ChevronDown, ChevronUp, Copy, Download, Receipt } from 'lucide-react';
import { getServiceOrders, updateServiceOrderStatus, uploadResultFiles, deleteResultFile, downloadCustomerFile } from '../api/serviceOrders';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import TransferProgressOverlay from '../components/TransferProgressOverlay';
import { useNavigate, useSearchParams } from 'react-router-dom';

const STATUS_CFG = {
  pending:     { bg: '#fef3c7', color: '#92400e', label: 'В обработке' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'В работе' },
  completed:   { bg: '#d1fae5', color: '#065f46', label: 'Выполнен' },
  cancelled:   { bg: '#fee2e2', color: '#991b1b', label: 'Отменён' },
};

const PAYMENT_CFG = { unpaid: { color: '#9ca3af', label: 'Не оплачен' }, paid: { color: '#3b82f6', label: 'Оплачен' } };

function isServiceOrderPaid(o) {
  if (o.paymentStatus === 'paid') return true;
  if (o.paymentStatus === 'unpaid') return false;
  return Number(o.amountPaid) > 0;
}

function serviceOrderTransactionSearchQuery(o) {
  if (o.paymentTransactionUid) return o.paymentTransactionUid;
  if (isServiceOrderPaid(o) && o.uid) return `Service ${o.uid}`;
  return '';
}

const thStyle = {
  padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700',
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
  whiteSpace: 'nowrap', borderRight: '1px solid #d1d5db', background: '#f9fafb', userSelect: 'none'
};
const tdStyle = {
  padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db',
  borderBottom: '1px solid #e5e7eb', verticalAlign: 'top', userSelect: 'text'
};

function CopyBtn({ value }) {
  return (
    <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(value).then(() => toast.success('Скопировано')); }}
      title="Скопировать"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0 0.2rem', display: 'inline-flex', alignItems: 'center' }}>
      <Copy size={11} />
    </button>
  );
}

function DateQuickFilters({ startDate, endDate, onSet }) {
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const presets = [
    { label: 'Сегодня', s: fmt(today), e: fmt(today) },
    { label: '7 дней', s: fmt(new Date(today - 6 * 86400000)), e: fmt(today) },
    { label: 'Месяц', s: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), e: fmt(today) },
  ];
  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {presets.map(p => {
        const active = startDate === p.s && endDate === p.e;
        return (
          <button key={p.label} type="button" onClick={() => active ? onSet('', '') : onSet(p.s, p.e)}
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

function FilesRow({ order, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [transferPct, setTransferPct] = useState(null);
  const [transferTitle, setTransferTitle] = useState('');
  const fileRef = useRef();

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    setUploading(true);
    setTransferTitle('Загрузка результата');
    setTransferPct(0);
    try {
      await uploadResultFiles(order._id, fd, {
        onUploadProgress: (p) => setTransferPct(p),
      });
      toast.success(`${files.length} файл(ов) загружено`);
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

  const handleDownloadCustomer = async (fileId, originalName) => {
    setTransferTitle('Скачивание файла клиента');
    setTransferPct(0);
    try {
      const blob = await downloadCustomerFile(order._id, fileId, {
        onDownloadProgress: (p) => setTransferPct(p),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName || 'file';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Файл сохранён');
    } catch (err) {
      toast.error(err.message || 'Ошибка скачивания');
    } finally {
      setTransferPct(null);
      setTransferTitle('');
    }
  };

  const handleDeleteFile = async (fileId) => {
    setDeleting(fileId);
    try {
      await deleteResultFile(order._id, fileId);
      toast.success('Файл удалён');
      onRefresh();
    } catch {
      toast.error('Ошибка удаления');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <tr>
      <td colSpan={7} style={{ padding: '0.75rem 1.5rem', background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
        <TransferProgressOverlay title={transferTitle} percent={transferPct} subtitle={order.uid} />
        <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: '#374151' }}>Ответы клиента:</div>
        {(order.responses || []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
            {order.responses.map((r, i) => (
              <div key={i} style={{ fontSize: '0.8rem', color: '#374151' }}>
                <strong>{r.label}:</strong> {Array.isArray(r.value) ? r.value.join(', ') : String(r.value ?? '')}
              </div>
            ))}
          </div>
        )}
        {(order.customerFiles || []).length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '0.3rem' }}>Файлы клиента:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {order.customerFiles.map(f => (
                <button key={f._id} type="button" onClick={() => handleDownloadCustomer(f._id, f.originalName)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '8px', padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: '#0369a1', cursor: 'pointer' }}>
                  <Download size={11} />
                  {f.originalName}
                  {f.size ? <span style={{ color: '#64748b' }}>({Math.round(f.size / 1024)}KB)</span> : null}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151' }}>
            Файлы результата ({order.resultFiles?.length || 0}):
          </span>
          {(order.resultFiles || []).map(f => (
            <div key={f._id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.3rem 0.6rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#374151', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.originalName}</span>
              <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>({Math.round((f.size || 0) / 1024)}KB)</span>
              <button onClick={() => handleDeleteFile(f._id)} disabled={deleting === f._id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <X size={12} />
              </button>
            </div>
          ))}
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1.5px solid #1f2937', background: 'transparent', color: '#1f2937', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer' }}>
            <Upload size={12} />
            {uploading ? 'Загрузка...' : 'Загрузить результат'}
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={handleUpload} />
        </div>
      </td>
    </tr>
  );
}

const ServiceOrders = () => {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [search, setSearch] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const navigate = useNavigate();

  useEffect(() => {
    const s = searchParams.get('search') || '';
    setSearchInput(s);
    setSearch(s);
    setCurrentPage(1);
  }, [searchParams]);

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const data = await getServiceOrders(params);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, startDate, endDate]);

  useEffect(() => { fetchOrders(currentPage); }, [fetchOrders, currentPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleStatusChange = async (order, newStatus) => {
    setUpdatingId(order._id);
    try {
      await updateServiceOrderStatus(order._id, newStatus);
      toast.success('Статус обновлён');
      fetchOrders(currentPage);
    } catch {
      toast.error('Ошибка обновления статуса');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#111827', margin: 0 }}>История заказанных услуг</h1>
          <p style={{ color: '#6b7280', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>Заявки клиентов на услуги</p>
        </div>
        <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Итого: {total}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Поиск по UID или услуге..."
              style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Найти</button>
        </form>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', background: '#fff', cursor: 'pointer' }}>
          <option value="">Все статусы</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <DateQuickFilters startDate={startDate} endDate={endDate}
          onSet={(s, e) => { setStartDate(s); setEndDate(e); setCurrentPage(1); }} />
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>UID</th>
                <th style={thStyle}>Клиент</th>
                <th style={thStyle}>Услуга</th>
                <th style={thStyle}>Статус</th>
                <th style={thStyle}>Оплата</th>
                <th style={thStyle}>Дата</th>
                <th style={{ ...thStyle, borderRight: 'none' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Загрузка...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Нет заявок</td></tr>
              ) : orders.map(order => {
                const cfg = STATUS_CFG[order.status] || STATUS_CFG.pending;
                const paid = isServiceOrderPaid(order);
                const payCfg = PAYMENT_CFG[paid ? 'paid' : 'unpaid'];
                const txSearch = serviceOrderTransactionSearchQuery(order);
                const isExp = expandedId === order._id;
                return (
                  <Fragment key={order._id}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(order._id)}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: '600', fontSize: '0.8rem', color: '#374151', fontFamily: 'monospace' }}>{order.uid}</span>
                        <CopyBtn value={order.uid} />
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: '600', fontSize: '0.82rem' }}>{order.customerId?.username || '—'}</div>
                        {order.customerId?.uid && <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace' }}>{order.customerId.uid}</div>}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: '600', fontSize: '0.82rem' }}>{order.serviceSnapshot?.title || order.serviceId?.title?.ru || '—'}</div>
                        {order.serviceSnapshot?.price ? <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>${order.serviceSnapshot.price}</div> : null}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-block', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-block', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
                            background: payCfg.color + '22', color: payCfg.color
                          }}>{payCfg.label}</span>
                          {txSearch ? (
                            <button
                              type="button"
                              title="Журнал транзакций (поиск по UID)"
                              onClick={() => navigate(`/transactions?search=${encodeURIComponent(txSearch)}`)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                padding: '0.25rem', borderRadius: '6px', border: '1.5px solid #e5e7eb', background: '#fff',
                                color: '#6b7280', cursor: 'pointer'
                              }}
                            >
                              <Receipt size={14} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '0.8rem', color: '#374151' }}>
                          {new Date(order.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, borderRight: 'none' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          {canManage && ['pending', 'in_progress', 'completed', 'cancelled'].map(s => s !== order.status && (
                            <button key={s} disabled={updatingId === order._id}
                              onClick={e => { e.stopPropagation(); handleStatusChange(order, s); }}
                              style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: `1.5px solid ${STATUS_CFG[s].color}`, background: 'transparent', color: STATUS_CFG[s].color, fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', opacity: updatingId === order._id ? 0.5 : 1 }}>
                              {STATUS_CFG[s].label}
                            </button>
                          ))}
                          <button onClick={e => { e.stopPropagation(); toggleExpand(order._id); }}
                            style={{ padding: '0.25rem 0.45rem', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            {isExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExp && <FilesRow order={order} onRefresh={() => fetchOrders(currentPage)} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginTop: '1.25rem' }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
            style={{ padding: '0.4rem 0.8rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', color: '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '0.85rem', color: '#374151' }}>{currentPage} / {pages}</span>
          <button disabled={currentPage === pages} onClick={() => setCurrentPage(p => p + 1)}
            style={{ padding: '0.4rem 0.8rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', color: '#374151', cursor: currentPage === pages ? 'not-allowed' : 'pointer' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
