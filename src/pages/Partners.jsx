import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, PenLine, ImageOff, Tag, Hash, X, Check
} from 'lucide-react';
import { getPartners, deletePartner, savePartner } from '../api/partners';
import { getPartnerTags, createPartnerTag, updatePartnerTag, deletePartnerTag } from '../api/partnerTags';
import { useAuthStore } from '../stores/authStore';
import ArticleEditor from '../components/ArticleEditor';
import { ImageUploadInput } from '../components/FileUploadInput';
import { useConfirm } from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../utils/mediaUrl';

const emptyForm = () => ({
  'title.ru': '', 'title.en': '',
  'shortDesc.ru': '', 'shortDesc.en': '',
  order: 0,
  isActive: true,
  tag_ids: []
});

const Partners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');

  const [tags, setTags] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagForm, setTagForm] = useState({ 'name.ru': '', 'name.en': '' });

  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [showArticleEditor, setShowArticleEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [form, setForm] = useState(emptyForm());
  const [image, setImage] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [contentRu, setContentRu] = useState('');
  const [contentEn, setContentEn] = useState('');
  const { confirm, ConfirmNode } = useConfirm();

  const fetchTags = useCallback(async () => {
    try {
      const data = await getPartnerTags();
      setTags(data);
    } catch (err) {
      console.error('Fetch partner tags error:', err);
    }
  }, []);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
      if (activeTag) params.set('tag', activeTag);
      const data = await getPartners(params);
      setPartners(data.partners);
      setTotal(data.total);
    } catch (err) {
      console.error('Fetch partners error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, activeTag]);

  useEffect(() => { fetchTags(); }, [fetchTags]);
  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const partnerTagIds = (partner) => (partner.tag_ids || []).map(t => String(t?._id || t));

  const toggleFormTag = (tagId) => {
    setForm(prev => {
      const current = prev.tag_ids || [];
      return {
        ...prev,
        tag_ids: current.includes(tagId) ? current.filter(id => id !== tagId) : [...current, tagId]
      };
    });
  };

  const openModal = (partner = null) => {
    if (partner) {
      setEditingPartner(partner);
      setForm({
        'title.ru': partner.title?.ru || '',
        'title.en': partner.title?.en || '',
        'shortDesc.ru': partner.shortDesc?.ru || '',
        'shortDesc.en': partner.shortDesc?.en || '',
        order: partner.order || 0,
        isActive: partner.isActive !== false,
        tag_ids: partnerTagIds(partner)
      });
      setContentRu(partner.content?.ru || '');
      setContentEn(partner.content?.en || '');
    } else {
      setEditingPartner(null);
      setForm(emptyForm());
      setContentRu('');
      setContentEn('');
    }
    setImage(null);
    setImageRemoved(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form['title.ru'] && !form['title.en']) {
      toast.error('Название должно быть заполнено на русском или английском языке');
      return;
    }
    if (!form['shortDesc.ru'] && !form['shortDesc.en']) {
      toast.error('Мини-описание должно быть заполнено на русском или английском языке');
      return;
    }

    const formData = new FormData();
    formData.append('title.ru', form['title.ru'] || '');
    formData.append('title.en', form['title.en'] || '');
    formData.append('shortDesc.ru', form['shortDesc.ru'] || '');
    formData.append('shortDesc.en', form['shortDesc.en'] || '');
    formData.append('order', String(form.order || 0));
    formData.append('isActive', form.isActive ? 'true' : 'false');
    formData.append('content.ru', contentRu || '');
    formData.append('content.en', contentEn || '');
    formData.append('tag_ids', JSON.stringify(form.tag_ids || []));

    if (image) {
      formData.append('image', image);
    } else if (imageRemoved) {
      formData.append('removeImage', 'true');
    }

    setSaving(true);
    try {
      await savePartner(formData, editingPartner?._id);
      setShowModal(false);
      fetchPartners();
      toast.success(editingPartner ? 'Партнёр обновлён' : 'Партнёр добавлен');
    } catch (err) {
      toast.error(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm('Вы уверены, что хотите удалить этого партнёра?');
    if (!ok) return;
    try {
      await deletePartner(id);
      fetchPartners();
      toast.success('Партнёр удалён');
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Партнёры</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>Карточки партнёров, которые видят клиенты во вкладке «Партнёры»</p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => { setEditingTag(null); setTagForm({ 'name.ru': '', 'name.en': '' }); setShowTagModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f3f4f6', color: '#374151' }}>
              <Tag size={18} />
              Управление тегами
            </button>
            <button onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} />
              Добавить партнёра
            </button>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ position: 'relative', maxWidth: '360px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Поиск партнёра..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
        </div>

        {tags.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Фильтр по тегам</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => setActiveTag('')} style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', backgroundColor: activeTag === '' ? '#374151' : '#f3f4f6', color: activeTag === '' ? 'white' : '#4b5563', border: 'none' }}>
                Все теги
              </button>
              {tags.map(tg => (
                <button key={tg._id} onClick={() => setActiveTag(tg._id)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.8125rem', backgroundColor: activeTag === tg._id ? '#fef3c7' : '#f3f4f6', color: activeTag === tg._id ? '#b45309' : '#4b5563', border: activeTag === tg._id ? '1px solid #f59e0b' : '1px solid transparent', fontWeight: activeTag === tg._id ? '700' : '400' }}>
                  <Hash size={12} />
                  {tg.name.ru || tg.name.en}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ width: '80px', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Фото</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Название</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Мини-описание</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Теги</th>
              <th style={{ width: '90px', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Порядок</th>
              <th style={{ width: '110px', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Статус</th>
              <th style={{ width: '150px', padding: '1rem 1.5rem', textAlign: 'right' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</td></tr>
            ) : partners.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Партнёры не найдены</td></tr>
            ) : partners.map(p => (
              <tr key={p._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.75rem 1.5rem' }}>
                  {p.image ? (
                    <img src={resolveMediaUrl(p.image)} alt="" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                      <ImageOff size={18} />
                    </div>
                  )}
                </td>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-main)' }}>{p.title?.ru || p.title?.en || ''}</td>
                <td style={{ padding: '1rem 1.5rem', fontSize: '0.8125rem', color: '#6b7280', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.shortDesc?.ru || p.shortDesc?.en || ''}</td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  {(p.tag_ids || []).filter(t => t && t.name).length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {p.tag_ids.filter(t => t && t.name).map(t => (
                        <div key={t._id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', borderRadius: '8px', backgroundColor: '#eab30810', color: '#b45309', border: '1px solid #eab30830', fontSize: '0.72rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          <Hash size={11} />
                          {t.name?.ru || t.name?.en}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>{p.order}</td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.7rem', borderRadius: '8px',
                    fontSize: '0.72rem', fontWeight: '700',
                    backgroundColor: p.isActive !== false ? '#dcfce7' : '#f3f4f6',
                    color: p.isActive !== false ? '#16a34a' : '#6b7280'
                  }}>
                    {p.isActive !== false ? 'Активен' : 'Скрыт'}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => openModal(p)} title="Редактировать" style={{ display: 'inline-flex', padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', marginRight: '0.5rem' }}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(p._id)} title="Удалить" style={{ display: 'inline-flex', padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px' }}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Всего партнёров: {total}</p>}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem', overflowY: 'auto' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '16px', width: '600px', maxWidth: '100%', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
              {editingPartner ? 'Редактировать партнёра' : 'Новый партнёр'}
            </h2>

            <ImageUploadInput
              file={image}
              onChange={(f) => { setImage(f); setImageRemoved(!f && !!editingPartner?.image); }}
              currentImageUrl={imageRemoved ? null : editingPartner?.image}
              label="Фото (обложка карточки)"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Название (RU)</label>
                <input value={form['title.ru']} onChange={(e) => setForm(p => ({ ...p, 'title.ru': e.target.value }))} placeholder="Название партнёра" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Название (EN)</label>
                <input value={form['title.en']} onChange={(e) => setForm(p => ({ ...p, 'title.en': e.target.value }))} placeholder="Partner name" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Мини-описание (RU)</label>
                <textarea rows={3} value={form['shortDesc.ru']} onChange={(e) => setForm(p => ({ ...p, 'shortDesc.ru': e.target.value }))} placeholder="Короткий текст на карточке" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Мини-описание (EN)</label>
                <textarea rows={3} value={form['shortDesc.en']} onChange={(e) => setForm(p => ({ ...p, 'shortDesc.en': e.target.value }))} placeholder="Short blurb on the card" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Порядок сортировки</label>
                <input type="number" value={form.order} onChange={(e) => setForm(p => ({ ...p, order: e.target.value }))} style={{ width: '120px' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
                Показывать на сайте
              </label>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Теги
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af' }}>
                  {form.tag_ids?.length ? `выбрано: ${form.tag_ids.length}` : 'можно выбрать несколько'}
                </span>
              </label>
              {tags.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', padding: '0.75rem 1rem', backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px dashed #e5e7eb' }}>
                  Теги не созданы — добавьте их в «Управление тегами»
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  {tags.map(tg => {
                    const selected = (form.tag_ids || []).includes(String(tg._id));
                    return (
                      <button
                        key={tg._id}
                        type="button"
                        onClick={() => toggleFormTag(String(tg._id))}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: selected ? 700 : 500,
                          backgroundColor: selected ? '#fef3c7' : 'white',
                          color: selected ? '#b45309' : '#4b5563',
                          border: selected ? '1.5px solid #f59e0b' : '1.5px solid #e5e7eb',
                          borderRadius: '99px', cursor: 'pointer', transition: 'all 0.12s'
                        }}
                      >
                        {selected ? <Check size={13} strokeWidth={3} /> : <Hash size={12} />}
                        {tg.name.ru || tg.name.en}
                      </button>
                    );
                  })}
                  {(form.tag_ids || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, tag_ids: [] }))}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.4rem 0.7rem', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: 'transparent', color: '#9ca3af',
                        border: 'none', borderRadius: '99px', cursor: 'pointer'
                      }}
                    >
                      <X size={12} />
                      Сбросить
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.9rem 1.1rem', fontSize: '0.85rem', color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <span>Полная статья о партнёрстве (текст, кнопки, реф-ссылки) редактируется отдельно.</span>
              <button
                type="button"
                onClick={() => setShowArticleEditor(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#ede9fe', color: '#7c3aed', border: 'none', borderRadius: '8px', padding: '0.5rem 0.9rem', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap' }}
              >
                <PenLine size={14} /> Открыть редактор
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>Отмена</button>
              <button type="submit" disabled={saving}>{saving ? 'Сохранение...' : (editingPartner ? 'Сохранить' : 'Создать')}</button>
            </div>
          </form>
        </div>
      )}

      {showArticleEditor && (
        <ArticleEditor
          valuRu={contentRu}
          valueEn={contentEn}
          onChangeRu={setContentRu}
          onChangeEn={setContentEn}
          onClose={() => setShowArticleEditor(false)}
          uploadImageEndpoint="/partners/upload-image"
        />
      )}

      {showTagModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250 }}>
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: '700' }}>Управление тегами</h2>
              <button type="button" onClick={() => setShowTagModal(false)} style={{ padding: '0.5rem', backgroundColor: '#d1d5db', color: '#111827', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!tagForm['name.ru'] && !tagForm['name.en']) {
                toast.error('Название тега должно быть заполнено');
                return;
              }
              try {
                if (editingTag) {
                  await updatePartnerTag(editingTag._id, { name: { ru: tagForm['name.ru'], en: tagForm['name.en'] } });
                  toast.success('Тег обновлён');
                } else {
                  await createPartnerTag({ name: { ru: tagForm['name.ru'], en: tagForm['name.en'] } });
                  toast.success('Тег создан');
                }
                setEditingTag(null);
                setTagForm({ 'name.ru': '', 'name.en': '' });
                fetchTags();
              } catch (err) {
                toast.error(err.message || 'Ошибка');
              }
            }} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>RU</label>
                <input type="text" placeholder="Название (RU)" value={tagForm['name.ru']} onChange={(e) => setTagForm({ ...tagForm, 'name.ru': e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>EN</label>
                <input type="text" placeholder="Name (EN)" value={tagForm['name.en']} onChange={(e) => setTagForm({ ...tagForm, 'name.en': e.target.value })} />
              </div>
              <button type="submit" style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}>
                {editingTag ? 'Сохранить' : 'Добавить'}
              </button>
              {editingTag && (
                <button type="button" onClick={() => { setEditingTag(null); setTagForm({ 'name.ru': '', 'name.en': '' }); }} style={{ padding: '0.6rem 1rem', backgroundColor: '#f3f4f6', color: '#4b5563', whiteSpace: 'nowrap' }}>
                  Отмена
                </button>
              )}
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tags.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>Теги не созданы</p>}
              {tags.map(tg => (
                <div key={tg._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Hash size={16} style={{ color: '#b45309' }} />
                    <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{tg.name.ru || tg.name.en}</span>
                    {tg.name.ru && tg.name.en && <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>/ {tg.name.en}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { setEditingTag(tg); setTagForm({ 'name.ru': tg.name.ru || '', 'name.en': tg.name.en || '' }); }} style={{ padding: '0.4rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '8px' }} title="Редактировать"><Edit2 size={14} /></button>
                    <button onClick={async () => {
                      const ok = await confirm('Удалить тег?');
                      if (!ok) return;
                      try {
                        await deletePartnerTag(tg._id);
                        fetchTags();
                        toast.success('Тег удалён');
                      } catch (err) {
                        toast.error(err.message || 'Ошибка удаления');
                      }
                    }} style={{ padding: '0.4rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px' }} title="Удалить"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {ConfirmNode}
    </div>
  );
};

export default Partners;
