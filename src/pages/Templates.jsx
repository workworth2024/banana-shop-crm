import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, FileText } from 'lucide-react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/templates';
import { useAuthStore } from '../stores/authStore';
import { useConfirm } from '../components/ConfirmDialog';
import toast from 'react-hot-toast';

const emptyForm = () => ({
  title: { ru: '', en: '' },
  content: { ru: '', en: '' }
});

const inputStyle = {
  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px',
  border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box'
};
const labelStyle = { fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem', display: 'block' };

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const { confirm, ConfirmNode } = useConfirm();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    setForm({
      title: { ru: tpl.title?.ru || '', en: tpl.title?.en || '' },
      content: { ru: tpl.content?.ru || '', en: tpl.content?.en || '' }
    });
    setShowModal(true);
  };

  const handleDelete = async (tpl) => {
    const ok = await confirm({ title: 'Удалить шаблон?', message: `«${tpl.title?.ru || tpl.title?.en}» будет удалён.` });
    if (!ok) return;
    try {
      await deleteTemplate(tpl._id);
      toast.success('Шаблон удалён');
      fetchTemplates();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const updateLang = (field, lang, value) =>
    setForm(f => ({ ...f, [field]: { ...f[field], [lang]: value } }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title?.ru && !form.title?.en) return toast.error('Введите название');
    if (!form.content?.ru && !form.content?.en) return toast.error('Введите содержимое');
    setSaving(true);
    try {
      const payload = {
        'title.ru': form.title.ru, 'title.en': form.title.en,
        'content.ru': form.content.ru, 'content.en': form.content.en
      };
      if (editing) {
        await updateTemplate(editing._id, payload);
        toast.success('Шаблон обновлён');
      } else {
        await createTemplate(payload);
        toast.success('Шаблон создан');
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      toast.error(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const filtered = templates.filter(tpl => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (tpl.title?.ru || '').toLowerCase().includes(s) ||
      (tpl.title?.en || '').toLowerCase().includes(s) ||
      (tpl.uid || '').toLowerCase().includes(s);
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {ConfirmNode}
      <div className="crm-page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#111827', margin: 0 }}>Шаблоны</h1>
          <p style={{ color: '#6b7280', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>Переиспользуемые блоки (правила, что входит в комплект и т.д.) для товаров Google Ads</p>
        </div>
        {canManage && (
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
            <Plus size={15} /> Новый шаблон
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Итого: {filtered.length}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Нет шаблонов</div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filtered.map(tpl => (
            <div key={tpl._id} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <FileText size={18} color="#9ca3af" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827' }}>{tpl.title?.ru || tpl.title?.en || '—'}</div>
                {tpl.title?.en && tpl.title?.ru !== tpl.title?.en && (
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{tpl.title.en}</div>
                )}
                {(tpl.content?.ru || tpl.content?.en) && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {tpl.content?.ru || tpl.content?.en}
                  </div>
                )}
                <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: '#9ca3af' }}>{tpl.uid}</div>
              </div>
              {canManage && (
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button onClick={() => openEdit(tpl)} style={{ padding: '0.4rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#374151' }}>
                    <Edit2 size={12} /> Изменить
                  </button>
                  <button onClick={() => handleDelete(tpl)} style={{ padding: '0.4rem 0.75rem', border: 'none', borderRadius: '8px', background: '#fee2e2', cursor: 'pointer', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="crm-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}>
          <div className="crm-modal-card" style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '640px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{editing ? 'Редактировать шаблон' : 'Новый шаблон'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={labelStyle}>Название (RU) *</label>
                  <input style={inputStyle} value={form.title.ru} onChange={e => updateLang('title', 'ru', e.target.value)} placeholder="напр. Правила" />
                </div>
                <div>
                  <label style={labelStyle}>Название (EN)</label>
                  <input style={inputStyle} value={form.title.en} onChange={e => updateLang('title', 'en', e.target.value)} placeholder="e.g. Rules" />
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={labelStyle}>Содержимое (RU) *</label>
                <textarea style={{ ...inputStyle, minHeight: '140px', resize: 'vertical' }} value={form.content.ru} onChange={e => updateLang('content', 'ru', e.target.value)} placeholder="Любой текст, эмодзи поддерживаются 🎯" />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Содержимое (EN)</label>
                <textarea style={{ ...inputStyle, minHeight: '140px', resize: 'vertical' }} value={form.content.en} onChange={e => updateLang('content', 'en', e.target.value)} placeholder="Any text, emoji supported 🎯" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.6rem 1.1rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>Отмена</button>
                <button type="submit" disabled={saving} style={{ padding: '0.6rem 1.25rem', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.85rem', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Сохранение...' : (editing ? 'Сохранить' : 'Создать')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
