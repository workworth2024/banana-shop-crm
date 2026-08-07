import { useCallback, useEffect, useRef } from 'react'

// Стек открытых модалок: Escape закрывает только верхнюю
const escStack = []

/**
 * Закрытие модалки кликом по подложке и клавишей Escape.
 *
 * Клик засчитывается только если и нажатие, и отпускание мыши произошли на самой
 * подложке — выделение текста внутри модалки с уводом курсора наружу её не закроет
 * (паттерн Radix DismissableLayer / Chrome light-dismiss guidance).
 *
 * Использование:
 *   const overlayProps = useOverlayClose(isOpen, onClose)
 *   {isOpen && <div {...overlayProps} style={{ position: 'fixed', inset: 0, ... }}>...</div>}
 */
export function useOverlayClose(isOpen, onClose) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const armedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return undefined
    const token = Symbol('modal')
    escStack.push(token)
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (escStack[escStack.length - 1] !== token) return
      e.preventDefault()
      closeRef.current?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      const i = escStack.indexOf(token)
      if (i !== -1) escStack.splice(i, 1)
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const onMouseDown = useCallback((e) => {
    armedRef.current = e.target === e.currentTarget
  }, [])

  const onMouseUp = useCallback((e) => {
    if (armedRef.current && e.target === e.currentTarget) closeRef.current?.()
    armedRef.current = false
  }, [])

  return { onMouseDown, onMouseUp }
}
