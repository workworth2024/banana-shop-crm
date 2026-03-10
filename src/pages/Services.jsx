import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Filter as FilterIcon, 
  ChevronLeft, ChevronRight, Image as ImageIcon, X, Check,
  Settings2, Calendar
} from 'lucide-react';
import api from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useConfirm } from '../components/ConfirmDialog';
import { ImageUploadInput } from '../components/FileUploadInput';
import toast from 'react-hot-toast';

const Services = () => {
  const [services, setServices] = useState([]);
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  // Form states
  const [serviceForm, setServiceForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const { confirm, ConfirmNode } = useConfirm();

  const [columnWidths, setColumnWidths] = useState({
    id: 80,
    image: 80,
    title: 200,
    subTitle: 150,
    desc: 250,
    subDesc: 200,
    price: 100,
    filter: 150,
    link: 180
  });

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  const handleResize = (column, newWidth) => {
    setColumnWidths(prev => ({
      ...prev,
      [column]: Math.max(newWidth, 50)
    }));
  };

  const Resizer = ({ onResize }) => {
    const onMouseDown = (e) => {
      const startX = e.pageX;
      const startWidth = e.target.parentElement.offsetWidth;
      const onMouseMove = (moveEvent) => {
        const newWidth = startWidth + (moveEvent.pageX - startX);
        onResize(newWidth);
      };
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

  const fetchFilters = useCallback(async () => {
    try {
      const data = await api.get('/products/filters');
      setFilters(data);
    } catch (err) {
      console.error('Fetch filters error:', err);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        search,
        filter: selectedFilter,
        startDate,
        endDate
      }).toString();
      
      const data = await api.get(`/services?${queryParams}`);
      setServices(data.services);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Fetch services error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, selectedFilter, startDate, endDate]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const openServiceModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        'title.ru': service.title?.ru || '',
        'title.en': service.title?.en || '',
        'sub_title.ru': service.sub_title?.ru || '',
        'sub_title.en': service.sub_title?.en || '',
        'desc.ru': service.desc?.ru || '',
        'desc.en': service.desc?.en || '',
        'sub_desc.ru': service.sub_desc?.ru || '',
        'sub_desc.en': service.sub_desc?.en || '',
        price: service.price,
        filter_id: service.filter_id,
        path_image: service.path_image,
        link: service.link || ''
      });
    } else {
      setEditingService(null);
      setServiceForm({ 'title.ru': '', 'title.en': '', 'sub_title.ru': '', 'sub_title.en': '', 'desc.ru': '', 'desc.en': '', 'sub_desc.ru': '', 'sub_desc.en': '', price: 0, filter_id: '', link: '' });
    }
    setImageFile(null);
    setShowServiceModal(true);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (!serviceForm['title.ru'] && !serviceForm['title.en']) {
      toast.error('Название должно быть заполнено на русском или английском языке');
      return;
    }
    if (!serviceForm['desc.ru'] && !serviceForm['desc.en']) {
      toast.error('Описание должно быть заполнено на русском или английском языке');
      return;
    }
    
    const formData = new FormData();
    formData.append('title.ru', serviceForm['title.ru'] || '');
    formData.append('title.en', serviceForm['title.en'] || '');
    formData.append('sub_title.ru', serviceForm['sub_title.ru'] || '');
    formData.append('sub_title.en', serviceForm['sub_title.en'] || '');
    formData.append('desc.ru', serviceForm['desc.ru'] || '');
    formData.append('desc.en', serviceForm['desc.en'] || '');
    formData.append('sub_desc.ru', serviceForm['sub_desc.ru'] || '');
    formData.append('sub_desc.en', serviceForm['sub_desc.en'] || '');
    formData.append('price', serviceForm.price);
    formData.append('link', serviceForm.link || '');
    
    const filterId = serviceForm.filter_id?._id || serviceForm.filter_id || '';
    formData.append('filter_id', filterId);

    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      if (editingService) {
        await api.request(`/services/${editingService._id}`, { method: 'PUT', body: formData });
        toast.success('Услуга успешно изменена');
      } else {
        await api.request('/services', { method: 'POST', body: formData });
        toast.success('Услуга успешно добавлена');
      }
      setShowServiceModal(false);
      fetchServices();
    } catch (err) {
      toast.error(err.message || 'Ошибка сохранения');
    }
  };

  const handleDeleteService = async (id) => {
    const ok = await confirm('Вы уверены, что хотите удалить эту услугу?');
    if (!ok) return;
    try {
      await api.request(`/services/${id}`, { method: 'DELETE' });
      fetchServices();
      toast.success('Услуга удалена');
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Услуги</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>Управление предоставляемыми услугами</p>
        </div>
        {canManage && (
          <button onClick={() => openServiceModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} />
            Добавить услугу
          </button>
        )}
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" placeholder="Поиск услуги..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 2 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Фильтры (теги)</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedFilter('')} style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', backgroundColor: selectedFilter === '' ? '#374151' : '#f3f4f6', color: selectedFilter === '' ? 'white' : '#4b5563', border: 'none' }}>
                Все фильтры
              </button>
              {filters.map(f => (
                <button key={f._id} onClick={() => setSelectedFilter(f._id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8125rem', backgroundColor: selectedFilter === f._id ? `${f.color}20` : '#f3f4f6', color: selectedFilter === f._id ? f.color : '#4b5563', border: selectedFilter === f._id ? `1px solid ${f.color}` : '1px solid transparent', fontWeight: selectedFilter === f._id ? '700' : '400' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: f.color }} />
                  {f.name.ru || f.name.en}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            <Calendar size={16} />
            <span>Период создания:</span>
          </div>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: 'auto', padding: '0.5rem' }} />
          <span style={{ color: '#9ca3af' }}>—</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: 'auto', padding: '0.5rem' }} />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '0.5rem 1rem', fontSize: '0.75rem' }}>Сбросить даты</button>
          )}
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px', tableLayout: 'fixed' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ width: `${columnWidths.id}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                ID <Resizer onResize={(w) => handleResize('id', w)} />
              </th>
              <th style={{ width: `${columnWidths.image}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Фотка <Resizer onResize={(w) => handleResize('image', w)} />
              </th>
              <th style={{ width: `${columnWidths.title}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Название <Resizer onResize={(w) => handleResize('title', w)} />
              </th>
              <th style={{ width: `${columnWidths.subTitle}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Подзаголовок <Resizer onResize={(w) => handleResize('subTitle', w)} />
              </th>
              <th style={{ width: `${columnWidths.desc}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Описание <Resizer onResize={(w) => handleResize('desc', w)} />
              </th>
              <th style={{ width: `${columnWidths.subDesc}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Доп. Описание <Resizer onResize={(w) => handleResize('subDesc', w)} />
              </th>
              <th style={{ width: `${columnWidths.price}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Цена <Resizer onResize={(w) => handleResize('price', w)} />
              </th>
              <th style={{ width: `${columnWidths.filter}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Фильтр <Resizer onResize={(w) => handleResize('filter', w)} />
              </th>
              <th style={{ width: `${columnWidths.link}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Ссылка <Resizer onResize={(w) => handleResize('link', w)} />
              </th>
              <th style={{ width: '120px', padding: '1rem 1.5rem', textAlign: 'right' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</td></tr>
            ) : services.length === 0 ? (
              <tr><td colSpan="10" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Услуги не найдены</td></tr>
            ) : services.map(s => (
              <tr key={s._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <ClickableCell text={s._id} style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>{s._id.slice(-6)}</ClickableCell>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}>
                    {s.path_image ? <img src={`${import.meta.env.VITE_API_URL}${s.path_image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={18} color="#9ca3af" />}
                  </div>
                </td>
                <ClickableCell text={s.title?.ru || s.title?.en || ''} style={{ fontWeight: '600', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title?.ru || s.title?.en || ''}</ClickableCell>
                <ClickableCell text={s.sub_title?.ru || s.sub_title?.en || ''} style={{ fontSize: '0.875rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sub_title?.ru || s.sub_title?.en || '—'}</ClickableCell>
                <ClickableCell text={s.desc?.ru || s.desc?.en || ''} style={{ fontSize: '0.8125rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.desc?.ru || s.desc?.en || ''}</ClickableCell>
                <ClickableCell text={s.sub_desc?.ru || s.sub_desc?.en || ''} style={{ fontSize: '0.8125rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sub_desc?.ru || s.sub_desc?.en || '—'}</ClickableCell>
                <ClickableCell text={s.price.toString()} style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1rem' }}>${s.price}</ClickableCell>
                <ClickableCell text={s.filter_id ? (s.filter_id.name.ru || s.filter_id.name.en) : ''}>
                  {s.filter_id ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '8px', backgroundColor: `${s.filter_id.color}10`, color: s.filter_id.color, border: `1px solid ${s.filter_id.color}30`, fontSize: '0.75rem', fontWeight: '600' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: s.filter_id.color }} />
                      {s.filter_id.name.ru || s.filter_id.name.en}
                    </div>
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>
                  )}
                </ClickableCell>
                <ClickableCell text={s.link || ''} style={{ fontSize: '0.8125rem', color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.link ? <a href={s.link} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }} onClick={e => e.stopPropagation()}>{s.link}</a> : '—'}
                </ClickableCell>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => openServiceModal(s)} style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '8px' }} title="Редактировать"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteService(s._id)} style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px' }} title="Удалить"><Trash2 size={16} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Всего: <b>{total}</b> услуг</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ opacity: currentPage === 1 ? 0.5 : 1 }}><ChevronLeft size={18} /></button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', fontWeight: '600' }}>{currentPage} / {pages}</div>
            <button disabled={currentPage === pages} onClick={() => setCurrentPage(p => p + 1)} style={{ opacity: currentPage === pages ? 0.5 : 1 }}><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {showServiceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: '700' }}>{editingService ? 'Редактировать' : 'Добавить'} услугу</h2>
              <button type="button" onClick={() => setShowServiceModal(false)} style={{ padding: '0.5rem', backgroundColor: '#d1d5db', color: '#111827', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleServiceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Название</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input type="text" placeholder="Русский" value={serviceForm['title.ru'] || ''} onChange={(e) => setServiceForm({...serviceForm, 'title.ru': e.target.value})} style={{ flex: 1 }} />
                  <input type="text" placeholder="English" value={serviceForm['title.en'] || ''} onChange={(e) => setServiceForm({...serviceForm, 'title.en': e.target.value})} style={{ flex: 1 }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Подзаголовок</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input type="text" placeholder="Русский" value={serviceForm['sub_title.ru'] || ''} onChange={(e) => setServiceForm({...serviceForm, 'sub_title.ru': e.target.value})} style={{ flex: 1 }} />
                  <input type="text" placeholder="English" value={serviceForm['sub_title.en'] || ''} onChange={(e) => setServiceForm({...serviceForm, 'sub_title.en': e.target.value})} style={{ flex: 1 }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Описание *</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <textarea placeholder="Русский" style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }} value={serviceForm['desc.ru'] || ''} onChange={(e) => setServiceForm({...serviceForm, 'desc.ru': e.target.value})} />
                  <textarea placeholder="English" style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }} value={serviceForm['desc.en'] || ''} onChange={(e) => setServiceForm({...serviceForm, 'desc.en': e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Дополнительное описание</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <textarea placeholder="Русский" style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }} value={serviceForm['sub_desc.ru'] || ''} onChange={(e) => setServiceForm({...serviceForm, 'sub_desc.ru': e.target.value})} />
                  <textarea placeholder="English" style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }} value={serviceForm['sub_desc.en'] || ''} onChange={(e) => setServiceForm({...serviceForm, 'sub_desc.en': e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Цена ($)</label><input type="number" step="0.01" value={serviceForm.price || 0} onChange={(e) => setServiceForm({...serviceForm, price: e.target.value})} required /></div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Фильтр</label>
                  <select value={serviceForm.filter_id?._id || serviceForm.filter_id || ''} onChange={(e) => setServiceForm({...serviceForm, filter_id: e.target.value})}>
                    <option value="">Без фильтра</option>
                    {filters.map(f => <option key={f._id} value={f._id}>{f.name.ru || f.name.en}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Ссылка</label>
                <input type="url" placeholder="https://..." value={serviceForm.link || ''} onChange={(e) => setServiceForm({...serviceForm, link: e.target.value})} />
              </div>
              <ImageUploadInput
                file={imageFile}
                onChange={setImageFile}
                currentImageUrl={editingService?.path_image}
                label="Изображение"
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowServiceModal(false)} style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#4b5563' }}>Отмена</button>
                <button type="submit" style={{ flex: 1 }}>Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {ConfirmNode}
    </div>
  );
};

export default Services;
