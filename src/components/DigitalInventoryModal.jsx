import { useState, useEffect, useRef } from 'react';
import { X, Upload, Download, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v3';

const STATUS_LABELS = { available: 'Доступен', sold: 'Продан' };
const STATUS_COLORS = { available: '#059669', sold: '#9ca3af' };

async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { credentials: 'include', ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Ошибка сервера');
  }
  return res;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function DigitalInventoryModal({ product, productType, onClose, onCountsChanged }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ available: 0, sold: 0 });
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingUid, setDownloadingUid] = useState(null);
  const fileInputRef = useRef(null);

  const fetchItems = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 20 });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch(
        `/digital-items/admin/${productType}/${product._id}?${params}`
      );
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setStats(data.stats || { available: 0, sold: 0 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(page); }, [page, statusFilter]);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    setUploading(true);
    try {
      const res = await apiFetch(
        `/digital-items/admin/${productType}/${product._id}`,
        { method: 'POST', body: fd }
      );
      const data = await res.json();
      toast.success(`Загружено ${data.uploaded} файл(ов). Остаток: ${data.newCount}`);
      fetchItems(1);
      setPage(1);
      if (onCountsChanged) onCountsChanged(data.newCount);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот файл?')) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/digital-items/admin/${id}`, { method: 'DELETE' });
      const data = await res.json();
      toast.success('Файл удалён');
      fetchItems(page);
      if (onCountsChanged) onCountsChanged(data.newCount);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (uid, originalName) => {
    setDownloadingUid(uid);
    try {
      const res = await fetch(`${BASE_URL}/digital-items/admin/download/${uid}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Ошибка скачивания');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName || `file-${uid}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloadingUid(null);
    }
  };

  const titleStr = product.title?.ru || product.title?.en || product.name || product._id;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontWeight: '700', margin: 0, fontSize: '1.1rem' }}>Цифровые файлы</h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6b7280' }}>{titleStr}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', background: '#ecfdf5', color: '#059669', padding: '0.25rem 0.7rem', borderRadius: '20px', fontWeight: '600' }}>
              Доступно: {stats.available}
            </span>
            <span style={{ fontSize: '0.8rem', background: '#f3f4f6', color: '#6b7280', padding: '0.25rem 0.7rem', borderRadius: '20px', fontWeight: '600' }}>
              Продано: {stats.sold}
            </span>
            <button onClick={onClose} style={{ padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#374151' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Upload zone */}
        <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid #f9fafb', flexShrink: 0 }}>
          <label
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              padding: '1rem', border: '2px dashed #e5e7eb', borderRadius: '12px',
              cursor: uploading ? 'not-allowed' : 'pointer', background: '#fafafa',
              transition: 'border-color 0.2s', color: '#6b7280', fontWeight: '500', fontSize: '0.9rem'
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload size={20} />
            {uploading ? 'Загрузка...' : 'Выберите или перетащите файлы сюда'}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Filters row */}
        <div style={{ padding: '0.75rem 2rem', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem', background: '#fff', color: '#374151' }}
          >
            <option value="">Все ({total})</option>
            <option value="available">Доступны ({stats.available})</option>
            <option value="sold">Проданы ({stats.sold})</option>
          </select>
          <button
            onClick={() => fetchItems(page)}
            style={{ padding: '0.4rem 0.75rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
          >
            <RefreshCw size={14} /> Обновить
          </button>
        </div>

        {/* Items list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 2rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #eab30833', borderTopColor: '#eab308', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : items.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem 0' }}>Нет файлов</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #f0f0f0' }}>Файл</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #f0f0f0' }}>Размер</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #f0f0f0' }}>Статус</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #f0f0f0' }}>UID</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #f0f0f0' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '0.6rem 0.75rem', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.originalName}>
                      {item.originalName}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#6b7280' }}>{formatSize(item.fileSize)}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '600', color: STATUS_COLORS[item.status], background: STATUS_COLORS[item.status] + '1a', padding: '0.2rem 0.55rem', borderRadius: '20px' }}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.78rem', color: '#9ca3af' }}>{item.uid}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleDownload(item.uid, item.originalName)}
                          disabled={downloadingUid === item.uid}
                          style={{ padding: '0.35rem 0.6rem', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                          title="Скачать"
                        >
                          <Download size={13} />
                        </button>
                        {item.status !== 'sold' && (
                          <button
                            onClick={() => handleDelete(item._id)}
                            disabled={deletingId === item._id}
                            style={{ padding: '0.35rem 0.6rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                            title="Удалить"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ padding: '0.75rem 2rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '0.4rem 0.75rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: page === 1 ? 0.5 : 1 }}
            >‹</button>
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{page} / {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '0.4rem 0.75rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: page >= pages ? 0.5 : 1 }}
            >›</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DigitalInventoryModal;
