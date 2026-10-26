import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Eye, PenLine, Save, Globe, Link2, Unlink, FileDown, Check, Hash, Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getBlogPost, saveBlogPost } from '../../api/blog'
import { getBlogTags } from '../../api/blogTags'
import { ImageUploadInput } from '../FileUploadInput'
import BlogArticleEditor from '../BlogArticleEditor'
import BlogSeoPanel from './BlogSeoPanel'
import BlogPreview from './BlogPreview'
import TeletypeImportModal from './TeletypeImportModal'
import BlogTagManagerModal from './BlogTagManagerModal'
import { countWords } from './seo'

const slugify = (value = '') => value
  .toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')

const toDatetimeLocal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const emptyForm = () => ({
  title: '', slug: '', excerpt: '', authorName: '', tag_ids: [],
  metaTitle: '', metaDescription: '', metaKeywords: '',
  noindex: false, pinned: false, status: 'draft', publishedAt: ''
})

const formFromPost = (post) => ({
  title: post.title || '', slug: post.slug || '', excerpt: post.excerpt || '',
  authorName: post.authorName || '', tag_ids: (post.tag_ids || []).map((t) => String(t?._id || t)),
  metaTitle: post.metaTitle || '', metaDescription: post.metaDescription || '', metaKeywords: post.metaKeywords || '',
  noindex: !!post.noindex, pinned: !!post.pinned, status: post.status || 'draft',
  publishedAt: toDatetimeLocal(post.publishedAt)
})

const LANGS = [
  { code: 'ru', label: 'RU — Русский' },
  { code: 'en', label: 'EN — English' }
]

