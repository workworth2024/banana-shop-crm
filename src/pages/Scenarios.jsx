import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { getScenarios, createScenario, updateScenario, deleteScenario } from '../api/scenarios';
import { useAuthStore } from '../stores/authStore';
import { useConfirm } from '../components/ConfirmDialog';
import toast from 'react-hot-toast';

const FIELD_TYPES = [
  { value: 'text', label: 'Текст (строка)' },
  { value: 'textarea', label: 'Текст (многострочный)' },
  { value: 'number', label: 'Число' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Телефон' },
  { value: 'select', label: 'Выбор из списка' },
  { value: 'file', label: 'Файл(ы)' },
];

const emptyStep = () => ({
  _tmpId: Math.random().toString(36).slice(2),
  order: 1,
  label: { ru: '', en: '' },
  description: { ru: '', en: '' },
  fieldType: 'text',
  options: [],
  required: true,
  maxFiles: 5
});

const emptyForm = () => ({
  title: { ru: '', en: '' },
  description: { ru: '', en: '' },
  steps: []
});

const inputStyle = {
  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px',
  border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box'
};
const labelStyle = { fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem', display: 'block' };

function StepEditor({ step, index, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [optionInput, setOptionInput] = useState('');

  const update = (field, value) => onChange({ ...step, [field]: value });
  const updateLang = (field, lang, value) => onChange({ ...step, [field]: { ...step[field], [lang]: value } });
  const addOption = () => {
    if (!optionInput.trim()) return;
    update('options', [...(step.options || []), { ru: optionInput.trim(), en: optionInput.trim() }]);
    setOptionInput('');
  };
  const removeOption = (i) => update('options', step.options.filter((_, idx) => idx !== i));

  return (
    <div style={{ border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem', background: '#fafafa' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <GripVertical size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6b7280' }}>Шаг {index + 1}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem' }}>
          <button type="button" onClick={onMoveUp} disabled={isFirst}
            style={{ padding: '0.2rem 0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', color: '#374151', cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1 }}>
            <ChevronUp size={12} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={isLast}
            style={{ padding: '0.2rem 0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', color: '#374151', cursor: isLast ? 'not-allowed' : 'pointer', opacity: isLast ? 0.4 : 1 }}>
            <ChevronDown size={12} />
          </button>
          <button type="button" onClick={onRemove}
            style={{ padding: '0.2rem 0.4rem', border: 'none', borderRadius: '6px', background: '#fee2e2', cursor: 'pointer', color: '#991b1b' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
        <div>
          <label style={labelStyle}>Название (RU) *</label>
          <input style={inputStyle} value={step.label?.ru || ''} onChange={e => updateLang('label', 'ru', e.target.value)} placeholder="Название поля" />
        </div>
        <div>
          <label style={labelStyle}>Название (EN)</label>
          <input style={inputStyle} value={step.label?.en || ''} onChange={e => updateLang('label', 'en', e.target.value)} placeholder="Field label" />
        </div>
        <div>
          <label style={labelStyle}>Описание (RU)</label>
          <input style={inputStyle} value={step.description?.ru || ''} onChange={e => updateLang('description', 'ru', e.target.value)} placeholder="Подсказка" />
        </div>
        <div>
          <label style={labelStyle}>Описание (EN)</label>
          <input style={inputStyle} value={step.description?.en || ''} onChange={e => updateLang('description', 'en', e.target.value)} placeholder="Hint" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
        <div>
          <label style={labelStyle}>Тип поля *</label>
          <select style={{ ...inputStyle, background: '#fff' }} value={step.fieldType} onChange={e => update('fieldType', e.target.value)}>
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Обязательное</label>
          <select style={{ ...inputStyle, background: '#fff' }} value={step.required ? 'true' : 'false'} onChange={e => update('required', e.target.value === 'true')}>
            <option value="true">Да</option>
            <option value="false">Нет</option>
          </select>
        </div>
        {step.fieldType === 'file' && (
          <div>
            <label style={labelStyle}>Макс. файлов</label>
            <input type="number" min={1} max={50} style={inputStyle} value={step.maxFiles || 5} onChange={e => update('maxFiles', parseInt(e.target.value) || 5)} />
          </div>
        )}
      </div>

      {step.fieldType === 'select' && (
        <div>
          <label style={labelStyle}>Варианты выбора</label>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <input style={{ ...inputStyle, flex: 1 }} value={optionInput} onChange={e => setOptionInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
              placeholder="Добавить вариант..." />
            <button type="button" onClick={addOption} style={{ padding: '0.5rem 0.75rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>+</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {(step.options || []).map((opt, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#e5e7eb', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
                {opt.ru || opt.en}
                <button type="button" onClick={() => removeOption(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#6b7280' }}><X size={10} /></button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const Scenarios = () => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const { confirm, ConfirmNode } = useConfirm();

  const fetchScenarios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 20, search });
      const data = await getScenarios(params);
      setScenarios(data.scenarios || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      toast.error('Ошибка загрузки сценариев');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => { fetchScenarios(); }, [fetchScenarios]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      title: { ru: s.title?.ru || '', en: s.title?.en || '' },
      description: { ru: s.description?.ru || '', en: s.description?.en || '' },
      steps: (s.steps || []).map(st => ({ ...st, _tmpId: Math.random().toString(36).slice(2) }))
    });
    setShowModal(true);
  };

  const handleDelete = async (s) => {
    const ok = await confirm({ title: 'Удалить сценарий?', message: `«${s.title?.ru || s.title?.en}» будет удалён.` });
    if (!ok) return;
    try {
      await deleteScenario(s._id);
      toast.success('Сценарий удалён');
      fetchScenarios();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title?.ru && !form.title?.en) return toast.error('Введите название');
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        steps: form.steps.map((st, i) => {
          const { _tmpId, ...rest } = st;
          return { ...rest, order: i + 1 };
        })
      };
      if (editing) {
        await updateScenario(editing._id, payload);
        toast.success('Сценарий обновлён');
      } else {
        await createScenario(payload);
        toast.success('Сценарий создан');
      }
      setShowModal(false);
      fetchScenarios();
    } catch (err) {
      toast.error(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const addStep = () => {
    setForm(f => ({ ...f, steps: [...f.steps, { ...emptyStep(), order: f.steps.length + 1 }] }));
  };

  const updateStep = (i, updated) => {
    setForm(f => { const s = [...f.steps]; s[i] = updated; return { ...f, steps: s }; });
  };

  const removeStep = (i) => {
    setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  };

  const moveStep = (i, dir) => {
    setForm(f => {
      const s = [...f.steps];
      const j = i + dir;
      if (j < 0 || j >= s.length) return f;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...f, steps: s };
    });
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {ConfirmNode}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#111827', margin: 0 }}>Сценарии</h1>
          <p style={{ color: '#6b7280', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>Шаблоны шагов для заказа услуг</p>
        </div>
        {canManage && (
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
            <Plus size={15} /> Новый сценарий
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Поиск по названию..."
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Итого: {total}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Загрузка...</div>
      ) : scenarios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Нет сценариев</div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {scenarios.map(s => (
            <div key={s._id} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827' }}>{s.title?.ru || s.title?.en || '—'}</div>
                {s.title?.en && s.title?.ru !== s.title?.en && (
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{s.title.en}</div>
                )}
                {s.description?.ru && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>{s.description.ru}</div>
                )}
                <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                  {s.steps?.length || 0} шаг(ов) · {new Date(s.createdAt).toLocaleDateString('ru-RU')}
                </div>
              </div>
              {canManage && (
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button onClick={() => openEdit(s)} style={{ padding: '0.4rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#374151' }}>
                    <Edit2 size={12} /> Изменить
                  </button>
                  <button onClick={() => handleDelete(s)} style={{ padding: '0.4rem 0.75rem', border: 'none', borderRadius: '8px', background: '#fee2e2', cursor: 'pointer', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginTop: '1.25rem' }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '0.4rem 0.8rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '0.85rem', color: '#374151' }}>{currentPage} / {pages}</span>
          <button disabled={currentPage === pages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '0.4rem 0.8rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', cursor: currentPage === pages ? 'not-allowed' : 'pointer' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '720px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{editing ? 'Редактировать сценарий' : 'Новый сценарий'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Название (RU) *</label>
                  <input style={inputStyle} value={form.title.ru} onChange={e => setForm(f => ({ ...f, title: { ...f.title, ru: e.target.value } }))} placeholder="Название сценария" required />
                </div>
                <div>
                  <label style={labelStyle}>Название (EN)</label>
                  <input style={inputStyle} value={form.title.en} onChange={e => setForm(f => ({ ...f, title: { ...f.title, en: e.target.value } }))} placeholder="Scenario title" />
                </div>
                <div>
                  <label style={labelStyle}>Описание (RU)</label>
                  <input style={inputStyle} value={form.description.ru} onChange={e => setForm(f => ({ ...f, description: { ...f.description, ru: e.target.value } }))} placeholder="Описание" />
                </div>
                <div>
                  <label style={labelStyle}>Описание (EN)</label>
                  <input style={inputStyle} value={form.description.en} onChange={e => setForm(f => ({ ...f, description: { ...f.description, en: e.target.value } }))} placeholder="Description" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#374151' }}>Шаги ({form.steps.length})</h3>
                <button type="button" onClick={addStep} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>
                  <Plus size={13} /> Добавить шаг
                </button>
              </div>

              {form.steps.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '0.85rem', border: '1.5px dashed #e5e7eb', borderRadius: '10px', marginBottom: '1rem' }}>
                  Нет шагов. Нажмите «Добавить шаг».
                </div>
              )}

              {form.steps.map((step, i) => (
                <StepEditor
                  key={step._tmpId || i}
                  step={step}
                  index={i}
                  onChange={updated => updateStep(i, updated)}
                  onRemove={() => removeStep(i)}
                  onMoveUp={() => moveStep(i, -1)}
                  onMoveDown={() => moveStep(i, 1)}
                  isFirst={i === 0}
                  isLast={i === form.steps.length - 1}
                />
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.6rem 1.25rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>
                  Отмена
                </button>
                <button type="submit" disabled={saving} style={{ padding: '0.6rem 1.5rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem', opacity: saving ? 0.7 : 1 }}>
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

export default Scenarios;
