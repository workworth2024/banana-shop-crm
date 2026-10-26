import { Check, X, Lightbulb } from 'lucide-react'
import { computeSeoChecks } from './seo'

const scoreColor = (score) => {
  if (score >= 85) return '#16a34a'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function BlogSeoPanel({ title, excerpt, metaDescription, html, hasCover, translationLinked }) {
  const { checks, tips, score } = computeSeoChecks({ title, excerpt, metaDescription, html, hasCover, translationLinked })
  const color = scoreColor(score)

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>SEO</strong>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color }}>{score}%</span>
      </div>

      <div style={{ height: '6px', borderRadius: '999px', backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, backgroundColor: color, transition: 'width 0.25s ease' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {checks.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: c.ok ? '#166534' : '#991b1b' }}>
            <span style={{
              flexShrink: 0, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.ok ? '#dcfce7' : '#fee2e2', marginTop: '1px'
            }}>
              {c.ok ? <Check size={11} color="#16a34a" /> : <X size={11} color="#ef4444" />}
            </span>
            <span>{c.label}</span>
          </div>
        ))}
      </div>

      {tips.length > 0 && (
        <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {tips.map((tip) => (
            <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.78rem', color: '#92400e' }}>
              <Lightbulb size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BlogSeoPanel
