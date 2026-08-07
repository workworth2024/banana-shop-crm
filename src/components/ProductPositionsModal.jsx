import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  X, Search, GripVertical, ChevronUp, ChevronDown, Package, Crown,
  ArrowUpToLine, ArrowDownToLine, ArrowDownUp, Eye, RotateCcw, Save, Youtube, Globe, Loader2, List,
  AlertTriangle, RefreshCw, WifiOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getProductPositions, saveProductPositions } from '../api/products'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { useConfirm } from './ConfirmDialog'
import ACCOUNT_TYPES from '../constants/accountTypes'

const ROW_H = 62
const ROW_GAP = 8
const STEP = ROW_H + ROW_GAP
const EDGE_ZONE = 64
const SCROLL_SPEED = 14

const arrayMove = (arr, from, to) => {
  const next = arr.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

const badgeStyle = (pos) => {
  if (pos === 1) return { background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#fff', boxShadow: '0 2px 8px rgba(245,158,11,0.45)' }
  if (pos === 2) return { background: 'linear-gradient(135deg, #94a3b8, #cbd5e1)', color: '#fff', boxShadow: '0 2px 8px rgba(148,163,184,0.45)' }
  if (pos === 3) return { background: 'linear-gradient(135deg, #b45309, #d97706)', color: '#fff', boxShadow: '0 2px 8px rgba(180,83,9,0.4)' }
  return { background: '#f3f4f6', color: '#6b7280' }
}

const iconBtnStyle = {
  width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  backgroundColor: 'transparent', color: '#9ca3af', border: 'none', borderRadius: '7px', cursor: 'pointer'
}

/** Переводит ошибку API в понятное человеку объяснение */
const explainError = (err, fallback) => {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline) return { title: 'Нет интернета', detail: 'Проверьте соединение и попробуйте ещё раз.', network: true }
  if (err instanceof TypeError || /failed to fetch|networkerror/i.test(err?.message || '')) {
    return { title: 'Сервер недоступен', detail: 'Не удалось связаться с сервером — возможно, он перезапускается. Повторите через несколько секунд.', network: true }
  }
  switch (err?.status) {
    case 401: return { title: 'Сессия истекла', detail: 'Войдите в систему заново — изменения не были применены.' }
    case 403: return { title: 'Недостаточно прав', detail: 'Менять порядок товаров могут только администратор и менеджер.' }
    case 400: return { title: 'Сервер отклонил данные', detail: err?.message || 'Список позиций пустой или содержит некорректные товары.' }
    case 404: return { title: 'Раздел не найден', detail: 'Похоже, сервер работает на старой версии — перезапустите бэкенд.' }
    case 429: return { title: 'Слишком много запросов', detail: 'Подождите немного и повторите сохранение.' }
    default:
      if (err?.status >= 500) return { title: 'Ошибка на сервере', detail: 'Что-то пошло не так на бэкенде. Порядок не сохранён — попробуйте ещё раз.' }
      return { title: fallback, detail: err?.message || 'Неизвестная ошибка. Попробуйте ещё раз.' }
  }
}

export default function ProductPositionsModal({ tab, onClose, onSaved }) {
  const [items, setItems] = useState([])
  const [baseline, setBaseline] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [drag, setDrag] = useState(null)
  const [settling, setSettling] = useState(false)
  const [posEdit, setPosEdit] = useState(null)
  const [preview, setPreview] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [reloadTick, setReloadTick] = useState(0)

  const listRef = useRef(null)
  const dragRef = useRef(null)
  const rafRef = useRef(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  const { confirm, ConfirmNode } = useConfirm()

  const isYoutube = tab === 'youtube'
  const tabLabel = isYoutube ? 'YouTube' : 'Google Ads'
  const TabIcon = isYoutube ? Youtube : Globe
  const perPage = isYoutube ? 15 : 10

  useEffect(() => {
    let alive = true
    setLoading(true)
    setLoadError(null)
    getProductPositions(tab)
      .then(data => {
        if (!alive) return
        const list = Array.isArray(data?.products) ? data.products : []
        setItems(list)
        setBaseline(list.map(p => p._id))
      })
      .catch(err => {
        if (!alive) return
        setLoadError(explainError(err, 'Не удалось загрузить товары'))
      })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [tab, reloadTick])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const ids = useMemo(() => items.map(p => p._id), [items])
  const isDirty = useMemo(
    () => ids.length !== baseline.length || ids.some((id, i) => id !== baseline[i]),
    [ids, baseline]
  )
  const changedCount = useMemo(() => {
    const basePos = new Map(baseline.map((id, i) => [id, i]))
    return ids.reduce((acc, id, i) => acc + (basePos.get(id) !== i ? 1 : 0), 0)
  }, [ids, baseline])

  const neverOrdered = useMemo(
    () => !loading && items.length > 0 && items.every(p => (p.sort_order ?? 1000000) >= 1000000),
    [loading, items]
  )

  const searching = query.trim().length > 0
  const visible = useMemo(() => {
    if (!searching) return items
    const q = query.trim().toLowerCase()
    return items.filter(p =>
      (p.title?.ru || '').toLowerCase().includes(q) ||
      (p.title?.en || '').toLowerCase().includes(q) ||
      (p.uid || '').toLowerCase().includes(q)
    )
  }, [items, query, searching])

  const moveItem = useCallback((from, to) => {
    const len = itemsRef.current.length
    const t = clamp(to, 0, len - 1)
    if (from === t || from < 0 || from >= len) return
    setItems(prev => arrayMove(prev, from, t))
  }, [])

  // ===== Drag & drop (pointer events) =====
  const stopAutoScroll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  const updateDragPosition = useCallback(() => {
    const d = dragRef.current
    const container = listRef.current
    if (!d || !container) return
    const scrollDelta = container.scrollTop - d.startScroll
    const dy = (d.lastClientY - d.startY) + scrollDelta
    const to = clamp(d.from + Math.round(dy / STEP), 0, itemsRef.current.length - 1)
    d.to = to
    setDrag({ id: d.id, from: d.from, to, dy })
  }, [])

  const autoScrollLoop = useCallback(() => {
    const d = dragRef.current
    const container = listRef.current
    if (!d || !container) return
    const rect = container.getBoundingClientRect()
    let moved = false
    if (d.lastClientY < rect.top + EDGE_ZONE && container.scrollTop > 0) {
      container.scrollTop = Math.max(0, container.scrollTop - SCROLL_SPEED)
      moved = true
    } else if (d.lastClientY > rect.bottom - EDGE_ZONE) {
      const maxScroll = container.scrollHeight - container.clientHeight
      if (container.scrollTop < maxScroll) {
        container.scrollTop = Math.min(maxScroll, container.scrollTop + SCROLL_SPEED)
        moved = true
      }
    }
    if (moved) updateDragPosition()
    rafRef.current = requestAnimationFrame(autoScrollLoop)
  }, [updateDragPosition])

  const handleDragStart = (e, index, id) => {
    if (searching || saving) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      id, from: index, to: index, pointerId: e.pointerId,
      startY: e.clientY, lastClientY: e.clientY,
      startScroll: listRef.current ? listRef.current.scrollTop : 0
    }
    setDrag({ id, from: index, to: index, dy: 0 })
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    stopAutoScroll()
    rafRef.current = requestAnimationFrame(autoScrollLoop)
  }

  const handleDragMove = (e) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    d.lastClientY = e.clientY
    updateDragPosition()
  }

  const finishDrag = () => {
    const d = dragRef.current
    if (!d) return
    stopAutoScroll()
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    dragRef.current = null
    if (d.to !== d.from) {
      setItems(list => arrayMove(list, d.from, d.to))
      setSettling(true)
    }
    setDrag(null)
  }

  useEffect(() => () => {
    stopAutoScroll()
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }, [])

  // Подавляем transition на один кадр после дропа, чтобы ряды не «прыгали» при смене DOM-порядка
  useEffect(() => {
    if (!settling) return
    const raf = requestAnimationFrame(() => setSettling(false))
    return () => cancelAnimationFrame(raf)
  }, [settling])

  // ===== Keyboard on drag handle =====
  const handleKeyDown = (e, index) => {
    if (searching) return
    if (e.key === 'ArrowUp') { e.preventDefault(); moveItem(index, index - 1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveItem(index, index + 1) }
    else if (e.key === 'Home') { e.preventDefault(); moveItem(index, 0) }
    else if (e.key === 'End') { e.preventDefault(); moveItem(index, items.length - 1) }
  }

  // ===== Position badge editor =====
  const commitPosEdit = () => {
    if (!posEdit) return
    const from = itemsRef.current.findIndex(p => p._id === posEdit.id)
    const target = parseInt(posEdit.value, 10)
    setPosEdit(null)
    if (from === -1 || !Number.isFinite(target)) return
    moveItem(from, clamp(target, 1, itemsRef.current.length) - 1)
  }

  // ===== Save / reset / close =====
  const handleSave = async () => {
    if (!isDirty || saving) return
    if (!ids.length) {
      setSaveError({ title: 'Нечего сохранять', detail: 'Список товаров пуст — порядок сохранять не нужно.' })
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const res = await saveProductPositions(tab, ids)
      if (res && Number(res.total) > 0 && Number(res.total) < ids.length) {
        setSaveError({
          title: 'Сохранено частично',
          detail: `Сервер принял ${res.total} из ${ids.length} товаров. Обновите список — возможно, часть товаров была удалена.`
        })
      } else {
        toast.success('Порядок сохранён — витрина обновлена')
      }
      setBaseline(ids)
      onSaved?.()
    } catch (err) {
      const info = explainError(err, 'Не удалось сохранить порядок')
      setSaveError(info)
      toast.error(info.title)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const byId = new Map(items.map(p => [p._id, p]))
    setItems(baseline.map(id => byId.get(id)).filter(Boolean))
  }

  const requestClose = useCallback(async () => {
    if (isDirty) {
      const ok = await confirm('Есть несохранённые изменения порядка. Закрыть без сохранения?')
      if (!ok) return
    }
    onClose()
  }, [isDirty, confirm, onClose])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') requestClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose])

  // ===== Row transform while dragging =====
  const rowTransform = (index, id) => {
    if (!drag || searching) return { transform: 'translateY(0)', transition: settling ? 'none' : 'transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)' }
    if (id === drag.id) {
      return { transform: `translateY(${drag.dy}px) scale(1.015)`, transition: 'none', zIndex: 5 }
    }
    let shift = 0
    if (drag.from < drag.to && index > drag.from && index <= drag.to) shift = -STEP
    else if (drag.from > drag.to && index >= drag.to && index < drag.from) shift = STEP
    return { transform: `translateY(${shift}px)`, transition: 'transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)' }
  }

  const renderRow = (product, visIndex) => {
    const realIndex = searching ? items.findIndex(p => p._id === product._id) : visIndex
    const pos = realIndex + 1
    const isDragged = drag?.id === product._id
    const title = product.title?.ru || product.title?.en || '—'
    const inStock = Number(product.counts) > 0
    const filter = product.filter_id
    const editingPos = posEdit?.id === product._id
    const tf = rowTransform(realIndex, product._id)

    return (
      <div
        key={product._id}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          height: `${ROW_H}px`, marginBottom: `${ROW_GAP}px`, padding: '0 0.75rem 0 0.4rem',
          backgroundColor: 'white', borderRadius: '14px', position: 'relative',
          border: isDragged ? '1.5px solid var(--primary)' : '1.5px solid #eef0f4',
          boxShadow: isDragged ? '0 12px 32px rgba(0,139,139,0.22)' : '0 1px 2px rgba(16,24,40,0.04)',
          ...(pos === 1 && !isDragged ? { background: 'linear-gradient(90deg, rgba(245,158,11,0.07), rgba(255,255,255,1) 45%)' } : {}),
          ...tf
        }}
        onMouseEnter={(e) => { e.currentTarget.querySelectorAll('[data-rowactions]').forEach(el => el.style.opacity = '1') }}
        onMouseLeave={(e) => { e.currentTarget.querySelectorAll('[data-rowactions]').forEach(el => el.style.opacity = '0.35') }}
      >
        {/* Drag handle */}
        <button
          type="button"
          title={searching ? 'Перетаскивание недоступно при поиске' : 'Перетащите или используйте стрелки ↑↓ (Home/End — в начало/конец)'}
          onPointerDown={(e) => handleDragStart(e, realIndex, product._id)}
          onPointerMove={handleDragMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onKeyDown={(e) => handleKeyDown(e, realIndex)}
          style={{
            width: '30px', height: '42px', padding: 0, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'transparent', border: 'none', borderRadius: '8px',
            color: searching ? '#e5e7eb' : (isDragged ? 'var(--primary)' : '#c3c9d4'),
            cursor: searching ? 'not-allowed' : (isDragged ? 'grabbing' : 'grab'),
            touchAction: 'none'
          }}
        >
          <GripVertical size={19} />
        </button>

        {/* Position badge / editor */}
        {editingPos ? (
          <input
            autoFocus
            type="number"
            min={1}
            max={items.length}
            value={posEdit.value}
            onChange={(e) => setPosEdit({ id: product._id, value: e.target.value })}
            onBlur={commitPosEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitPosEdit() }
              if (e.key === 'Escape') { e.stopPropagation(); setPosEdit(null) }
            }}
            style={{
              width: '52px', height: '34px', padding: '0 0.4rem', flexShrink: 0,
              textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', borderRadius: '10px'
            }}
          />
        ) : (
          <button
            type="button"
            title="Нажмите, чтобы ввести позицию вручную"
            onClick={() => setPosEdit({ id: product._id, value: String(pos) })}
            style={{
              minWidth: '38px', height: '34px', padding: '0 0.45rem', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
              border: 'none', borderRadius: '10px', cursor: 'text',
              fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.01em',
              ...badgeStyle(pos)
            }}
          >
            {pos === 1 && <Crown size={12} strokeWidth={2.6} />}
            {pos}
          </button>
        )}

        {/* Thumbnail */}
        <div style={{
          width: '42px', height: '42px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
          backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {product.path_image ? (
            <img
              src={resolveMediaUrl(product.path_image)}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Package size={18} color="#9ca3af" />
          )}
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.86rem', fontWeight: 600, color: '#111827',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#9ca3af', fontFamily: 'monospace' }}>{product.uid || '—'}</span>
            {filter && (filter.name?.ru || filter.name?.en) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#6b7280' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '99px', backgroundColor: filter.color || '#008b8b', flexShrink: 0 }} />
                {filter.name?.ru || filter.name?.en}
              </span>
            )}
          </div>
        </div>

        {/* Price + stock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>${product.price}</span>
          <span style={{
            fontSize: '0.66rem', fontWeight: 700, padding: '3px 8px', borderRadius: '99px',
            backgroundColor: inStock ? '#ecfdf5' : '#f3f4f6',
            color: inStock ? '#059669' : '#9ca3af'
          }}>
            {inStock ? `${product.counts} шт` : 'Предзаказ'}
          </span>
        </div>

        {/* Quick actions */}
        <div
          data-rowactions
          style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0, opacity: 0.35, transition: 'opacity 0.15s' }}
        >
          <button type="button" title="В самый верх" disabled={realIndex === 0} onClick={() => moveItem(realIndex, 0)}
            style={{ ...iconBtnStyle, color: realIndex === 0 ? '#e5e7eb' : '#9ca3af' }}
            onMouseEnter={(e) => { if (realIndex !== 0) { e.currentTarget.style.backgroundColor = '#f0fdfa'; e.currentTarget.style.color = 'var(--primary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = realIndex === 0 ? '#e5e7eb' : '#9ca3af' }}
          >
            <ArrowUpToLine size={14} />
          </button>
          <button type="button" title="Выше" disabled={realIndex === 0} onClick={() => moveItem(realIndex, realIndex - 1)}
            style={{ ...iconBtnStyle, color: realIndex === 0 ? '#e5e7eb' : '#9ca3af' }}
            onMouseEnter={(e) => { if (realIndex !== 0) { e.currentTarget.style.backgroundColor = '#f0fdfa'; e.currentTarget.style.color = 'var(--primary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = realIndex === 0 ? '#e5e7eb' : '#9ca3af' }}
          >
            <ChevronUp size={15} />
          </button>
          <button type="button" title="Ниже" disabled={realIndex === items.length - 1} onClick={() => moveItem(realIndex, realIndex + 1)}
            style={{ ...iconBtnStyle, color: realIndex === items.length - 1 ? '#e5e7eb' : '#9ca3af' }}
            onMouseEnter={(e) => { if (realIndex !== items.length - 1) { e.currentTarget.style.backgroundColor = '#f0fdfa'; e.currentTarget.style.color = 'var(--primary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = realIndex === items.length - 1 ? '#e5e7eb' : '#9ca3af' }}
          >
            <ChevronDown size={15} />
          </button>
          <button type="button" title="В самый низ" disabled={realIndex === items.length - 1} onClick={() => moveItem(realIndex, items.length - 1)}
            style={{ ...iconBtnStyle, color: realIndex === items.length - 1 ? '#e5e7eb' : '#9ca3af' }}
            onMouseEnter={(e) => { if (realIndex !== items.length - 1) { e.currentTarget.style.backgroundColor = '#f0fdfa'; e.currentTarget.style.color = 'var(--primary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = realIndex === items.length - 1 ? '#e5e7eb' : '#9ca3af' }}
          >
            <ArrowDownToLine size={14} />
          </button>
        </div>
      </div>
    )
  }

  // ===== Превью витрины: карточки в текущем порядке, с разделителями страниц каталога =====
  const renderPageDivider = (page) => (
    <div key={`page-${page}`} style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: page === 1 ? '0 0 2px' : '10px 0 2px' }}>
      <span style={{
        fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
        color: page === 1 ? 'var(--primary)' : '#9ca3af', flexShrink: 0,
        padding: '3px 10px', borderRadius: '99px',
        backgroundColor: page === 1 ? '#f0fdfa' : '#f3f4f6'
      }}>
        {page === 1 ? 'Страница 1 — первый экран покупателя' : `Страница ${page}`}
      </span>
      <span style={{ flex: 1, height: '1px', backgroundColor: page === 1 ? '#c9ecec' : '#eef0f4' }} />
    </div>
  )

  const renderPreviewCard = (product, idx) => {
    const pos = idx + 1
    const title = product.title?.ru || product.title?.en || '—'
    const inStock = Number(product.counts) > 0
    return (
      <div key={product._id} style={{
        backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', position: 'relative',
        border: pos === 1 ? '1.5px solid #fcd34d' : '1.5px solid #eef0f4',
        boxShadow: pos === 1 ? '0 4px 14px rgba(245,158,11,0.14)' : '0 1px 2px rgba(16,24,40,0.04)'
      }}>
        <div style={{
          position: 'absolute', top: '8px', left: '8px', zIndex: 2,
          minWidth: '30px', height: '25px', padding: '0 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
          borderRadius: '8px', fontWeight: 800, fontSize: '0.72rem',
          ...badgeStyle(pos)
        }}>
          {pos === 1 && <Crown size={11} strokeWidth={2.6} />}
          {pos}
        </div>
        <div style={{ height: '92px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {product.path_image ? (
            <img src={resolveMediaUrl(product.path_image)} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Package size={22} color="#c3c9d4" />
          )}
        </div>
        <div style={{ padding: '0.55rem 0.65rem 0.65rem' }}>
          <div style={{
            fontSize: '0.76rem', fontWeight: 600, color: '#111827', lineHeight: 1.3, minHeight: '2.6em',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827' }}>${product.price}</span>
            <span style={{
              fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: '99px',
              backgroundColor: inStock ? '#ecfdf5' : '#f3f4f6',
              color: inStock ? '#059669' : '#9ca3af'
            }}>
              {inStock ? `${product.counts} шт` : 'Предзаказ'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderTypeDivider = (type, page) => (
    <div key={`type-${page}-${type}`} style={{ gridColumn: '1 / -1', margin: '4px 0 0' }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4b5563' }}>
        {ACCOUNT_TYPES[type]?.ru || ACCOUNT_TYPES[type]?.en || (type === '__other' ? 'Другое' : type)}
      </span>
    </div>
  )

  const previewNodes = []
  if (preview) {
    if (isYoutube) {
      items.forEach((product, idx) => {
        if (idx % perPage === 0) previewNodes.push(renderPageDivider(idx / perPage + 1))
        previewNodes.push(renderPreviewCard(product, idx))
      })
    } else {
      // Google Ads: витрина группирует страницу по типам, группы — в порядке лучшей позиции типа
      const typeRank = new Map()
      items.forEach((p, idx) => {
        const key = p.type || '__other'
        if (!typeRank.has(key)) typeRank.set(key, idx)
      })
      for (let start = 0; start < items.length; start += perPage) {
        const page = start / perPage + 1
        previewNodes.push(renderPageDivider(page))
        const slice = items.slice(start, start + perPage).map((p, i) => [p, start + i])
        const groups = new Map()
        for (const [p, idx] of slice) {
          const key = p.type || '__other'
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key).push([p, idx])
        }
        const ordered = [...groups.entries()].sort((a, b) => typeRank.get(a[0]) - typeRank.get(b[0]))
        for (const [type, arr] of ordered) {
          previewNodes.push(renderTypeDivider(type, page))
          for (const [p, idx] of arr) previewNodes.push(renderPreviewCard(p, idx))
        }
      }
    }
  }

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        backgroundColor: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        animation: 'ppm-fade-in 0.18s ease'
      }}
    >
      <style>{`
        @keyframes ppm-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ppm-pop-in { from { opacity: 0; transform: translateY(14px) scale(0.985) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes ppm-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }
        @keyframes ppm-spin { to { transform: rotate(360deg) } }
        .ppm-list::-webkit-scrollbar { width: 8px }
        .ppm-list::-webkit-scrollbar-track { background: transparent }
        .ppm-list::-webkit-scrollbar-thumb { background: #d7dbe2; border-radius: 99px }
        .ppm-list::-webkit-scrollbar-thumb:hover { background: #b9bfc9 }
      `}</style>

      <div style={{
        width: '780px', maxWidth: '100%', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#fbfcfe', borderRadius: '22px', overflow: 'hidden',
        boxShadow: '0 28px 80px rgba(0,0,0,0.35)',
        animation: 'ppm-pop-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1.25rem 1.5rem', backgroundColor: 'white', borderBottom: '1px solid #eef0f4'
        }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--primary), #00b3b3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(0,139,139,0.35)'
          }}>
            <ArrowDownUp size={22} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              Конструктор позиций
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '99px',
                backgroundColor: isYoutube ? '#fef2f2' : '#eff6ff',
                color: isYoutube ? '#dc2626' : '#2563eb'
              }}>
                <TabIcon size={12} />
                {tabLabel}
              </span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Eye size={13} />
              Верхние товары покупатели видят первыми. Перетащите — и порядок на витрине станет таким же.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            style={{
              width: '36px', height: '36px', padding: 0, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '10px', cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.9rem 1.5rem', backgroundColor: 'white', borderBottom: '1px solid #eef0f4'
        }}>
          <div style={{ display: 'flex', backgroundColor: '#f3f4f6', borderRadius: '11px', padding: '3px', flexShrink: 0 }}>
            {[
              { key: false, label: 'Список', icon: <List size={14} /> },
              { key: true, label: 'Превью витрины', icon: <Eye size={14} /> }
            ].map(({ key, label, icon }) => (
              <button
                key={String(key)}
                type="button"
                onClick={() => setPreview(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.85rem',
                  backgroundColor: preview === key ? 'white' : 'transparent',
                  color: preview === key ? 'var(--primary)' : '#6b7280',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.78rem',
                  boxShadow: preview === key ? '0 1px 4px rgba(16,24,40,0.12)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
          {preview ? (
            <span style={{ flex: 1, fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>
              {isYoutube
                ? 'Так каталог увидят покупатели — в текущем порядке'
                : 'Витрина группирует товары по типам: тип поднимается вверх вместе со своим лучшим товаром'}
            </span>
          ) : (
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Найти товар (название или ID)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ padding: '0.55rem 0.75rem 0.55rem 2.1rem', fontSize: '0.85rem', borderRadius: '10px' }}
              />
            </div>
          )}
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', flexShrink: 0,
            padding: '6px 12px', borderRadius: '99px', backgroundColor: '#f3f4f6'
          }}>
            {!preview && searching ? `Найдено: ${visible.length} из ${items.length}` : `Товаров: ${items.length}`}
          </span>
        </div>

        {/* Hints */}
        {!preview && searching && (
          <div style={{ padding: '0.55rem 1.5rem', backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>
            Во время поиска перетаскивание отключено — используйте кнопки «в верх / выше / ниже / в низ» справа.
          </div>
        )}
        {!preview && neverOrdered && !searching && (
          <div style={{ padding: '0.55rem 1.5rem', backgroundColor: '#eff6ff', borderBottom: '1px solid #dbeafe', fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600 }}>
            Порядок ещё не настраивался: сейчас товары показываются от новых к старым. Расставьте их и нажмите «Сохранить порядок».
          </div>
        )}
        {preview && isDirty && (
          <div style={{ padding: '0.55rem 1.5rem', backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>
            Превью показывает несохранённый порядок — нажмите «Сохранить порядок», чтобы применить его на витрине.
          </div>
        )}

        {/* List / Preview */}
        <div
          ref={listRef}
          className="ppm-list"
          style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem 0.5rem', overscrollBehavior: 'contain' }}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '4rem 0', color: '#9ca3af' }}>
              <Loader2 size={28} style={{ animation: 'ppm-spin 0.9s linear infinite' }} />
              <span style={{ fontSize: '0.85rem' }}>Загружаем товары...</span>
            </div>
          ) : loadError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', padding: '3.5rem 2rem', textAlign: 'center' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px', backgroundColor: '#fef2f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {loadError.network ? <WifiOff size={24} color="#dc2626" /> : <AlertTriangle size={24} color="#dc2626" />}
              </div>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', marginTop: '4px' }}>{loadError.title}</span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', maxWidth: '380px', lineHeight: 1.5 }}>{loadError.detail}</span>
              <button
                type="button"
                onClick={() => setReloadTick(t => t + 1)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.5rem',
                  padding: '0.55rem 1.2rem', backgroundColor: 'var(--primary)', color: 'white',
                  border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} />
                Повторить загрузку
              </button>
            </div>
          ) : items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '4rem 0', color: '#9ca3af' }}>
              <Package size={30} />
              <span style={{ fontSize: '0.85rem' }}>Товаров пока нет</span>
            </div>
          ) : preview ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', paddingBottom: '0.75rem' }}>
              {previewNodes}
            </div>
          ) : visible.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '4rem 0', color: '#9ca3af' }}>
              <Package size={30} />
              <span style={{ fontSize: '0.85rem' }}>Ничего не найдено</span>
            </div>
          ) : (
            visible.map((product, visIndex) => renderRow(product, visIndex))
          )}
        </div>

        {/* Save error banner */}
        {saveError && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.7rem',
            padding: '0.8rem 1.5rem', backgroundColor: '#fef2f2', borderTop: '1px solid #fecaca'
          }}>
            {saveError.network
              ? <WifiOff size={17} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
              : <AlertTriangle size={17} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#b91c1c' }}>{saveError.title}</div>
              <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '2px', lineHeight: 1.45 }}>{saveError.detail}</div>
            </div>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              aria-label="Скрыть ошибку"
              style={{
                width: '26px', height: '26px', padding: 0, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'transparent', color: '#b91c1c', border: 'none', borderRadius: '7px', cursor: 'pointer'
              }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.5rem', backgroundColor: 'white', borderTop: '1px solid #eef0f4'
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: isDirty ? '#b45309' : '#059669' }}>
            <span style={{
              width: '9px', height: '9px', borderRadius: '99px', flexShrink: 0,
              backgroundColor: isDirty ? '#f59e0b' : '#10b981',
              animation: isDirty ? 'ppm-pulse 1.2s ease-in-out infinite' : 'none'
            }} />
            {isDirty ? `Изменений: ${changedCount} — не забудьте сохранить` : 'Все изменения сохранены'}
          </div>
          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty || saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.1rem',
              backgroundColor: '#f3f4f6', color: !isDirty || saving ? '#c3c9d4' : '#4b5563',
              border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem',
              cursor: !isDirty || saving ? 'default' : 'pointer'
            }}
          >
            <RotateCcw size={15} />
            Сбросить
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.4rem',
              background: !isDirty || saving ? '#c9ecec' : 'linear-gradient(135deg, var(--primary), #00a3a3)',
              color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem',
              cursor: !isDirty || saving ? 'default' : 'pointer',
              boxShadow: !isDirty || saving ? 'none' : '0 6px 16px rgba(0,139,139,0.35)'
            }}
          >
            {saving
              ? <Loader2 size={16} style={{ animation: 'ppm-spin 0.9s linear infinite' }} />
              : <Save size={16} />}
            {saving ? 'Сохраняем...' : 'Сохранить порядок'}
          </button>
        </div>
      </div>
      {ConfirmNode}
    </div>
  )
}
