import { useEffect, useState } from 'react'
import { X, Edit2, Trash2, Hash } from 'lucide-react'
import toast from 'react-hot-toast'
import { getBlogTags, createBlogTag, updateBlogTag, deleteBlogTag } from '../../api/blogTags'
import { useConfirm } from '../ConfirmDialog'

// Same CRUD pattern as the Manuals/Partners tag managers — a flat, admin-curated
// list of tags instead of free-text, so authors pick from a dropdown everywhere.
function BlogTagManagerModal({ onClose, onChange }) {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTag, setEditingTag] = useState(null)
  const [form, setForm] = useState({ 'name.ru': '', 'name.en': '' })
  const { confirm, ConfirmNode } = useConfirm()

  const fetchTags = async () => {
    setLoading(true)
    try {
      const data = await getBlogTags()
      setTags(data)
      onChange?.(data)
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки тегов')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTags() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form['name.ru'] && !form['name.en']) {
      toast.error('Название тега должно быть заполнено')
      return
    }
    try {
      if (editingTag) {
        await updateBlogTag(editingTag._id, { name: { ru: form['name.ru'], en: form['name.en'] } })
        toast.success('Тег обновлён')
      } else {
        await createBlogTag({ name: { ru: form['name.ru'], en: form['name.en'] } })
        toast.success('Тег создан')
      }
      setEditingTag(null)
      setForm({ 'name.ru': '', 'name.en': '' })
      fetchTags()
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    }
  }

  const handleDelete = async (tag) => {
    const ok = await confirm('Удалить тег? Он пропадёт из всех статей.')
    if (!ok) return
    try {
      await deleteBlogTag(tag._id)
      fetchTags()
      toast.success('Тег удалён')
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
      {ConfirmNode}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: '700', fontSize: '1.2rem', margin: 0 }}>Теги блога</h2>
          <button type="button" onClick={onClose} style={{ padding: '0.5rem', backgroundColor: '#d1d5db', color: '#111827', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>RU</label>
            <input type="text" placeholder="Название (RU)" value={form['name.ru']} onChange={(e) => setForm({ ...form, 'name.ru': e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>EN</label>
            <input type="text" placeholder="Name (EN)" value={form['name.en']} onChange={(e) => setForm({ ...form, 'name.en': e.target.value })} />
          </div>
          <button type="submit" style={{ padding: '0.6rem 1.1rem', whiteSpace: 'nowrap' }}>
            {editingTag ? 'Сохранить' : 'Добавить'}
          </button>
          {editingTag && (
            <button type="button" onClick={() => { setEditingTag(null); setForm({ 'name.ru': '', 'name.en': '' }) }} style={{ padding: '0.6rem 1rem', backgroundColor: '#f3f4f6', color: '#4b5563', whiteSpace: 'nowrap' }}>
              Отмена
            </button>
          )}
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {loading ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>Загрузка...</p>
          ) : tags.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>Теги не созданы</p>
          ) : tags.map((tg) => (
            <div key={tg._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Hash size={16} style={{ color: '#b45309' }} />
                <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{tg.name.ru || tg.name.en}</span>
                {tg.name.ru && tg.name.en && <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>/ {tg.name.en}</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { setEditingTag(tg); setForm({ 'name.ru': tg.name.ru || '', 'name.en': tg.name.en || '' }) }} style={{ padding: '0.4rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '8px' }} title="Редактировать"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(tg)} style={{ padding: '0.4rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px' }} title="Удалить"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BlogTagManagerModal
