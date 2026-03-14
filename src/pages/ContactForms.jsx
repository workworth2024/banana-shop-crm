import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, ChevronLeft, ChevronRight, CheckCircle, Clock, Search, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { getContactForms, updateContactFormStatus, deleteContactForm } from '../api/contactForms';
import { useAuthStore } from '../stores/authStore';

const StatusBadge = ({ status }) => {
  const isPending = status === 'Pending';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.3rem 0.75rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: '600',
      backgroundColor: isPending ? 'rgba(234, 179, 8, 0.1)' : 'rgba(16, 185, 129, 0.1)',
      color: isPending ? '#92400e' : '#065f46',
      border: `1px solid ${isPending ? 'rgba(234, 179, 8, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
    }}>
      {isPending ? <Clock size={12} /> : <CheckCircle size={12} />}
      {isPending ? 'Pending' : 'Answered'}
    </span>
  );
};

const ContactForms = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 20, search });
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const data = await getContactForms(params);
      setForms(data.forms);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Fetch contact forms error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleToggleStatus = async (form) => {
    const newStatus = form.status === 'Pending' ? 'Answered' : 'Pending';
    try {
      await updateContactFormStatus(form._id, newStatus);
      fetchForms();
      toast.success(newStatus === 'Answered' ? 'Отмечено как отвечено' : 'Возвращено в ожидание');
    } catch (err) {
      toast.error(err.message || 'Ошибка обновления статуса');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить форму связи?')) return;
    try {
      await deleteContactForm(id);
      fetchForms();
      toast.success('Форма удалена');
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Формы связи</h1>
        <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>Заявки от пользователей со страницы контактов</p>
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Поиск по имени, Telegram или email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[{ value: '', label: 'Все' }, { value: 'Pending', label: 'В ожидании' }, { value: 'Answered', label: 'Отвечено' }].map(opt => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setCurrentPage(1); }}
              style={{
                padding: '0.5rem 1rem', fontSize: '0.8125rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600',
                backgroundColor: statusFilter === opt.value ? '#374151' : '#f3f4f6',
                color: statusFilter === opt.value ? 'white' : '#4b5563'
              }}
            >
              {opt.label}
            </button>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <Calendar size={16} style={{ color: '#9ca3af' }} />
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} style={{ padding: '0.5rem', width: 'auto' }} />
            <span style={{ color: '#9ca3af' }}>—</span>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} style={{ padding: '0.5rem', width: 'auto' }} />
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Сбросить
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</div>
        ) : forms.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Форм связи нет</div>
        ) : (
          forms.map((form, idx) => (
            <div
              key={form._id}
              style={{
                borderBottom: idx < forms.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s'
                }}
                onClick={() => setExpandedId(expandedId === form._id ? null : form._id)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9375rem', color: 'var(--text-main)' }}>{form.name}</span>
                    <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>@{form.telegram.replace(/^@/, '')}</span>
                    {form.email && <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{form.email}</span>}
                    <StatusBadge status={form.status} />
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: '#9ca3af' }}>{formatDate(form.createdAt)}</div>
                </div>
                {canManage && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggleStatus(form)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: form.status === 'Pending' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        color: form.status === 'Pending' ? '#065f46' : '#92400e',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                      title={form.status === 'Pending' ? 'Отметить как отвечено' : 'Вернуть в ожидание'}
                    >
                      {form.status === 'Pending' ? <CheckCircle size={16} /> : <Clock size={16} />}
                    </button>
                    <button
                      onClick={() => handleDelete(form._id)}
                      style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {expandedId === form._id && (
                <div style={{
                  padding: '0 1.5rem 1.25rem 1.5rem',
                  backgroundColor: '#fafafa',
                  borderTop: '1px solid #f3f4f6'
                }}>
                  <p style={{ fontSize: '0.9375rem', color: '#374151', lineHeight: '1.65', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {form.message}
                  </p>
                </div>
              )}
            </div>
          ))
        )}

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Всего: <b>{total}</b></div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: currentPage === 1 ? '#d1d5db' : '#374151', borderRadius: '8px', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{currentPage} / {pages || 1}</span>
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
    </div>
  );
};

export default ContactForms;
