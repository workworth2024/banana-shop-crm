import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2,
  ChevronLeft, ChevronRight, MessageSquare, X, Link as LinkIcon
} from 'lucide-react';
import api from '../api/client';
import { useAuthStore } from '../stores/authStore';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [form, setForm] = useState({ 'text.ru': '', 'text.en': '', link: '' });

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [columnWidths, setColumnWidths] = useState({
    id: 80,
    textRu: 280,
    textEn: 280,
    link: 200
  });

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  const handleResize = (column, newWidth) => {
    setColumnWidths(prev => ({ ...prev, [column]: Math.max(newWidth, 50) }));
  };

  const Resizer = ({ onResize }) => {
    const onMouseDown = (e) => {
      const startX = e.pageX;
      const startWidth = e.target.parentElement.offsetWidth;
      const onMouseMove = (moveEvent) => onResize(startWidth + (moveEvent.pageX - startX));
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
    return (
      <div
        onMouseDown={onMouseDown}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px', cursor: 'col-resize', zIndex: 1, backgroundColor: 'transparent' }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      />
    );
  };

  const ClickableCell = ({ children, text, style = {} }) => (
    <td
      onClick={() => copyToClipboard(text || children?.toString() || '')}
      style={{ padding: '1rem 1.5rem', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', ...style }}
      title="Нажмите, чтобы скопировать"
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {children}
    </td>
  );

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ page: currentPage, search }).toString();
      const data = await api.get(`/reviews?${queryParams}`);
      setReviews(data.reviews);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Fetch reviews error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const openModal = (review = null) => {
    if (review) {
      setEditingReview(review);
      setForm({
        'text.ru': review.text?.ru || '',
        'text.en': review.text?.en || '',
        link: review.link || ''
      });
    } else {
      setEditingReview(null);
      setForm({ 'text.ru': '', 'text.en': '', link: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form['text.ru'] && !form['text.en']) {
      alert('Текст должен быть заполнен на русском или английском языке');
      return;
    }
    try {
      if (editingReview) {
        await api.put(`/reviews/${editingReview._id}`, form);
      } else {
        await api.post('/reviews', form);
      }
      setShowModal(false);
      fetchReviews();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить отзыв?')) return;
    try {
      await api.delete(`/reviews/${id}`);
      fetchReviews();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Отзывы</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>Управление отзывами пользователей</p>
        </div>
        {canManage && (
          <button onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} />
            Добавить отзыв
          </button>
        )}
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Поиск по тексту..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '2.5rem', width: '100%', maxWidth: '400px' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ width: `${columnWidths.id}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                ID <Resizer onResize={(w) => handleResize('id', w)} />
              </th>
              <th style={{ width: `${columnWidths.textRu}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Текст (RU) <Resizer onResize={(w) => handleResize('textRu', w)} />
              </th>
              <th style={{ width: `${columnWidths.textEn}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Текст (EN) <Resizer onResize={(w) => handleResize('textEn', w)} />
              </th>
              <th style={{ width: `${columnWidths.link}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Ссылка <Resizer onResize={(w) => handleResize('link', w)} />
              </th>
              <th style={{ width: '120px', padding: '1rem 1.5rem', textAlign: 'right' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Отзывы не найдены</td></tr>
            ) : reviews.map(r => (
              <tr key={r._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <ClickableCell text={r._id} style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                  {r._id.slice(-6)}
                </ClickableCell>
                <ClickableCell text={r.text?.ru || ''} style={{ fontSize: '0.875rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.text?.ru || <span style={{ color: '#d1d5db' }}>—</span>}
                </ClickableCell>
                <ClickableCell text={r.text?.en || ''} style={{ fontSize: '0.875rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.text?.en || <span style={{ color: '#d1d5db' }}>—</span>}
                </ClickableCell>
                <ClickableCell text={r.link} style={{ fontSize: '0.8125rem', color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.link ? (
                    <a href={r.link} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'inherit', textDecoration: 'none' }}>
                      <LinkIcon size={14} /> Открыть
                    </a>
                  ) : <span style={{ color: '#d1d5db' }}>—</span>}
                </ClickableCell>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => openModal(r)} style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '8px' }} title="Редактировать">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(r._id)} style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px' }} title="Удалить">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Всего: <b>{total}</b> отзывов</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: currentPage === 1 ? '#d1d5db' : '#374151', borderRadius: '8px', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{currentPage} / {pages}</span>
            <button
              disabled={currentPage === pages || pages === 0}
              onClick={() => setCurrentPage(p => p + 1)}
              style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: (currentPage === pages || pages === 0) ? '#d1d5db' : '#374151', borderRadius: '8px', border: 'none', cursor: (currentPage === pages || pages === 0) ? 'not-allowed' : 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '600px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {editingReview ? 'Редактировать отзыв' : 'Добавить отзыв'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ padding: '0.5rem', backgroundColor: '#d1d5db', color: '#111827', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Текст (RU)
                </label>
                <textarea
                  value={form['text.ru']}
                  onChange={(e) => setForm(f => ({ ...f, 'text.ru': e.target.value }))}
                  placeholder="Текст отзыва на русском..."
                  rows={4}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9375rem', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Текст (EN)
                </label>
                <textarea
                  value={form['text.en']}
                  onChange={(e) => setForm(f => ({ ...f, 'text.en': e.target.value }))}
                  placeholder="Review text in English..."
                  rows={4}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9375rem', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Ссылка
                </label>
                <input
                  type="text"
                  value={form.link}
                  onChange={(e) => setForm(f => ({ ...f, link: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f3f4f6', color: '#374151', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
                  Отмена
                </button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                  {editingReview ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;