// Full-page split layout: text editor on the left, all metadata/SEO on the right.
// Both languages of a post are edited here by switching tabs — each tab is its own
// independent document (posts are stored separately per lang) linked by translationGroupId.
function BlogEditor({ postId, initialLang, onClose, onSaved }) {
  const [activeLang, setActiveLang] = useState(initialLang || 'ru')
  const [docs, setDocs] = useState({ ru: null, en: null }) // full post docs once loaded, null = not loaded/doesn't exist
  const [forms, setForms] = useState({ ru: emptyForm(), en: emptyForm() })
  const [html, setHtml] = useState({ ru: '', en: '' })
  const [cover, setCover] = useState({ ru: { file: null, removed: false, url: null }, en: { file: null, removed: false, url: null } })
  const [loadingLang, setLoadingLang] = useState({})
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState('write') // write | preview
  const [pendingUnlink, setPendingUnlink] = useState({ ru: false, en: false })
  const [teletypeModalOpen, setTeletypeModalOpen] = useState(false)
  const [tags, setTags] = useState([])
  const [tagModalOpen, setTagModalOpen] = useState(false)

  useEffect(() => {
    getBlogTags().then(setTags).catch(() => {})
  }, [])

  const loadPostIntoLang = async (lang, id) => {
    setLoadingLang((prev) => ({ ...prev, [lang]: true }))
    try {
      const res = await getBlogPost(id)
      const post = res.data.post
      setDocs((prev) => ({ ...prev, [lang]: post }))
      setForms((prev) => ({ ...prev, [lang]: formFromPost(post) }))
      setHtml((prev) => ({ ...prev, [lang]: post.html || '' }))
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки статьи')
    } finally {
      setLoadingLang((prev) => ({ ...prev, [lang]: false }))
    }
  }

  useEffect(() => {
    if (postId) loadPostIntoLang(initialLang, postId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  const findSibling = (lang) => {
    for (const d of Object.values(docs)) {
      const sibling = d?.translations?.find((t) => t.lang === lang)
      if (sibling) return sibling
    }
    return null
  }

  const switchLang = async (lang) => {
    setActiveLang(lang)
    if (docs[lang] === null) {
      const sibling = findSibling(lang)
      if (sibling) await loadPostIntoLang(lang, sibling._id)
    }
  }

  const form = forms[activeLang]
  const setForm = (patch) => setForms((prev) => ({ ...prev, [activeLang]: { ...prev[activeLang], ...patch } }))
  const editingPost = docs[activeLang]
  const coverState = cover[activeLang]
  const setCoverState = (patch) => setCover((prev) => ({ ...prev, [activeLang]: { ...prev[activeLang], ...patch } }))

  const handleTitleChange = (value) => {
    setForm({
      title: value,
      slug: !editingPost && (!form.slug || form.slug === slugify(form.title)) ? slugify(value) : form.slug
    })
  }

  const toggleFormTag = (tagId) => {
    const current = form.tag_ids || []
    setForm({ tag_ids: current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId] })
  }

  const translationLinked = !pendingUnlink[activeLang] && Boolean(
    editingPost?.translations?.length || findSibling(activeLang === 'ru' ? 'en' : 'ru')
  )

  const hasCover = Boolean(coverState.file || coverState.url || (editingPost?.cover && !coverState.removed))
  const wordCount = useMemo(() => countWords(html[activeLang]), [html, activeLang])
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200))

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Заголовок обязателен')
      return
    }

    const formData = new FormData()
    formData.append('lang', activeLang)
    formData.append('title', form.title)
    formData.append('slug', form.slug || slugify(form.title))
    formData.append('excerpt', form.excerpt)
    formData.append('authorName', form.authorName)
    formData.append('tag_ids', JSON.stringify(form.tag_ids || []))
    formData.append('html', html[activeLang])
    formData.append('metaTitle', form.metaTitle)
    formData.append('metaDescription', form.metaDescription)
    formData.append('metaKeywords', form.metaKeywords)
    formData.append('noindex', String(form.noindex))
    formData.append('pinned', String(form.pinned))
    formData.append('status', form.status)
    if (form.publishedAt) formData.append('publishedAt', new Date(form.publishedAt).toISOString())

    if (coverState.file) {
      formData.append('cover', coverState.file)
    } else if (coverState.url) {
      formData.append('cover', coverState.url)
    } else if (coverState.removed) {
      formData.append('removeCover', 'true')
    }

    if (!editingPost) {
      const otherLang = activeLang === 'ru' ? 'en' : 'ru'
      const otherId = docs[otherLang]?._id
      if (otherId) formData.append('linkToPostId', otherId)
    } else if (pendingUnlink[activeLang]) {
      formData.append('unlinkTranslation', 'true')
    }

    setSaving(true)
    try {
      const res = await saveBlogPost(formData, editingPost?._id)
      const saved = res.data.post
      setDocs((prev) => ({ ...prev, [activeLang]: saved }))
      setCoverState({ file: null, removed: false, url: null })
      setPendingUnlink((prev) => ({ ...prev, [activeLang]: false }))
      toast.success(editingPost ? 'Статья обновлена' : 'Статья создана')
      onSaved()
    } catch (err) {
      toast.error(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleUnlink = () => {
    setPendingUnlink((prev) => ({ ...prev, [activeLang]: true }))
    toast('Перевод будет отвязан при сохранении', { icon: '🔗' })
  }

  const handleTeletypeImported = (draft) => {
    setForm({
      title: draft.title || form.title,
      slug: !editingPost ? slugify(draft.title || form.title) : form.slug,
      excerpt: draft.excerpt || form.excerpt,
      metaDescription: draft.metaDescription || form.metaDescription
    })
    setHtml((prev) => ({ ...prev, [activeLang]: draft.html || prev[activeLang] }))
    if (draft.cover) setCoverState({ file: null, removed: false, url: draft.cover })
    setTeletypeModalOpen(false)
  }

  const isLoading = loadingLang[activeLang]

  return (
    // `.admin-shell` sets overflow-x: hidden, which forces its overflow-y to the computed
    // value `auto` too — that silently makes it (not the viewport) the nearest "scroll
    // container", so position: sticky on the right panel had nothing to stay pinned
    // against and just scrolled away with the page. Side-stepping it entirely: bound this
    // whole view to the viewport height and let the two panes scroll independently instead.
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'calc(100vh - 152px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <button type="button" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#f3f4f6', color: '#374151', padding: '0.55rem 0.9rem' }}>
            <ArrowLeft size={16} /> К списку
          </button>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
            {editingPost ? 'Редактирование статьи' : 'Новая статья'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => switchLang(l.code)}
                style={{
                  padding: '0.55rem 1rem', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                  backgroundColor: activeLang === l.code ? '#1f2937' : 'white',
                  color: activeLang === l.code ? 'white' : '#6b7280',
                  display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                <Globe size={13} />
                {l.code.toUpperCase()}
                {docs[l.code] ? <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: activeLang === l.code ? '#4ade80' : '#16a34a' }} /> : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTeletypeModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#f3f4f6', color: '#374151' }}
          >
            <FileDown size={16} /> Импорт из Teletype
          </button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'write' ? 'preview' : 'write'))}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: mode === 'preview' ? '#1f2937' : '#f3f4f6', color: mode === 'preview' ? 'white' : '#374151' }}
          >
            {mode === 'preview' ? <PenLine size={16} /> : <Eye size={16} />}
            {mode === 'preview' ? 'Редактировать' : 'Предпросмотр'}
          </button>
          <button type="button" onClick={handleSave} disabled={saving || isLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Save size={16} /> {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {teletypeModalOpen && (
        <TeletypeImportModal onCancel={() => setTeletypeModalOpen(false)} onImported={handleTeletypeImported} />
      )}

      {tagModalOpen && (
        <BlogTagManagerModal onClose={() => setTagModalOpen(false)} onChange={setTags} />
      )}

      {!editingPost && docs[activeLang === 'ru' ? 'en' : 'ru'] && (
        <div style={{ fontSize: '0.8rem', color: '#6b7280', backgroundColor: '#eff6ff', padding: '0.6rem 0.9rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Link2 size={14} color="#2563eb" />
          Это будет перевод статьи «{docs[activeLang === 'ru' ? 'en' : 'ru'].title}» — сохранится в паре с ней.
        </div>
      )}

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '1.25rem', minHeight: 0 }}>
        <div style={{ minHeight: 0, height: '100%' }}>
          {mode === 'write' ? (
            <BlogArticleEditor value={html[activeLang]} onChange={(v) => setHtml((prev) => ({ ...prev, [activeLang]: v }))} />
          ) : (
            <BlogPreview
              title={form.title}
              excerpt={form.excerpt}
              cover={editingPost?.cover}
              coverFile={coverState.file}
              tags={tags.filter((tg) => (form.tag_ids || []).includes(String(tg._id))).map((tg) => tg.name.ru || tg.name.en)}
              authorName={form.authorName}
              html={html[activeLang]}
              readingMinutes={readingMinutes}
              wordCount={wordCount}
              lang={activeLang}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', minHeight: 0, height: '100%', overflowY: 'auto', paddingRight: '2px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Заголовок</label>
            <input type="text" value={form.title} onChange={(e) => handleTitleChange(e.target.value)} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Slug (URL)</label>
            <input type="text" value={form.slug} onChange={(e) => setForm({ slug: slugify(e.target.value) })} placeholder="avtomaticheski-iz-zagolovka" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Краткое описание (excerpt)</label>
            <textarea rows={3} value={form.excerpt} onChange={(e) => setForm({ excerpt: e.target.value })} placeholder="Используется в карточках списка и как description по умолчанию" />
          </div>

          <ImageUploadInput
            file={coverState.file}
            currentImageUrl={!coverState.removed ? (coverState.url || editingPost?.cover) : null}
            onChange={(file) => setCoverState({ file, removed: !file, url: null })}
            label="Обложка"
          />

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Автор (необязательно)</label>
            <input type="text" value={form.authorName} onChange={(e) => setForm({ authorName: e.target.value })} placeholder="Если пусто — покажется название компании" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Теги
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af' }}>
                  {form.tag_ids?.length ? `выбрано: ${form.tag_ids.length}` : 'можно выбрать несколько'}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setTagModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', fontSize: '0.72rem', backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              >
                <Tag size={12} /> Управление тегами
              </button>
            </div>
            {tags.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', padding: '0.75rem 1rem', backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px dashed #e5e7eb' }}>
                Теги не созданы — добавьте их через «Управление тегами»
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                {tags.map((tg) => {
                  const selected = (form.tag_ids || []).includes(String(tg._id))
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
                  )
                })}
                {(form.tag_ids || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setForm({ tag_ids: [] })}
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

          <BlogSeoPanel
            title={form.title}
            excerpt={form.excerpt}
            metaDescription={form.metaDescription}
            html={html[activeLang]}
            hasCover={hasCover}
            translationLinked={translationLinked}
          />

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Meta-теги</strong>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Meta Title</label>
              <input type="text" value={form.metaTitle} onChange={(e) => setForm({ metaTitle: e.target.value })} placeholder={form.title || 'По умолчанию — заголовок статьи'} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Meta Description</label>
              <textarea rows={2} value={form.metaDescription} onChange={(e) => setForm({ metaDescription: e.target.value })} placeholder={form.excerpt || 'По умолчанию — excerpt'} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Keywords</label>
              <input type="text" value={form.metaKeywords} onChange={(e) => setForm({ metaKeywords: e.target.value })} placeholder="google ads, арбитраж, фарм аккаунтов" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.noindex} onChange={(e) => setForm({ noindex: e.target.checked })} style={{ width: 'auto' }} />
              Noindex (скрыть от поисковиков)
            </label>
          </div>

          {translationLinked && (
            <button type="button" onClick={handleUnlink} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#fef2f2', color: '#ef4444', alignSelf: 'flex-start', padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}>
              <Unlink size={14} /> Отвязать перевод
            </button>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Статус</label>
              <select value={form.status} onChange={(e) => setForm({ status: e.target.value })}>
                <option value="draft">Черновик</option>
                <option value="published">Опубликован</option>
                <option value="scheduled">Запланирован</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Дата публикации</label>
              <input type="datetime-local" value={form.publishedAt} onChange={(e) => setForm({ publishedAt: e.target.value })} />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ pinned: e.target.checked })} style={{ width: 'auto' }} />
            Закрепить вверху списка
          </label>

          {editingPost && (
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
              👁 {editingPost.views || 0} просмотров
              {editingPost.reactions && Object.keys(editingPost.reactions).length > 0 && (
                <> · {Object.entries(editingPost.reactions).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}</>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BlogEditor
