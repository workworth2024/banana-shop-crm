import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { X, Bold, Italic, UnderlineIcon, Strikethrough, Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus, Undo, Redo, Highlighter, Code2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import api from '../api/client'
import { resolveMediaUrl } from '../utils/mediaUrl'
import RawHtmlBlock, { inlineRawHtmlBlocks } from './tiptap/RawHtmlBlock'

const MenuBar = ({ editor, onInsertHtml }) => {
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
      editor.chain().focus().setImage({ src: resolveMediaUrl(res.url) }).run()
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
      {btn(onInsertHtml, editor.isActive('rawHtmlBlock'), 'Вставить свой HTML (кнопки, таблицы и т.д.)', <Code2 size={16} />)}

      <div style={{ width: '1px', height: '24px', backgroundColor: '#d1d5db', margin: '0 4px' }} />

      {btn(() => editor.chain().focus().undo().run(), false, 'Отменить', <Undo size={16} />)}
      {btn(() => editor.chain().focus().redo().run(), false, 'Повторить', <Redo size={16} />)}
    </div>
  )
}

const ArticleEditor = ({ valuRu, valueEn, onChangeRu, onChangeEn, onClose }) => {
  // { html, onSave(html) } while the "insert/edit HTML" modal is open, else null.
  const [htmlModal, setHtmlModal] = useState(null)
  const openHtmlModal = useCallback((info) => setHtmlModal(info), [])

  const editorRu = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: 'Напишите статью на русском...' }),
      RawHtmlBlock.configure({ onEdit: openHtmlModal }),
    ],
    content: valuRu || '',
    onUpdate: ({ editor }) => onChangeRu(inlineRawHtmlBlocks(editor.getHTML())),
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
      RawHtmlBlock.configure({ onEdit: openHtmlModal }),
    ],
    content: valueEn || '',
    onUpdate: ({ editor }) => onChangeEn(inlineRawHtmlBlocks(editor.getHTML())),
  })

  const insertHtml = (editor) => () => openHtmlModal({
    html: '',
    onSave: (html) => editor.chain().focus().insertContent({ type: 'rawHtmlBlock', attrs: { html } }).run()
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
            <MenuBar editor={editorRu} onInsertHtml={insertHtml(editorRu)} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              <EditorContent editor={editorRu} style={{ minHeight: '100%', outline: 'none' }} />
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', backgroundColor: '#dbeafe', borderBottom: '1px solid #bfdbfe', fontSize: '0.8rem', fontWeight: '700', color: '#1e40af' }}>
              🇬🇧 English
            </div>
            <MenuBar editor={editorEn} onInsertHtml={insertHtml(editorEn)} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              <EditorContent editor={editorEn} style={{ minHeight: '100%', outline: 'none' }} />
            </div>
          </div>
        </div>
      </div>

      {htmlModal && (
        <HtmlModal
          initialHtml={htmlModal.html}
          onCancel={() => setHtmlModal(null)}
          onSave={(html) => {
            htmlModal.onSave(html)
            setHtmlModal(null)
          }}
        />
      )}

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

        .raw-html-block {
          margin: 1.25em 0; border: 2px solid #7c3aed; border-radius: 10px; overflow: hidden;
          background: white; box-shadow: 0 1px 3px rgba(124, 58, 237, 0.15);
        }
        .raw-html-block.ProseMirror-selectednode { box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.35); }
        .raw-html-block__header {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 6px 10px; background: repeating-linear-gradient(135deg, #7c3aed, #7c3aed 10px, #6d28d9 10px, #6d28d9 20px);
        }
        .raw-html-block__label {
          font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.75rem; font-weight: 800;
          color: white; letter-spacing: 0.02em; text-shadow: 0 1px 1px rgba(0,0,0,0.25);
        }
        .raw-html-block__edit {
          flex: 0 0 auto; padding: 4px 10px; font-size: 0.72rem; font-weight: 700;
          background: white; color: #7c3aed; border: none; border-radius: 6px; cursor: pointer;
        }
        .raw-html-block__edit:hover { background: #f3e8ff; }
        .raw-html-block__preview-wrap { padding: 10px 12px; background: #faf5ff; }
        .raw-html-block__preview-label {
          font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
          color: #a78bfa; margin-bottom: 6px;
        }
        .raw-html-block__preview { pointer-events: none; }
        .raw-html-block__empty { color: #9ca3af; font-size: 0.85rem; font-style: italic; }
      `}</style>
    </div>
  )
}

const HtmlModal = ({ initialHtml, onCancel, onSave }) => {
  const [value, setValue] = useState(initialHtml || '')

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{ background: 'white', borderRadius: '14px', width: '720px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111' }}>Свой HTML-код</div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>
              Кнопки, таблицы, кастомные блоки — вставится в статью как есть, без изменений
            </div>
          </div>
          <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.25rem', flex: 1, overflow: 'auto' }}>
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={'<button class="my-btn">Купить</button>\n\n<table>\n  <tr><td>Ячейка 1</td><td>Ячейка 2</td></tr>\n</table>'}
            style={{
              width: '100%', minHeight: '260px', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6,
              padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '9px', resize: 'vertical', outline: 'none'
            }}
          />
          {value.trim() && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Превью</div>
              <div style={{ border: '1px dashed #d1d5db', borderRadius: '9px', padding: '0.75rem' }} dangerouslySetInnerHTML={{ __html: value }} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', padding: '1rem 1.25rem', borderTop: '1px solid #e5e7eb' }}>
          <button type="button" onClick={onCancel} style={{ padding: '0.55rem 1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '9px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            Отмена
          </button>
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => onSave(value)}
            style={{ padding: '0.55rem 1rem', background: value.trim() ? '#7c3aed' : '#c4b5fd', color: 'white', border: 'none', borderRadius: '9px', fontSize: '0.85rem', fontWeight: 600, cursor: value.trim() ? 'pointer' : 'not-allowed' }}
          >
            {initialHtml ? 'Сохранить' : 'Вставить'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ArticleEditor
