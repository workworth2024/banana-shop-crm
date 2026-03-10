import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '20px', padding: '2rem',
        maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={22} color="#ef4444" />
          </div>
          <div>
            <p style={{ fontWeight: '700', fontSize: '1rem', color: '#111827', margin: 0 }}>Подтвердите действие</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0' }}>{message}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '0.65rem 1.5rem', backgroundColor: '#f3f4f6', color: '#374151', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '0.65rem 1.5rem', backgroundColor: '#ef4444', color: 'white', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState(null)

  const confirm = (message) => {
    return new Promise((resolve) => {
      setConfirmState({
        message,
        onConfirm: () => { setConfirmState(null); resolve(true) },
        onCancel: () => { setConfirmState(null); resolve(false) }
      })
    })
  }

  const ConfirmNode = confirmState ? (
    <ConfirmDialog
      message={confirmState.message}
      onConfirm={confirmState.onConfirm}
      onCancel={confirmState.onCancel}
    />
  ) : null

  return { confirm, ConfirmNode }
}
