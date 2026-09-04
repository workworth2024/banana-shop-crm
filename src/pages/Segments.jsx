import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Search, Users, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getSegments, getSegmentFields, previewSegmentCount, createSegment,
  updateSegment, recomputeSegment, deleteSegment, getSegmentMembers
} from '../api/segments';
import { useConfirm } from '../components/ConfirmDialog';

const OPERATOR_LABELS = { gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=' };
const NUMBER_OPERATORS = ['gt', 'gte', 'eq', 'lte', 'lt'];

function emptyCondition(fields) {
  const first = fields[0];
  return {
    field: first?.key || '',
    operator: first?.type === 'number' ? 'gte' : null,
    value: first?.type === 'boolean' ? true : '',
    valueTo: ''
  };
}

function conditionSummary(condition, fields) {
  const def = fields.find((f) => f.key === condition.field);
  if (!def) return condition.field;
  if (def.type === 'number') return `${def.label} ${OPERATOR_LABELS[condition.operator] || '='} ${condition.value}`;
  if (def.type === 'date') {
    if (condition.value && condition.valueTo) return `${def.label}: ${condition.value} — ${condition.valueTo}`;
    if (condition.value) return `${def.label} ≥ ${condition.value}`;
    if (condition.valueTo) return `${def.label} ≤ ${condition.valueTo}`;
    return def.label;
  }
  if (def.type === 'boolean') return `${def.label}: ${condition.value ? 'Да' : 'Нет'}`;
  if (def.type === 'select') {
    const opt = def.options?.find((o) => o.value === condition.value);
    return `${def.label}: ${opt?.label || condition.value}`;
  }
  if (def.type === 'text') return `${def.label} содержит «${condition.value}»`;
  return def.label;
}

function ConditionRow({ condition, fields, onChange, onRemove }) {
  const def = fields.find((f) => f.key === condition.field);
  const inputStyle = { padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' };

  const handleFieldChange = (key) => {
    const newDef = fields.find((f) => f.key === key);
    onChange({
      field: key,
      operator: newDef?.type === 'number' ? 'gte' : null,
      value: newDef?.type === 'boolean' ? true : (newDef?.type === 'select' ? newDef.options?.[0]?.value || '' : ''),
      valueTo: ''
    });
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.6rem', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
      <select value={condition.field} onChange={(e) => handleFieldChange(e.target.value)} style={{ ...inputStyle, minWidth: 220, fontWeight: 600 }}>
        {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>

      {def?.type === 'number' && (
        <>
          <select value={condition.operator || 'gte'} onChange={(e) => onChange({ ...condition, operator: e.target.value })} style={{ ...inputStyle, width: 70 }}>
            {NUMBER_OPERATORS.map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
          </select>
          <input type="number" step="0.01" value={condition.value} onChange={(e) => onChange({ ...condition, value: e.target.value })} placeholder="Значение" style={{ ...inputStyle, width: 130 }} />
        </>
      )}

      {def?.type === 'date' && (
        <>
          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>с</span>
          <input type="date" value={condition.value || ''} onChange={(e) => onChange({ ...condition, value: e.target.value })} style={inputStyle} />
          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>по</span>
          <input type="date" value={condition.valueTo || ''} onChange={(e) => onChange({ ...condition, valueTo: e.target.value })} style={inputStyle} />
        </>
      )}

      {def?.type === 'boolean' && (
        <select value={condition.value ? 'true' : 'false'} onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })} style={{ ...inputStyle, width: 100 }}>
          <option value="true">Да</option>
          <option value="false">Нет</option>
        </select>
      )}

      {def?.type === 'text' && (
        <input type="text" value={condition.value || ''} onChange={(e) => onChange({ ...condition, value: e.target.value })} placeholder="содержит..." style={{ ...inputStyle, width: 180 }} />
      )}

      {def?.type === 'select' && (
        <select value={condition.value || ''} onChange={(e) => onChange({ ...condition, value: e.target.value })} style={inputStyle}>
          {def.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}

      <button type="button" onClick={onRemove} title="Удалить условие" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}>
        <X size={16} />
      </button>
    </div>
  );
}

function SegmentModal({ segment, fields, onClose, onSaved }) {
  const [name, setName] = useState(segment?.name || '');
  const [conditions, setConditions] = useState(segment?.conditions?.length ? segment.conditions.map((c) => ({
    field: c.field, operator: c.operator, value: c.value ?? '', valueTo: c.valueTo ?? ''
  })) : []);
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState(null);
  const [counting, setCounting] = useState(false);
  const debounceRef = useRef(null);

  const buildPayloadConditions = useCallback(() => conditions
    .filter((c) => c.field)
    .map((c) => {
      const def = fields.find((f) => f.key === c.field);
      const out = { field: c.field };
      if (def?.type === 'number') { out.operator = c.operator || 'gte'; out.value = c.value === '' ? null : Number(c.value); }
      else if (def?.type === 'date') { out.value = c.value || null; out.valueTo = c.valueTo || null; }
      else { out.value = c.value; }
      return out;
    })
    .filter((c) => {
      const def = fields.find((f) => f.key === c.field);
      if (def?.type === 'number') return c.value !== null && !Number.isNaN(c.value);
      if (def?.type === 'date') return c.value || c.valueTo;
      if (def?.type === 'text') return c.value && String(c.value).trim();
      return c.value !== '' && c.value !== undefined && c.value !== null;
    }), [conditions, fields]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const payload = buildPayloadConditions();
    if (!payload.length) { setCount(null); return undefined; }
    setCounting(true);
    debounceRef.current = setTimeout(() => {
      previewSegmentCount(payload)
        .then((data) => setCount(data.count))
        .catch(() => setCount(null))
        .finally(() => setCounting(false));
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [conditions, buildPayloadConditions]);

  const addCondition = () => setConditions((cs) => [...cs, emptyCondition(fields)]);
  const updateCondition = (idx, next) => setConditions((cs) => cs.map((c, i) => (i === idx ? next : c)));
  const removeCondition = (idx) => setConditions((cs) => cs.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Укажите название сегмента');
    const payload = { name: name.trim(), conditions: buildPayloadConditions() };
    if (!payload.conditions.length) return toast.error('Добавьте хотя бы одно условие');

    setSaving(true);
    try {
      if (segment) await updateSegment(segment._id, payload);
      else await createSegment(payload);
      toast.success(segment ? 'Сегмент обновлён' : 'Сегмент создан');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' };

  return (
    <div onClick={() => !saving && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{segment ? 'Редактировать сегмент' : 'Новый сегмент'}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={labelStyle}>Название сегмента</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Активные с депозитами" style={inputStyle} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Условия (все должны совпасть)</label>
              <button type="button" onClick={addCondition} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid var(--primary)', background: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                <Plus size={14} /> Условие
              </button>
            </div>

            {conditions.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', border: '1.5px dashed #e5e7eb', borderRadius: '10px', fontSize: '0.85rem' }}>
                Добавьте хотя бы одно условие
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {conditions.map((c, idx) => (
                  <ConditionRow key={idx} condition={c} fields={fields} onChange={(next) => updateCondition(idx, next)} onRemove={() => removeCondition(idx)} />
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>
              <Users size={16} />
              {counting ? 'Считаем...' : count === null ? 'Добавьте условие, чтобы увидеть количество' : `Подходит: ${count} чел.`}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>Отмена</button>
            <button type="submit" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MembersModal({ segment, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    getSegmentMembers(segment._id, new URLSearchParams({ page, limit: 20 }))
      .then((data) => { setItems(data.items || []); setPages(data.pages || 1); setTotal(data.total || 0); })
      .catch(() => toast.error('Ошибка загрузки участников'))
      .finally(() => setLoading(false));
  }, [segment._id, page]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '760px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Участники сегмента «{segment.name}»</h2>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Всего: {total}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Загрузка...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Никто не подходит под условия</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  {['Пользователь', 'Telegram', 'Баланс', 'Заказов', 'Депозиты $', 'Регистрация'].map((h) => (
                    <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <div style={{ fontWeight: 600 }}>{c.username}</div>
                      <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#9ca3af' }}>{c.uid}</div>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>{c.telegramUsername ? `@${c.telegramUsername}` : '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#059669' }}>${(c.balance || 0).toFixed(2)}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>{c.ordersCount ?? 0}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>${(c.depositsSum || 0).toFixed(2)}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>{new Date(c.createdAt).toLocaleDateString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {items.length > 0 && pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '1rem' }}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>‹</button>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.4 : 1 }}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderRight: '1px solid #d1d5db', background: '#f9fafb' };
const tdStyle = { padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' };

const Segments = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [fields, setFields] = useState([]);

  const [modalSegment, setModalSegment] = useState(undefined); // undefined = closed, null = create, obj = edit
  const [membersSegment, setMembersSegment] = useState(null);
  const [recomputingId, setRecomputingId] = useState(null);
  const { confirm, ConfirmNode } = useConfirm();

  useEffect(() => {
    getSegmentFields().then((data) => setFields(data.fields || [])).catch(() => toast.error('Не удалось загрузить список полей'));
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      const data = await getSegments(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      toast.error('Ошибка загрузки сегментов');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [search]);

  const handleRecompute = async (segment) => {
    setRecomputingId(segment._id);
    try {
      await recomputeSegment(segment._id);
      toast.success('Количество обновлено');
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    } finally {
      setRecomputingId(null);
    }
  };

  const handleDelete = async (segment) => {
    const ok = await confirm({
      title: 'Удалить сегмент?',
      message: `«${segment.name}» будет удалён безвозвратно.`,
      confirmText: 'Удалить',
      danger: true
    });
    if (!ok) return;
    try {
      await deleteSegment(segment._id);
      toast.success('Сегмент удалён');
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  return (
    <div className="orders-page" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{'@keyframes segmentsSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .segments-spin { animation: segmentsSpin .8s linear infinite; }'}</style>
      {ConfirmNode}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Сегменты</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>Группы клиентов по условиям — регистрация, активность, покупки, депозиты и т.д.</p>
        </div>
        <button onClick={() => setModalSegment(null)} disabled={!fields.length} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> Новый сегмент
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} style={{ display: 'flex', gap: '0.5rem', maxWidth: 420 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Поиск по названию..." style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Поиск</button>
          </form>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                {['Название', 'Условия', 'Участников', 'Создан', 'Действия'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Загрузка...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Сегментов пока нет</td></tr>
              ) : items.map((segment) => (
                <tr key={segment._id}>
                  <td style={tdStyle}><strong>{segment.name}</strong></td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: 340 }}>
                      {segment.conditions.map((c, idx) => (
                        <span key={idx} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '6px', background: '#f3f4f6', color: '#6b7280', width: 'fit-content' }}>
                          {conditionSummary(c, fields)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => setMembersSegment(segment)} title="Посмотреть участников" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem' }}>
                      <Users size={14} /> {segment.memberCount}
                    </button>
                    {segment.computedAt && (
                      <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                        на {new Date(segment.computedAt).toLocaleString('ru-RU')}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '0.8rem' }}>{new Date(segment.createdAt).toLocaleDateString('ru-RU')}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{segment.createdBy?.username || segment.createdBy?.name || '—'}</div>
                  </td>
                  <td style={{ ...tdStyle, borderRight: 'none' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button onClick={() => handleRecompute(segment)} disabled={recomputingId === segment._id} title="Пересчитать количество" style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                        <RefreshCw size={13} className={recomputingId === segment._id ? 'segments-spin' : ''} />
                      </button>
                      <button onClick={() => setModalSegment(segment)} title="Редактировать" style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(segment)} title="Удалить" style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#ef4444', display: 'flex' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length > 0 && (
          <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Стр. {page} / {pages} · Всего {total}</span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>‹</button>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.4 : 1 }}>›</button>
            </div>
          </div>
        )}
      </div>

      {modalSegment !== undefined && (
        <SegmentModal
          segment={modalSegment}
          fields={fields}
          onClose={() => setModalSegment(undefined)}
          onSaved={() => { setModalSegment(undefined); fetchItems(); }}
        />
      )}

      {membersSegment && <MembersModal segment={membersSegment} onClose={() => setMembersSegment(null)} />}
    </div>
  );
};

export default Segments;
