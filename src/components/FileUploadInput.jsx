import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon, FileText, Star } from 'lucide-react'
import { resolveMediaUrl } from '../utils/mediaUrl'

export function ImageUploadInput({ file, onChange, currentImageUrl, label = 'Изображение' }) {
  const fileRef = useRef()
  const previewUrl = file ? URL.createObjectURL(file) : null
  const existingUrl = currentImageUrl ? resolveMediaUrl(currentImageUrl) : null
  const displayUrl = previewUrl || existingUrl

  return (
    <div>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>{label}</label>
      <div
        onClick={() => fileRef.current.click()}
        style={{
          border: '2px dashed #d1d5db', borderRadius: '14px', padding: '1.25rem',
          cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '0.75rem', position: 'relative',
          backgroundColor: displayUrl ? '#f9fafb' : 'white',
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6366f1'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="preview"
              style={{ maxHeight: '140px', maxWidth: '100%', borderRadius: '10px', objectFit: 'contain' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#6b7280' }}>
              <ImageIcon size={14} />
              {file ? file.name : 'Текущее изображение'} — нажмите чтобы сменить
            </div>
          </>
        ) : (
          <>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={20} color="#6b7280" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: '600', color: '#374151', margin: 0, fontSize: '0.9rem' }}>Нажмите для выбора</p>
              <p style={{ color: '#9ca3af', margin: '0.25rem 0 0', fontSize: '0.78rem' }}>PNG, JPG, WEBP до 10 МБ</p>
            </div>
          </>
        )}
        {file && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onChange(e.target.files[0] || null)} />
    </div>
  )
}

export function FileUploadInput({ file, onChange, currentFileUrl, onRemoveCurrent, uploadProgress, label = 'Файл' }) {
  const fileRef = useRef()
  const fileName = file?.name || (currentFileUrl ? currentFileUrl.split('/').pop() : null)

  const handleRemove = (e) => {
    e.stopPropagation()
    if (file) {
      // Just clear the freshly-picked file — if there was a saved file before,
      // its name/link will show again since currentFileUrl is untouched.
      onChange(null)
    } else if (currentFileUrl && onRemoveCurrent) {
      // No staged file — this is the already-saved one, actually remove it.
      onRemoveCurrent()
    }
  }

  return (
    <div>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>{label}</label>
      <div
        onClick={() => fileRef.current.click()}
        style={{
          border: '2px dashed #d1d5db', borderRadius: '14px', padding: '1.25rem',
          cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '0.75rem', position: 'relative',
          backgroundColor: fileName ? '#f9fafb' : 'white',
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6366f1'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
      >
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: fileName ? '#ede9fe' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={20} color={fileName ? '#7c3aed' : '#6b7280'} />
        </div>
        <div style={{ textAlign: 'center' }}>
          {fileName ? (
            <>
              <p style={{ fontWeight: '600', color: '#7c3aed', margin: 0, fontSize: '0.9rem' }}>{fileName}</p>
              <p style={{ color: '#9ca3af', margin: '0.25rem 0 0', fontSize: '0.78rem' }}>Нажмите чтобы сменить файл</p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: '600', color: '#374151', margin: 0, fontSize: '0.9rem' }}>Нажмите для выбора файла</p>
              <p style={{ color: '#9ca3af', margin: '0.25rem 0 0', fontSize: '0.78rem' }}>PDF, ZIP, DOCX и др. до 50 МБ</p>
            </>
          )}
        </div>
        {(file || currentFileUrl) && (
          <button
            type="button"
            title={file ? 'Отменить выбор файла' : 'Удалить файл'}
            onClick={handleRemove}
            style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {uploadProgress !== null && uploadProgress !== undefined && uploadProgress < 100 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.8rem', color: '#6b7280' }}>
            <span>Загрузка файла...</span>
            <span style={{ fontWeight: '700', color: '#7c3aed' }}>{uploadProgress}%</span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: '#7c3aed', borderRadius: '99px', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={(e) => onChange(e.target.files[0] || null)} />
    </div>
  )
}

let multiImageIdSeq = 0

export function MultiImageUploadInput({ images, onChange, label = 'Фото товара', max = 8 }) {
  const fileRef = useRef()
  const dragIndexRef = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const items = images || []

  const displayUrl = (item) => item.isNew ? item.previewUrl : resolveMediaUrl(item.url)

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).slice(0, Math.max(0, max - items.length))
    if (!files.length) return
    const newItems = files.map(file => ({
      id: `new-${Date.now()}-${multiImageIdSeq++}`,
      isNew: true,
      file,
      previewUrl: URL.createObjectURL(file)
    }))
    onChange([...items, ...newItems])
  }

  const removeAt = (idx) => {
    const next = items.slice()
    next.splice(idx, 1)
    onChange(next)
  }

  const makeCover = (idx) => {
    if (idx === 0) return
    const next = items.slice()
    const [moved] = next.splice(idx, 1)
    next.unshift(moved)
    onChange(next)
  }

  const handleDrop = (idx) => {
    const from = dragIndexRef.current
    dragIndexRef.current = null
    setDragOverIndex(null)
    if (from === null || from === idx) return
    const next = items.slice()
    const [moved] = next.splice(from, 1)
    next.splice(idx, 0, moved)
    onChange(next)
  }

  return (
    <div>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        {items.map((item, idx) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => { dragIndexRef.current = idx }}
            onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx) }}
            onDragLeave={() => setDragOverIndex(prev => prev === idx ? null : prev)}
            onDrop={() => handleDrop(idx)}
            style={{
              position: 'relative', width: '110px', height: '110px', borderRadius: '12px',
              border: dragOverIndex === idx ? '2px solid #6366f1' : (idx === 0 ? '2px solid #10b981' : '1.5px solid #d1d5db'),
              overflow: 'hidden', cursor: 'grab', backgroundColor: '#f9fafb', flexShrink: 0
            }}
          >
            <img src={displayUrl(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {idx === 0 && (
              <span style={{
                position: 'absolute', top: '4px', left: '4px', padding: '2px 6px', borderRadius: '6px',
                backgroundColor: '#10b981', color: 'white', fontSize: '0.65rem', fontWeight: '700'
              }}>
                Обложка
              </span>
            )}
            {idx !== 0 && (
              <button
                type="button"
                title="Сделать обложкой"
                onClick={() => makeCover(idx)}
                style={{
                  position: 'absolute', bottom: '4px', left: '4px', padding: '4px', backgroundColor: 'rgba(255,255,255,0.9)',
                  color: '#f59e0b', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
              >
                <Star size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => removeAt(idx)}
              style={{
                position: 'absolute', top: '4px', right: '4px', padding: '4px', backgroundColor: '#fef2f2',
                color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}
            >
              <X size={13} />
            </button>
          </div>
        ))}
        {items.length < max && (
          <div
            onClick={() => fileRef.current.click()}
            style={{
              width: '110px', height: '110px', borderRadius: '12px', border: '2px dashed #d1d5db',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '0.35rem', cursor: 'pointer', color: '#6b7280', backgroundColor: 'white', flexShrink: 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6366f1'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
          >
            <Upload size={18} />
            <span style={{ fontSize: '0.7rem', textAlign: 'center' }}>Добавить фото</span>
          </div>
        )}
      </div>
      <p style={{ color: '#9ca3af', margin: '0.5rem 0 0', fontSize: '0.78rem' }}>
        Перетащите фото, чтобы изменить порядок. Первое фото (обложка) отображается в каталоге. До {max} фото, PNG/JPG/WEBP.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
