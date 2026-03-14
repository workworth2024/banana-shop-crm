import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Filter as FilterIcon, 
  ChevronLeft, ChevronRight, FileText, X, Check,
  Settings2, Calendar, Link as LinkIcon, Download, PenLine
} from 'lucide-react';
import { getManuals, deleteManual } from '../api/manuals';
import { getFilters } from '../api/products';
import { useAuthStore } from '../stores/authStore';
import ArticleEditor from '../components/ArticleEditor';
import { useConfirm } from '../components/ConfirmDialog';
import { FileUploadInput } from '../components/FileUploadInput';
import toast from 'react-hot-toast';

const Manuals = () => {
  const [manuals, setManuals] = useState([]);
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingManual, setEditingManual] = useState(null);
  const [showArticleEditor, setShowArticleEditor] = useState(false);

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  // Form states
  const [manualForm, setManualForm] = useState({});
  const [manualFile, setManualFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [articleContentRu, setArticleContentRu] = useState('');
  const [articleContentEn, setArticleContentEn] = useState('');
  const { confirm, ConfirmNode } = useConfirm();

  const [columnWidths, setColumnWidths] = useState({
    id: 80,
    title: 200,
    desc: 300,
    link: 200,
    file: 200,
    filter: 150
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
      const data = await getFilters();
      setFilters(data);
    } catch (err) {
      console.error('Fetch filters error:', err);
    }
  }, []);

  const fetchManuals = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        search,
        filter: selectedFilter,
        startDate,
        endDate
      });
      
      const data = await getManuals(queryParams);
      setManuals(data.manuals);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Fetch manuals error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, selectedFilter, startDate, endDate]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchManuals();
  }, [fetchManuals]);

  const openManualModal = (manual = null) => {
    if (manual) {
      setEditingManual(manual);
      setManualForm({
        'title.ru': manual.title?.ru || '',
        'title.en': manual.title?.en || '',
        'desc.ru': manual.desc?.ru || '',
        'desc.en': manual.desc?.en || '',
        link: manual.link,
        filter_id: manual.filter_id,
        path_to_file: manual.path_to_file
      });
      setArticleContentRu(manual.content?.ru || '');
      setArticleContentEn(manual.content?.en || '');
    } else {
      setEditingManual(null);
      setManualForm({ 'title.ru': '', 'title.en': '', 'desc.ru': '', 'desc.en': '', link: '', filter_id: '' });
      setArticleContentRu('');
      setArticleContentEn('');
    }
    setManualFile(null);
    setShowManualModal(true);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm['title.ru'] && !manualForm['title.en']) {
      toast.error('Название должно быть заполнено на русском или английском языке');
      return;
    }
    if (!manualForm['desc.ru'] && !manualForm['desc.en']) {
      toast.error('Описание должно быть заполнено на русском или английском языке');
      return;
    }
    
    const formData = new FormData();
    formData.append('title.ru', manualForm['title.ru'] || '');
    formData.append('title.en', manualForm['title.en'] || '');
    formData.append('desc.ru', manualForm['desc.ru'] || '');
    formData.append('desc.en', manualForm['desc.en'] || '');
    formData.append('link', manualForm.link || '');
    formData.append('content.ru', articleContentRu || '');
    formData.append('content.en', articleContentEn || '');
    
    const filterId = manualForm.filter_id?._id || manualForm.filter_id || '';
    formData.append('filter_id', filterId);

    if (manualFile) {
      formData.append('file', manualFile);
    }

    const isEdit = !!editingManual;
    const url = `${import.meta.env.VITE_API_URL}/api/v3/${isEdit ? `manuals/${editingManual._id}` : 'manuals'}`;
    const token = localStorage.getItem('token');

    try {
      setUploadProgress(manualFile ? 0 : null);
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(isEdit ? 'PUT' : 'POST', url);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        if (manualFile) {
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          };
        }
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(xhr.responseText));
        xhr.onerror = () => reject(new Error('Ошибка сети'));
        xhr.send(formData);
      });
      setUploadProgress(null);
      setShowManualModal(false);
      fetchManuals();
      toast.success(isEdit ? 'Мануал успешно изменён' : 'Мануал успешно добавлен');
    } catch (err) {
      setUploadProgress(null);
      toast.error(err.message || 'Ошибка сохранения');
    }
  };

  const handleDeleteManual = async (id) => {
    const ok = await confirm('Вы уверены, что хотите удалить этот мануал?');
    if (!ok) return;
    try {
      await deleteManual(id);
      fetchManuals();
      toast.success('Мануал удалён');
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Мануалы</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>Управление инструкциями и руководствами</p>
        </div>
        {canManage && (
          <button onClick={() => openManualModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} />
            Добавить мануал
          </button>
        )}
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" placeholder="Поиск мануала..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
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
              <th style={{ width: `${columnWidths.title}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Название <Resizer onResize={(w) => handleResize('title', w)} />
              </th>
              <th style={{ width: `${columnWidths.desc}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Описание <Resizer onResize={(w) => handleResize('desc', w)} />
              </th>
              <th style={{ width: `${columnWidths.link}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Ссылка <Resizer onResize={(w) => handleResize('link', w)} />
              </th>
              <th style={{ width: `${columnWidths.file}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Файл <Resizer onResize={(w) => handleResize('file', w)} />
              </th>
              <th style={{ width: `${columnWidths.filter}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Фильтр <Resizer onResize={(w) => handleResize('filter', w)} />
              </th>
              <th style={{ width: '120px', padding: '1rem 1.5rem', textAlign: 'right' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</td></tr>
            ) : manuals.length === 0 ? (
              <tr><td colSpan="10" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Мануалы не найдены</td></tr>
            ) : manuals.map(m => (
              <tr key={m._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <ClickableCell text={m._id} style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>{m._id.slice(-6)}</ClickableCell>
                <ClickableCell text={m.title?.ru || m.title?.en || ''} style={{ fontWeight: '600', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title?.ru || m.title?.en || ''}</ClickableCell>
                <ClickableCell text={m.desc?.ru || m.desc?.en || ''} style={{ fontSize: '0.8125rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.desc?.ru || m.desc?.en || ''}</ClickableCell>
                <ClickableCell text={m.link} style={{ fontSize: '0.8125rem', color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.link ? <a href={m.link} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'inherit', textDecoration: 'none' }}><LinkIcon size={14} /> Открыть</a> : '—'}
                </ClickableCell>
                <ClickableCell text={m.path_to_file} style={{ fontSize: '0.8125rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.path_to_file ? <a href={`${import.meta.env.VITE_API_URL}${m.path_to_file}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', textDecoration: 'none' }}><Download size={14} /> Скачать</a> : '—'}
                </ClickableCell>
                <ClickableCell text={m.filter_id ? (m.filter_id.name.ru || m.filter_id.name.en) : ''}>
                  {m.filter_id ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '8px', backgroundColor: `${m.filter_id.color}10`, color: m.filter_id.color, border: `1px solid ${m.filter_id.color}30`, fontSize: '0.75rem', fontWeight: '600' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: m.filter_id.color }} />
                      {m.filter_id.name.ru || m.filter_id.name.en}
                    </div>
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>
                  )}
                </ClickableCell>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => openManualModal(m)} style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '8px' }} title="Редактировать"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteManual(m._id)} style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px' }} title="Удалить"><Trash2 size={16} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Всего: <b>{total}</b> мануалов</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ opacity: currentPage === 1 ? 0.5 : 1 }}><ChevronLeft size={18} /></button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', fontWeight: '600' }}>{currentPage} / {pages}</div>
            <button disabled={currentPage === pages} onClick={() => setCurrentPage(p => p + 1)} style={{ opacity: currentPage === pages ? 0.5 : 1 }}><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {showManualModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: '700' }}>{editingManual ? 'Редактировать' : 'Добавить'} мануал</h2>
              <button type="button" onClick={() => setShowManualModal(false)} style={{ padding: '0.5rem', backgroundColor: '#d1d5db', color: '#111827', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Название *</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input type="text" placeholder="Русский" value={manualForm['title.ru'] || ''} onChange={(e) => setManualForm({...manualForm, 'title.ru': e.target.value})} style={{ flex: 1 }} />
                  <input type="text" placeholder="English" value={manualForm['title.en'] || ''} onChange={(e) => setManualForm({...manualForm, 'title.en': e.target.value})} style={{ flex: 1 }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Описание *</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <textarea placeholder="Русский" style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }} value={manualForm['desc.ru'] || ''} onChange={(e) => setManualForm({...manualForm, 'desc.ru': e.target.value})} />
                  <textarea placeholder="English" style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }} value={manualForm['desc.en'] || ''} onChange={(e) => setManualForm({...manualForm, 'desc.en': e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Ссылка (внешняя)</label>
                <input type="text" value={manualForm.link || ''} onChange={(e) => setManualForm({...manualForm, link: e.target.value})} placeholder="https://..." />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Статья (контент)</label>
                <button
                  type="button"
                  onClick={() => setShowArticleEditor(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', backgroundColor: (articleContentRu || articleContentEn) ? '#16a34a' : '#1f2937', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}
                >
                  <PenLine size={18} />
                  {(articleContentRu || articleContentEn) ? '✓ Статья написана — редактировать' : 'Написать статью'}
                </button>
                {(articleContentRu || articleContentEn) && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    RU: {articleContentRu ? `${articleContentRu.replace(/<[^>]+>/g, '').substring(0, 60)}...` : '—'} &nbsp;|&nbsp;
                    EN: {articleContentEn ? `${articleContentEn.replace(/<[^>]+>/g, '').substring(0, 60)}...` : '—'}
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Фильтр</label>
                <select value={manualForm.filter_id?._id || manualForm.filter_id || ''} onChange={(e) => setManualForm({...manualForm, filter_id: e.target.value})}>
                  <option value="">Без фильтра</option>
                  {filters.map(f => <option key={f._id} value={f._id}>{f.name.ru || f.name.en}</option>)}
                </select>
              </div>
              <FileUploadInput
                file={manualFile}
                onChange={setManualFile}
                currentFileUrl={editingManual?.path_to_file}
                uploadProgress={uploadProgress}
                label="Файл (PDF, ZIP и др.)"
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowManualModal(false)} style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#4b5563' }}>Отмена</button>
                <button type="submit" style={{ flex: 1 }}>Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showArticleEditor && (
        <ArticleEditor
          valuRu={articleContentRu}
          valueEn={articleContentEn}
          onChangeRu={setArticleContentRu}
          onChangeEn={setArticleContentEn}
          onClose={() => setShowArticleEditor(false)}
        />
      )}
      {ConfirmNode}
    </div>
  );
};

export default Manuals;
