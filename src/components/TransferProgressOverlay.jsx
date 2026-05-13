import { createPortal } from 'react-dom'

export default function TransferProgressOverlay({ title, percent, subtitle }) {
  if (percent == null || typeof document === 'undefined') return null;
  const pct = Math.min(100, Math.max(0, Number(percent) || 0));

  const node = (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        minHeight: '100vh',
        margin: 0,
        padding: '1rem',
        boxSizing: 'border-box',
        backgroundColor: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483646,
        isolation: 'isolate',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '1.5rem 2rem',
          minWidth: '280px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827', marginBottom: '0.35rem' }}>{title}</div>
        {subtitle ? (
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>{subtitle}</div>
        ) : (
          <div style={{ marginBottom: '1rem' }} />
        )}
        <div style={{ height: '10px', backgroundColor: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              backgroundColor: '#1f2937',
              borderRadius: '99px',
              transition: 'width 0.12s ease-out',
            }}
          />
        </div>
        <div style={{ marginTop: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: '#374151', textAlign: 'center' }}>
          {pct}%
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
