'use client'
import type { Category } from '@/types'
import { CAT_ICONS } from '@/lib/utils'

interface Props {
  categories: Category[]
  activeFilter: string
  onFilter: (c: string) => void
}

export default function CategoryChipsMobile({ categories, activeFilter, onFilter }: Props) {
  return (
    <div style={{
      position: 'fixed', top: 'calc(46px + max(10px, env(safe-area-inset-top)) + 10px)',
      left: 0, right: 0, zIndex: 690,
      display: 'flex', gap: 7, overflowX: 'auto', padding: '0 12px',
      WebkitOverflowScrolling: 'touch',
    }}>
      <Chip label="✦ Tous" active={activeFilter === 'all'} onClick={() => onFilter('all')} />
      {categories.map(c => (
        <Chip key={c.id} label={`${CAT_ICONS[c.slug] || '📍'} ${c.name}`} active={activeFilter === c.slug} onClick={() => onFilter(c.slug)} />
      ))}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      padding: '7px 13px', borderRadius: 18, fontSize: 12.5, fontWeight: 500,
      background: active ? 'var(--gold)' : '#fff',
      color: active ? '#fff' : 'var(--text2)',
      boxShadow: '0 2px 8px rgba(0,0,0,.10)',
      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
      transition: 'all .15s',
    }}>
      {label}
    </div>
  )
}
