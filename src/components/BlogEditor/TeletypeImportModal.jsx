import { useState } from 'react'
import { X, Link2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { importBlogPostFromTeletype } from '../../api/blog'

function TeletypeImportModal({ onCancel, onImported }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      const res = await importBlogPostFromTeletype(url.trim())
      onImported(res.data)
      toast.success('Статья импортирована — проверьте текст и поля перед сохранением')
    } catch (err) {
      toast.error(err.message || 'Не удалось импортировать статью')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onCancel() }}
    >
      <div style={{ background: 'white', borderRadius: '14px', width: '480px', maxWidth: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111' }}>Импорт из Teletype</div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>
              Вставьте ссылку на опубликованную статью — заголовок, текст и картинки подтянутся автоматически
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ position: 'relative' }}>
            <Link2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="url"
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleImport() }}
              placeholder="https://teletype.in/@username/article-slug"
              style={{ paddingLeft: '2.4rem' }}
              disabled={loading}
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
            Картинки перезаливаются на наш storage — teletype.in не используется как хостинг. Первая картинка статьи станет обложкой.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', padding: '1rem 1.25rem', borderTop: '1px solid #e5e7eb' }}>
          <button type="button" onClick={onCancel} disabled={loading} style={{ padding: '0.55rem 1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '9px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            Отмена
          </button>
          <button
            type="button"
            disabled={!url.trim() || loading}
            onClick={handleImport}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', background: url.trim() && !loading ? '#7c3aed' : '#c4b5fd', color: 'white', border: 'none', borderRadius: '9px', fontSize: '0.85rem', fontWeight: 600, cursor: url.trim() && !loading ? 'pointer' : 'not-allowed' }}
          >
            {loading && <Loader2 size={15} className="spin" />}
            {loading ? 'Импортируем...' : 'Импортировать'}
          </button>
        </div>
      </div>

      <style>{`
        .spin { animation: teletype-spin 0.8s linear infinite; }
        @keyframes teletype-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default TeletypeImportModal
