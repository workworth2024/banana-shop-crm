import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Search, Copy, Upload, ChevronDown, ChevronUp, X, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPreorders, updatePreorderStatus, uploadPreorderFiles, deletePreorderFile } from '../api/preorders';
import { useAuthStore } from '../stores/authStore';
import TransferProgressOverlay from '../components/TransferProgressOverlay';
import { useNavigate, useSearchParams } from 'react-router-dom';

const STATUS_CFG = {
  pending:     { bg: '#fef3c7', color: '#92400e', label: 'В обработке' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'В работе' },
  completed:   { bg: '#d1fae5', color: '#065f46', label: 'Выполнен' },
  cancelled:   { bg: '#fee2e2', color: '#991b1b', label: 'Отменён' },
};

const PAYMENT_CFG = { unpaid: { color: '#9ca3af', label: 'Не оплачен' }, paid: { color: '#3b82f6', label: 'Оплачен' } };

function isPreorderPaid(p) {
  if (p.paymentStatus === 'paid') return true;
  if (p.paymentStatus === 'unpaid') return false;
  return Number(p.amountPaid) > 0;
}

function preorderTransactionSearchQuery(p) {
  if (p.paymentTransactionUid) return p.paymentTransactionUid;
  if (isPreorderPaid(p) && p.uid) return `Preorder ${p.uid}`;
  return '';
}

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
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(value).then(() => toast.success('Скопировано')); }}
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

