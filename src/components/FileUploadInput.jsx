import { useRef } from 'react'
import { Upload, X, Image as ImageIcon, FileText } from 'lucide-react'

export function ImageUploadInput({ file, onChange, currentImageUrl, label = 'Изображение' }) {
  const fileRef = useRef()
  const previewUrl = file ? URL.createObjectURL(file) : null
  const existingUrl = currentImageUrl ? `${import.meta.env.VITE_API_URL}${currentImageUrl}` : null
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

export function FileUploadInput({ file, onChange, currentFileUrl, uploadProgress, label = 'Файл' }) {
  const fileRef = useRef()
  const fileName = file?.name || (currentFileUrl ? currentFileUrl.split('/').pop() : null)

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
