import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { X, Bold, Italic, UnderlineIcon, Strikethrough, Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus, Undo, Redo, Highlighter } from 'lucide-react'
import { useCallback, useRef } from 'react'
import api from '../api/client'

const MenuBar = ({ editor }) => {
  const fileRef = useRef()

  if (!editor) return null

  const setLink = () => {
    const url = window.prompt('Введите URL ссылки:')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkToUrl().unsetLink().run()
      return
    }
    editor.chain().focus().setLink({ href: url, target: '_blank' }).run()
  }

  const addImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await api.request('/manuals/upload-image', { method: 'POST', body: formData })
      editor.chain().focus().setImage({ src: `${import.meta.env.VITE_API_URL}${res.url}` }).run()
    } catch {
      alert('Ошибка загрузки изображения')
    }
    fileRef.current.value = ''
  }

  const btn = (action, active, title, children) => (
    <button
      type="button"
      onClick={action}
      title={title}
      style={{
        padding: '6px 8px',
        backgroundColor: active ? '#1f2937' : 'transparent',
        color: active ? 'white' : '#374151',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
        fontWeight: '600',
        minWidth: '32px',
      }}
    >
      {children}
    </button>
  )

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '2px',
      padding: '10px 16px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      alignItems: 'center',
    }}>
      {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Жирный', <Bold size={16} />)}
      {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Курсив', <Italic size={16} />)}
      {btn(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Подчёркнутый', <UnderlineIcon size={16} />)}
      {btn(() => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), 'Зачёркнутый', <Strikethrough size={16} />)}
      {btn(() => editor.chain().focus().toggleHighlight().run(), editor.isActive('highlight'), 'Выделить', <Highlighter size={16} />)}

      <div style={{ width: '1px', height: '24px', backgroundColor: '#d1d5db', margin: '0 4px' }} />

      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }), 'Заголовок 1', <Heading1 size={16} />)}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), 'Заголовок 2', <Heading2 size={16} />)}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }), 'Заголовок 3', <Heading3 size={16} />)}

      <div style={{ width: '1px', height: '24px', backgroundColor: '#d1d5db', margin: '0 4px' }} />

      {btn(() => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }), 'По левому краю', <AlignLeft size={16} />)}
      {btn(() => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }), 'По центру', <AlignCenter size={16} />)}
      {btn(() => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }), 'По правому краю', <AlignRight size={16} />)}

      <div style={{ width: '1px', height: '24px', backgroundColor: '#d1d5db', margin: '0 4px' }} />

      {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Список', <List size={16} />)}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Нумерованный список', <ListOrdered size={16} />)}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Цитата', <Quote size={16} />)}
      {btn(() => editor.chain().focus().setHorizontalRule().run(), false, 'Разделитель', <Minus size={16} />)}

      <div style={{ width: '1px', height: '24px', backgroundColor: '#d1d5db', margin: '0 4px' }} />

      {btn(setLink, editor.isActive('link'), 'Ссылка', <LinkIcon size={16} />)}
      {btn(() => fileRef.current.click(), false, 'Вставить изображение', <ImageIcon size={16} />)}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addImage} />

      <div style={{ width: '1px', height: '24px', backgroundColor: '#d1d5db', margin: '0 4px' }} />

      {btn(() => editor.chain().focus().undo().run(), false, 'Отменить', <Undo size={16} />)}
      {btn(() => editor.chain().focus().redo().run(), false, 'Повторить', <Redo size={16} />)}
    </div>
  )
}

const ArticleEditor = ({ valuRu, valueEn, onChangeRu, onChangeEn, onClose }) => {
  const editorRu = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: 'Напишите статью на русском...' }),
    ],
    content: valuRu || '',
    onUpdate: ({ editor }) => onChangeRu(editor.getHTML()),
  })

  const editorEn = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: 'Write the article in English...' }),
    ],
    content: valueEn || '',
    onUpdate: ({ editor }) => onChangeEn(editor.getHTML()),
  })

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: 'white',
        width: '100%',
        maxWidth: '1400px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '2px solid #e5e7eb',
          backgroundColor: '#1f2937',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>✍️ Редактор статьи</span>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>HTML сохраняется автоматически</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <X size={18} /> Закрыть
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '2px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', backgroundColor: '#fef3c7', borderBottom: '1px solid #fde68a', fontSize: '0.8rem', fontWeight: '700', color: '#92400e' }}>
              🇷🇺 Русский
            </div>
            <MenuBar editor={editorRu} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              <EditorContent editor={editorRu} style={{ minHeight: '100%', outline: 'none' }} />
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', backgroundColor: '#dbeafe', borderBottom: '1px solid #bfdbfe', fontSize: '0.8rem', fontWeight: '700', color: '#1e40af' }}>
              🇬🇧 English
            </div>
            <MenuBar editor={editorEn} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              <EditorContent editor={editorEn} style={{ minHeight: '100%', outline: 'none' }} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .tiptap {
          outline: none;
          min-height: 400px;
          font-size: 1rem;
          line-height: 1.8;
          color: #1f2937;
        }
        .tiptap p { margin: 0 0 1em 0; }
        .tiptap h1 { font-size: 2rem; font-weight: 800; margin: 0 0 0.75em 0; }
        .tiptap h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.75em 0; }
        .tiptap h3 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.75em 0; }
        .tiptap ul, .tiptap ol { padding-left: 1.5em; margin: 0 0 1em 0; }
        .tiptap li { margin-bottom: 0.25em; }
        .tiptap blockquote { border-left: 4px solid #eab308; padding-left: 1em; margin: 1em 0; color: #6b7280; font-style: italic; }
        .tiptap hr { border: none; border-top: 2px solid #e5e7eb; margin: 1.5em 0; }
        .tiptap a { color: #eab308; text-decoration: underline; }
        .tiptap img { max-width: 100%; border-radius: 8px; margin: 1em 0; }
        .tiptap mark { background-color: #fef08a; padding: 0 2px; border-radius: 2px; }
        .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; float: left; height: 0; }
      `}</style>
    </div>
  )
}

export default ArticleEditor