function FilesRow({ preorder, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [transferPct, setTransferPct] = useState(null);
  const fileRef = useRef();

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    setUploading(true);
    setTransferPct(0);
    try {
      await uploadPreorderFiles(preorder._id, fd, {
        onUploadProgress: (p) => setTransferPct(p),
      });
      toast.success(`${files.length} файл(ов) загружено`);
      onRefresh();
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
      setTransferPct(null);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId) => {
    setDeleting(fileId);
    try {
      await deletePreorderFile(preorder._id, fileId);
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
      <td colSpan={11} style={{ padding: '0.75rem 1.5rem', background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
        <TransferProgressOverlay title="Загрузка файлов предзаказа" percent={transferPct} subtitle={preorder.uid} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151' }}>
            Файлы ({preorder.files?.length || 0}):
          </span>
          {(preorder.files || []).map(f => (
            <div key={f._id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.3rem 0.6rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#374151', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.originalName}</span>
              <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>({Math.round((f.size || 0) / 1024)}KB)</span>
              <button onClick={() => handleDeleteFile(f._id)} disabled={deleting === f._id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <X size={12} />
              </button>
            </div>
          ))}
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1.5px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer' }}>
            <Upload size={12} />
            {uploading ? 'Загрузка...' : 'Загрузить файлы'}
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={handleUpload} />
        </div>
      </td>
    </tr>
  );
}

const Preorders = () => {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [preorders, setPreorders] = useState([]);
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

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const navigate = useNavigate();

  useEffect(() => {
    const s = searchParams.get('search') || '';
    setSearchInput(s);
    setSearch(s);
    setCurrentPage(1);
  }, [searchParams]);

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
    const labels = { completed: 'Выполнен', cancelled: 'Отменён', in_progress: 'В работе' };
    try {
      await updatePreorderStatus(id, status);
      fetchPreorders(currentPage);
      toast.success(labels[status] || 'Обновлено');
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    }
  };

  const handleReset = () => {
    setSearchInput(''); setSearch(''); setStatusFilter(''); setStartDate(''); setEndDate(''); setCurrentPage(1);
  };

  const getProductInfo = (p) => {
    const item = p.google_item_id;
    if (!item) return { title: '—', uid: '', mongoId: '' };
    return { title: item.title?.ru || item.title?.en || '—', uid: item.uid || '', mongoId: String(item._id) };
  };

  return (
    <div className="orders-page" style={{ padding: '2rem' }}>
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
                <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Поиск по имени, Telegram, UID..." style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Поиск</button>
              <button type="button" onClick={handleReset} style={{ padding: '0.55rem 0.875rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Сброс</button>
            </form>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: 'white', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}>
              <option value="">Все статусы</option>
              <option value="pending">В обработке</option>
              <option value="in_progress">В работе</option>
              <option value="completed">Выполненные</option>
              <option value="cancelled">Отменённые</option>
            </select>
          </div>
          <DateQuickFilters startDate={startDate} endDate={endDate} onSet={(s, e) => { setStartDate(s); setEndDate(e); setCurrentPage(1); }} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                {['UID', 'Имя', 'Telegram', 'Товар', 'Гео', 'Кол-во', 'Комментарий', 'Статус', 'Оплата', 'Дата', 'Файлы', 'Действия'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Загрузка...</td></tr>
              ) : preorders.length === 0 ? (
                <tr><td colSpan={12} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Предзаказов нет</td></tr>
              ) : preorders.map(p => {
                const cfg = STATUS_CFG[p.status] || {};
                const paid = isPreorderPaid(p);
                const payCfg = PAYMENT_CFG[paid ? 'paid' : 'unpaid'];
                const txSearch = preorderTransactionSearchQuery(p);
                const { title: productTitle, uid: productUid, mongoId: productMongoId } = getProductInfo(p);
                const isExpanded = expandedId === p._id;
                return (
                  <Fragment key={p._id}>
                    <tr>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#374151', fontWeight: '600' }}>{p.uid || p._id.slice(-8)}</span>
                          <CopyBtn value={p.uid || p._id} />
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div>
                          <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{p.name}</span>
                          {p.customerId && (
                            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                              @{p.customerId.username} #{p.customerId.uid}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '0.82rem', color: '#374151' }}>@{p.telegram?.replace(/^@/, '') || '—'}</span>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: '220px' }}>
                        {(productUid || productMongoId) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#9ca3af' }}>{productUid || productMongoId.slice(-8)}</span>
                            <CopyBtn value={productUid || productMongoId} />
                          </div>
                        )}
                        <span style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{productTitle}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {p.geo ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.18rem 0.5rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', background: '#eff6ff', color: '#1e40af' }}>
                            <img src={`https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${p.geo.toLowerCase()}.svg`} alt={p.geo} style={{ width: 14, height: 10, borderRadius: 1 }} onError={(e) => { e.target.style.display = 'none'; }} />
                            {p.geo}
                          </span>
                        ) : <span style={{ color: '#9ca3af' }}>—</span>}
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
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.73rem', fontWeight: '700',
                            background: payCfg.color + '22', color: payCfg.color
                          }}>{payCfg.label}</span>
                          {txSearch ? (
                            <button
                              type="button"
                              title="Журнал транзакций (поиск по UID)"
                              onClick={() => navigate(`/transactions?search=${encodeURIComponent(txSearch)}`)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                padding: '0.25rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: '#fff',
                                color: '#6b7280', cursor: 'pointer'
                              }}
                            >
                              <Receipt size={14} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.8rem', color: '#374151' }}>{new Date(p.createdAt).toLocaleDateString('ru-RU')}</div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(p.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button onClick={() => setExpandedId(isExpanded ? null : p._id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.5rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: isExpanded ? '#f3f4f6' : 'transparent', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', color: '#374151' }}>
                          {p.files?.length || 0}
                          {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      </td>
                      <td style={{ ...tdStyle, borderRight: 'none' }}>
                        {canManage && (
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            <button onClick={() => handleStatusChange(p._id, 'in_progress')} disabled={p.status === 'in_progress'} title="В работу" style={{ padding: '0.35rem', borderRadius: '7px', border: '1.5px solid #dbeafe', background: '#eff6ff', cursor: p.status === 'in_progress' ? 'not-allowed' : 'pointer', color: '#1e40af', opacity: p.status === 'in_progress' ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
                              <Clock size={13} />
                            </button>
                            <button onClick={() => handleStatusChange(p._id, 'completed')} disabled={p.status === 'completed'} title="Выполнен" style={{ padding: '0.35rem', borderRadius: '7px', border: '1.5px solid #d1fae5', background: '#ecfdf5', cursor: p.status === 'completed' ? 'not-allowed' : 'pointer', color: '#065f46', opacity: p.status === 'completed' ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
                              <CheckCircle size={13} />
                            </button>
                            <button onClick={() => handleStatusChange(p._id, 'cancelled')} disabled={p.status === 'cancelled'} title="Отменить" style={{ padding: '0.35rem', borderRadius: '7px', border: '1.5px solid #fee2e2', background: '#fff5f5', cursor: p.status === 'cancelled' ? 'not-allowed' : 'pointer', color: '#ef4444', opacity: p.status === 'cancelled' ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
                              <XCircle size={13} />
                            </button>

                          </div>
                        )}
                      </td>
                    </tr>
                    {isExpanded && canManage && (
                      <FilesRow preorder={p} onRefresh={() => fetchPreorders(currentPage)} />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Стр. {currentPage} / {pages} · Всего {total}</span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1, color: 'var(--text-main)', fontWeight: '600' }}>
              <ChevronLeft size={14} />
            </button>
            <button disabled={currentPage >= pages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: currentPage >= pages ? 'not-allowed' : 'pointer', opacity: currentPage >= pages ? 0.4 : 1, color: 'var(--text-main)', fontWeight: '600' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preorders;
