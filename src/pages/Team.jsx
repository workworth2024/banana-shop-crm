import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Send, GripVertical, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTeamMembers, deleteTeamMember, saveTeamMember, reorderTeamMembers } from '../api/team';
import { useAuthStore } from '../stores/authStore';
import { ImageUploadInput } from '../components/FileUploadInput';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { useConfirm } from '../components/ConfirmDialog';

const emptyForm = { name: '', 'position.ru': '', 'position.en': '', socialLabel: '', socialLink: '', isActive: true };

const Team = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const { confirm, ConfirmNode } = useConfirm();

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTeamMembers();
      setMembers(data.members || []);
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки команды');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const openModal = (member = null) => {
    if (member) {
      setEditingMember(member);
      setForm({
        name: member.name || '',
        'position.ru': member.position?.ru || '',
        'position.en': member.position?.en || '',
        socialLabel: member.socialLabel || '',
        socialLink: member.socialLink || '',
        isActive: member.isActive !== false
      });
    } else {
      setEditingMember(null);
      setForm(emptyForm);
    }
    setPhotoFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Укажите имя');
      return;
    }
    if (!editingMember && !photoFile) {
      toast.error('Загрузите фото');
      return;
    }

    const formData = new FormData();
    formData.append('name', form.name.trim());
    formData.append('position.ru', form['position.ru'] || '');
    formData.append('position.en', form['position.en'] || '');
    formData.append('socialLabel', form.socialLabel || '');
    formData.append('socialLink', form.socialLink || '');
    formData.append('isActive', String(form.isActive));
    if (photoFile) formData.append('photo', photoFile);

    setSaving(true);
    try {
      await saveTeamMember(formData, editingMember ? editingMember._id : null);
      setShowModal(false);
      fetchMembers();
      toast.success(editingMember ? 'Участник обновлён' : 'Участник добавлен');
    } catch (err) {
      toast.error(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member) => {
    const ok = await confirm({
      title: 'Удалить участника команды?',
      message: `«${member.name}» будет удалён из карточек на сайте.`,
      confirmText: 'Удалить',
      danger: true
    });
    if (!ok) return;
    try {
      await deleteTeamMember(member._id);
      fetchMembers();
      toast.success('Участник удалён');
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  const handleDrop = async (idx) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    setDragOverIndex(null);
    if (from === null || from === idx) return;

    const next = members.slice();
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    setMembers(next);

    try {
      await reorderTeamMembers(next.map((m) => m._id));
    } catch (err) {
      toast.error(err.message || 'Не удалось сохранить порядок');
      fetchMembers();
    }
  };

  return (
    <div className="orders-page" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {ConfirmNode}
      <div className="crm-page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Наша команда</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            Карточки менеджеров и сапортов на странице «Контакты». Перетаскивайте карточки, чтобы изменить порядок на сайте.
          </p>
        </div>
        {canManage && (
          <button onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} />
            Добавить участника
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</div>
      ) : members.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)', backgroundColor: 'white', borderRadius: '16px' }}>
          Пока никого нет — добавьте первого участника команды.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {members.map((member, idx) => (
            <div
              key={member._id}
              draggable={canManage}
              onDragStart={() => { dragIndexRef.current = idx; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
              onDragLeave={() => setDragOverIndex((prev) => (prev === idx ? null : prev))}
              onDrop={() => handleDrop(idx)}
              style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                aspectRatio: '3 / 4',
                backgroundColor: '#111827',
                boxShadow: dragOverIndex === idx ? '0 0 0 3px #6366f1' : '0 1px 3px rgba(0,0,0,0.15)',
                cursor: canManage ? 'grab' : 'default',
                opacity: member.isActive === false ? 0.55 : 1
              }}
            >
              {canManage && (
                <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: '4px' }}>
                  <GripVertical size={16} />
                </div>
              )}

              <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                {member.isActive === false && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
                    <EyeOff size={12} /> Скрыт
                  </div>
                )}
                {canManage && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      title="Редактировать"
                      onClick={() => openModal(member)}
                      style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: '#fff', color: '#1f2937', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
                    >
                      <Edit2 size={15} style={{ flexShrink: 0 }} />
                    </button>
                    <button
                      type="button"
                      title="Удалить"
                      onClick={() => handleDelete(member)}
                      style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: '#fff', color: '#ef4444', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
                    >
                      <Trash2 size={15} style={{ flexShrink: 0 }} />
                    </button>
                  </div>
                )}
              </div>

              <img
                src={resolveMediaUrl(member.photo)}
                alt={member.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%',
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.9) 100%)',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                padding: '0.9rem', gap: '0.35rem'
              }}>
                <strong style={{ color: '#fff', fontSize: '1rem', lineHeight: 1.1 }}>{member.name}</strong>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem' }}>
                  {member.position?.ru || member.position?.en || '—'}
                </span>
                {member.socialLabel && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    color: '#facc15', fontSize: '0.78rem', fontWeight: 600,
                    border: '1px solid rgba(250,204,21,0.4)', borderRadius: '999px',
                    padding: '0.25rem 0.6rem', width: 'fit-content', marginTop: '0.15rem'
                  }}>
                    <Send size={12} /> {member.socialLabel}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          onClick={() => !saving && setShowModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                {editingMember ? 'Редактировать участника' : 'Новый участник'}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <ImageUploadInput
                file={photoFile}
                onChange={setPhotoFile}
                currentImageUrl={editingMember?.photo}
                label="Фото (квадратное/портретное, будет обрезано по карточке)"
              />

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Имя</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Alex"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Должность (RU)</label>
                  <input
                    type="text"
                    value={form['position.ru']}
                    onChange={(e) => setForm((f) => ({ ...f, 'position.ru': e.target.value }))}
                    placeholder="Менеджер по продажам"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Должность (EN)</label>
                  <input
                    type="text"
                    value={form['position.en']}
                    onChange={(e) => setForm((f) => ({ ...f, 'position.en': e.target.value }))}
                    placeholder="Sales Manager"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Подпись кнопки</label>
                  <input
                    type="text"
                    value={form.socialLabel}
                    onChange={(e) => setForm((f) => ({ ...f, socialLabel: e.target.value }))}
                    placeholder="@BT_sales1"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Ссылка (Telegram и т.д.)</label>
                  <input
                    type="text"
                    value={form.socialLink}
                    onChange={(e) => setForm((f) => ({ ...f, socialLink: e.target.value }))}
                    placeholder="https://t.me/BT_sales1"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  style={{
                    width: '18px',
                    height: '18px',
                    minWidth: '18px',
                    padding: 0,
                    margin: 0,
                    accentColor: 'var(--primary)',
                    cursor: 'pointer'
                  }}
                />
                Показывать на сайте
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>
                  Отмена
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
