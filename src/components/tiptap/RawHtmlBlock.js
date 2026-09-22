import { Node, mergeAttributes } from '@tiptap/core'

// A single "atom" block that holds a chunk of raw HTML exactly as the admin
// typed it (buttons, tables, custom-styled divs, iframes, whatever) — the
// normal TipTap schema only knows about the nodes/marks we've explicitly
// registered (StarterKit, Image, Link, ...), so pasting arbitrary markup
// straight into the document would get stripped down to plain text. Instead
// this node treats the HTML as an opaque blob: TipTap never tries to parse
// its *contents* against the schema, it just remembers the string and shows
// a live preview (via innerHTML) with a small "✏️ HTML" affordance to reopen
// the raw editor.
//
// Storage: while editing, the raw markup is round-tripped through a
// `data-html` attribute (so getHTML()'s DOM-based serializer HTML-escapes it
// safely, the same way any other DOM attribute would be). `inlineRawHtmlBlocks`
// below then rewrites that into real, literal innerHTML right before the
// value is handed off to onChangeRu/onChangeEn — so what actually lands in
// the DB (and what the storefront's dangerouslySetInnerHTML renders) is the
// admin's markup, unwrapped and working for real, not sitting inert inside
// an attribute.
export const RawHtmlBlock = Node.create({
  name: 'rawHtmlBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  isolating: true,

  addOptions() {
    return {
      // (info: { html: string, onSave: (html: string) => void }) => void
      onEdit: null
    }
  },

  addAttributes() {
    return {
      html: { default: '' }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-raw-html-block]',
        // At rest (after inlineRawHtmlBlocks ran) the markup is the div's
        // real innerHTML — that's what we read back when loading a manual
        // into the editor for editing.
        getAttrs: (element) => ({ html: element.innerHTML })
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    // Only reached by editor.getHTML()'s DOMSerializer — the live editable
    // view always uses addNodeView() below instead. `data-html` gets
    // properly entity-escaped by the browser because it's a real attribute
    // value; inlineRawHtmlBlocks() turns it back into literal content.
    return ['div', mergeAttributes({ 'data-raw-html-block': 'true', 'data-html': HTMLAttributes.html })]
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      // Always-visible "this is not article text, it's raw code" header —
      // a label on its own tinted bar, so it reads as a distinct block even
      // when the pasted HTML itself is plain unstyled text with no visual
      // markers of its own.
      const dom = document.createElement('div')
      dom.className = 'raw-html-block'
      dom.contentEditable = 'false'

      const header = document.createElement('div')
      header.className = 'raw-html-block__header'

      const label = document.createElement('span')
      label.className = 'raw-html-block__label'
      label.innerHTML = '&lt;/&gt; HTML-блок'
      header.appendChild(label)

      const editBtn = document.createElement('button')
      editBtn.type = 'button'
      editBtn.className = 'raw-html-block__edit'
      editBtn.textContent = '✏️ Редактировать код'
      editBtn.addEventListener('mousedown', (e) => {
        // mousedown (not click) so it fires before ProseMirror's own
        // selection handling can steal focus away from the modal we open.
        e.preventDefault()
        e.stopPropagation()
        this.options.onEdit?.({
          html: node.attrs.html,
          onSave: (html) => {
            if (typeof getPos !== 'function') return
            editor.chain().focus().command(({ tr }) => {
              tr.setNodeMarkup(getPos(), undefined, { html })
              return true
            }).run()
          }
        })
      })
      header.appendChild(editBtn)
      dom.appendChild(header)

      const previewWrap = document.createElement('div')
      previewWrap.className = 'raw-html-block__preview-wrap'
      const previewLabel = document.createElement('div')
      previewLabel.className = 'raw-html-block__preview-label'
      previewLabel.textContent = 'Как будет выглядеть на странице:'
      previewWrap.appendChild(previewLabel)

      const preview = document.createElement('div')
      preview.className = 'raw-html-block__preview'
      preview.innerHTML = node.attrs.html || '<span class="raw-html-block__empty">Пустой HTML-блок — нажмите «Редактировать код»</span>'
      previewWrap.appendChild(preview)
      dom.appendChild(previewWrap)

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'rawHtmlBlock') return false
          preview.innerHTML = updatedNode.attrs.html || '<span class="raw-html-block__empty">Пустой HTML-блок — нажмите «Редактировать код»</span>'
          return true
        }
      }
    }
  }
})

// Rewrites every `<div data-raw-html-block data-html="...">` produced by
// editor.getHTML() into `<div data-raw-html-block>RAW_MARKUP</div>` — i.e.
// turns the safely-escaped attribute back into literal, working markup.
// Call this on every value handed to onChangeRu/onChangeEn so what's stored
// (and what the storefront renders) is the real HTML, not an attribute blob.
export function inlineRawHtmlBlocks(html) {
  if (!html || html.indexOf('data-raw-html-block') === -1) return html
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('div[data-raw-html-block]').forEach((el) => {
      const raw = el.getAttribute('data-html')
      if (raw !== null) {
        el.removeAttribute('data-html')
        el.innerHTML = raw
      }
    })
    return doc.body.innerHTML
  } catch {
    return html
  }
}

export default RawHtmlBlock
