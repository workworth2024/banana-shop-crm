import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, X, Search, Users, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getBroadcasts, createBroadcast, cancelBroadcast, deleteBroadcast,
  previewBroadcastAudience, uploadBroadcastImage
} from '../api/broadcasts';
import { getSegments } from '../api/segments';
import { getClients } from '../api/clients';
import { useConfirm } from '../components/ConfirmDialog';
import { ImageUploadInput } from '../components/FileUploadInput';

const STATUS_LABELS = { scheduled: 'Запланирована', sending: 'Отправляется', sent: 'Отправлена', failed: 'Ошибка', cancelled: 'Отменена' };
const STATUS_COLORS = { scheduled: '#6366f1', sending: '#f59e0b', sent: '#059669', failed: '#ef4444', cancelled: '#9ca3af' };

// MSK has no DST — a fixed +03:00 offset always matches "время по МСК"
// regardless of the admin's own browser timezone.
function mskInputToUtcIso(datetimeLocalValue) {
  if (!datetimeLocalValue) return null;
  return new Date(`${datetimeLocalValue}:00+03:00`).toISOString();
}

function formatMsk(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' МСК';
}

function CustomerMultiSelect({ selected, onChange }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) { setOptions([]); return undefined; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      const params = new URLSearchParams({ search: query.trim(), limit: '10' });
      getClients(params)
        .then((data) => { if (!cancelled) setOptions(data.customers || []); })
        .catch(() => { if (!cancelled) setOptions([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const add = (c) => {
    if (!selected.some((s) => s._id === c._id)) onChange([...selected, { _id: c._id, username: c.username, uid: c.uid }]);
    setQuery('');
    setOpen(false);
  };

  const remove = (id) => onChange(selected.filter((s) => s._id !== id));

  return (
    <div>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
          {selected.map((c) => (
            <span key={c._id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '999px', padding: '0.25rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}>
              {c.username}
              <button type="button" onClick={() => remove(c._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          placeholder="Поиск по почте, UID, нику на сайте или в Telegram..."
          style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.85rem', background: 'white', outline: 'none', boxSizing: 'border-box' }}
        />
        {open && query.trim().length >= 2 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20, maxHeight: '220px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem', color: '#6b7280' }}>Поиск...</div>
            ) : options.length === 0 ? (
              <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem', color: '#6b7280' }}>Ничего не найдено</div>
            ) : options.map((c) => (
              <button key={c._id} type="button" onClick={() => add(c)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.8rem', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.username || '—'} {c.telegramUsername ? `· @${c.telegramUsername}` : ''}</div>
                <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#6b7280' }}>{c.uid} · {c.email}</div>
              </button>
            ))}
          </div>
        )}
        {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />}
      </div>
    </div>
  );
}

const emptyForm = {
  name: '',
  launchType: 'now',
  scheduledAt: '',
  audienceType: 'customers',
  selectedCustomers: [],
  segmentId: '',
  deliverToSite: true,
  deliverToBot: true,
  text: '',
  imageFile: null,
  imageUrl: null,
  buttonText: '',
  buttonUrl: ''
};

function BroadcastModal({ segments, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [count, setCount] = useState(null);
  const [counting, setCounting] = useState(false);
  const debounceRef = useRef(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const payload = form.audienceType === 'customers'
      ? { audienceType: 'customers', customerIds: form.selectedCustomers.map((c) => c._id) }
      : { audienceType: 'segment', segmentId: form.segmentId };

    if (form.audienceType === 'customers' && !form.selectedCustomers.length) { setCount(null); return undefined; }
    if (form.audienceType === 'segment' && !form.segmentId) { setCount(null); return undefined; }

    setCounting(true);
    debounceRef.current = setTimeout(() => {
      previewBroadcastAudience(payload)
        .then((data) => setCount(data.count))
        .catch(() => setCount(null))
        .finally(() => setCounting(false));
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [form.audienceType, form.selectedCustomers, form.segmentId]);

  const handleImageChange = async (file) => {
    set('imageFile', file);
    if (!file) { set('imageUrl', null); return; }
    setUploadingImage(true);
    try {
      const data = await uploadBroadcastImage(file);
      set('imageUrl', data.url);
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки фото');
      set('imageFile', null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Укажите название рассылки');
    if (!form.text.trim()) return toast.error('Укажите текст рассылки');
    if (form.audienceType === 'customers' && !form.selectedCustomers.length) return toast.error('Выберите хотя бы одного пользователя');
    if (form.audienceType === 'segment' && !form.segmentId) return toast.error('Выберите сегмент');
    if (!form.deliverToSite && !form.deliverToBot) return toast.error('Выберите хотя бы один способ доставки');
    if (form.launchType === 'scheduled' && !form.scheduledAt) return toast.error('Укажите дату и время запуска (МСК)');
    if ((form.buttonText.trim() && !form.buttonUrl.trim()) || (!form.buttonText.trim() && form.buttonUrl.trim())) {
      return toast.error('Укажите и название кнопки, и ссылку — или не заполняйте оба поля');
    }
    if (uploadingImage) return toast.error('Дождитесь загрузки фото');

    const payload = {
      name: form.name.trim(),
      text: form.text.trim(),
      launchType: form.launchType,
      scheduledAt: form.launchType === 'scheduled' ? mskInputToUtcIso(form.scheduledAt) : null,
      audienceType: form.audienceType,
      customerIds: form.audienceType === 'customers' ? form.selectedCustomers.map((c) => c._id) : [],
      segmentId: form.audienceType === 'segment' ? form.segmentId : null,
      deliverToSite: form.deliverToSite,
      deliverToBot: form.deliverToBot,
      imageUrl: form.imageUrl || null,
      buttonText: form.buttonText.trim() || null,
      buttonUrl: form.buttonUrl.trim() || null
    };

    setSaving(true);
    try {
      await createBroadcast(payload);
      toast.success(form.launchType === 'now' ? 'Рассылка отправлена' : 'Рассылка запланирована');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' };
  const toggleBtn = (active) => ({ flex: 1, padding: '0.6rem', borderRadius: '8px', border: `1.5px solid ${active ? 'var(--primary)' : '#e5e7eb'}`, background: active ? 'var(--primary)' : 'white', color: active ? '#fff' : 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' });

  return (
    <div onClick={() => !saving && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Новая рассылка</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={labelStyle}>Название рассылки</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Например: Скидка на выходные" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Запуск</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: form.launchType === 'scheduled' ? '0.6rem' : 0 }}>
              <button type="button" onClick={() => set('launchType', 'now')} style={toggleBtn(form.launchType === 'now')}>Сейчас</button>
              <button type="button" onClick={() => set('launchType', 'scheduled')} style={toggleBtn(form.launchType === 'scheduled')}>Отложенный запуск</button>
            </div>
            {form.launchType === 'scheduled' && (
              <>
                <input type="datetime-local" value={form.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} style={inputStyle} />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.35rem 0 0' }}>Время указывается по Москве (МСК), независимо от вашего часового пояса.</p>
              </>
            )}
          </div>

          <div>
            <label style={labelStyle}>Кому</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <button type="button" onClick={() => set('audienceType', 'customers')} style={toggleBtn(form.audienceType === 'customers')}>Выбранным пользователям</button>
              <button type="button" onClick={() => set('audienceType', 'segment')} style={toggleBtn(form.audienceType === 'segment')}>Сегменту</button>
            </div>
            {form.audienceType === 'customers' ? (
              <CustomerMultiSelect selected={form.selectedCustomers} onChange={(v) => set('selectedCustomers', v)} />
            ) : (
              <select value={form.segmentId} onChange={(e) => set('segmentId', e.target.value)} style={inputStyle}>
                <option value="">Выберите сегмент...</option>
                {segments.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.memberCount} чел.)</option>)}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: 600, fontSize: '0.88rem' }}>
              <Users size={15} />
              {counting ? 'Считаем...' : count === null ? 'Выберите получателей' : `Получат: ${count} чел.`}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Доставка</label>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.deliverToSite} onChange={(e) => set('deliverToSite', e.target.checked)} />
                На сайт (уведомление + попап)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.deliverToBot} onChange={(e) => set('deliverToBot', e.target.checked)} />
                В Telegram-бота (если привязан)
              </label>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Текст рассылки</label>
            <textarea
              value={form.text}
              onChange={(e) => set('text', e.target.value)}
              placeholder="Текст, ссылки, эмодзи 🍌..."
              rows={6}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <ImageUploadInput file={form.imageFile} onChange={handleImageChange} label="Фото (необязательно)" />
          {uploadingImage && <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>Загрузка фото...</p>}

          <div>
            <label style={labelStyle}>Кнопка (необязательно)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.6rem' }}>
              <input type="text" value={form.buttonText} onChange={(e) => set('buttonText', e.target.value)} placeholder="Название кнопки" style={inputStyle} />
              <input type="url" value={form.buttonUrl} onChange={(e) => set('buttonUrl', e.target.value)} placeholder="https://..." style={inputStyle} />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.35rem 0 0' }}>
              Покажется как кнопка в попапе и уведомлении на сайте, и как инлайн-кнопка под сообщением в боте.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>Отмена</button>
            <button type="submit" disabled={saving || uploadingImage}>
              {saving ? 'Сохранение...' : form.launchType === 'now' ? 'Отправить' : 'Запланировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const thStyle = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderRight: '1px solid #d1d5db', background: '#f9fafb' };
const tdStyle = { padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' };

const Broadcasts = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [segments, setSegments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { confirm, ConfirmNode } = useConfirm();

  useEffect(() => {
    getSegments(new URLSearchParams({ page: 1, limit: 200 })).then((data) => setSegments(data.items || [])).catch(() => {});
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      const data = await getBroadcasts(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      toast.error('Ошибка загрузки рассылок');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [search]);

  const handleCancel = async (broadcast) => {
    const ok = await confirm({ title: 'Отменить рассылку?', message: `«${broadcast.name}» не будет отправлена.`, confirmText: 'Отменить', danger: true });
    if (!ok) return;
    try {
      await cancelBroadcast(broadcast._id);
      toast.success('Рассылка отменена');
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    }
  };

  const handleDelete = async (broadcast) => {
    const ok = await confirm({ title: 'Удалить рассылку?', message: `«${broadcast.name}» будет удалена из истории.`, confirmText: 'Удалить', danger: true });
    if (!ok) return;
    try {
      await deleteBroadcast(broadcast._id);
      toast.success('Рассылка удалена');
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  return (
    <div className="orders-page" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {ConfirmNode}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Рассылки</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>Сообщения клиентам на сайт (попап + уведомления) и в Telegram-бот.</p>
        </div>
        <button onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> Создать рассылку
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                {['Название', 'Кому', 'Доставка', 'Статус', 'Запуск', 'Получили', 'Создал', 'Действия'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Загрузка...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Рассылок пока нет</td></tr>
              ) : items.map((b) => (
                <tr key={b._id}>
                  <td style={tdStyle}>
                    <strong>{b.name}</strong>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.text}</div>
                  </td>
                  <td style={tdStyle}>
                    {b.audienceType === 'segment' ? (b.segmentId?.name ? `Сегмент: ${b.segmentId.name}` : 'Сегмент (удалён)') : `${b.customerIds?.length || 0} польз.`}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {b.deliverToSite && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '5px', background: '#eef2ff', color: '#4338ca' }}>Сайт</span>}
                      {b.deliverToBot && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '5px', background: '#ecfdf5', color: '#047857' }}>Бот</span>}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.73rem', fontWeight: '700', background: (STATUS_COLORS[b.status] || '#9ca3af') + '22', color: STATUS_COLORS[b.status] || '#9ca3af' }}>
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '0.8rem' }}>{b.launchType === 'scheduled' ? formatMsk(b.scheduledAt) : (b.sentAt ? formatMsk(b.sentAt) : 'сразу')}</div>
                  </td>
                  <td style={tdStyle}>
                    {b.status === 'sent' ? (
                      <div style={{ fontSize: '0.8rem' }}>
                        <div>Сайт: <strong>{b.siteSentCount}</strong></div>
                        <div>Бот: <strong>{b.botSentCount}</strong></div>
                        {b.failedCount > 0 && <div style={{ color: '#ef4444' }}>Ошибок: {b.failedCount}</div>}
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{b.recipientCount || '—'}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{b.createdBy?.username || b.createdBy?.name || '—'}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{new Date(b.createdAt).toLocaleDateString('ru-RU')}</div>
                  </td>
                  <td style={{ ...tdStyle, borderRight: 'none' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {b.status === 'scheduled' && (
                        <button onClick={() => handleCancel(b)} title="Отменить" style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#f59e0b', display: 'flex' }}>
                          <Ban size={13} />
                        </button>
                      )}
                      {b.status !== 'sending' && (
                        <button onClick={() => handleDelete(b)} title="Удалить" style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', border: '1.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#ef4444', display: 'flex' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
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

      {modalOpen && (
        <BroadcastModal
          segments={segments}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchItems(); }}
        />
      )}
    </div>
  );
};

export default Broadcasts;
