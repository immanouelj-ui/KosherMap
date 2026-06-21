'use client'
import type { Place, Category } from '@/types'
import { CAT_ICONS } from '@/lib/utils'
import { PlaceList } from './PlaceList'

interface Props {
  places: Place[]
  categories: Category[]
  activeFilter: string
  selectedId: string | null
  loading: boolean
  userLoc: { lat: number; lng: number } | null
  onFilter: (cat: string) => void
  onSelect: (id: string) => void
}

export default function Sidebar({
  places, categories, activeFilter, selectedId,
  loading, userLoc, onFilter, onSelect,
}: Props) {
  return (
    <aside style={{
      width: 290, background: '#fff', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 10 }}>
          Catégories
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="✦ Tous" active={activeFilter === 'all'} onClick={() => onFilter('all')} />
          {categories.map(c => (
            <Chip key={c.id} label={`${CAT_ICONS[c.slug] || '📍'} ${c.name}`} active={activeFilter === c.slug} onClick={() => onFilter(c.slug)} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', fontSize: 12 }}>
        <span style={{ color: 'var(--text3)', fontWeight: 500 }}>
          <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 13 }}>{places.length}</span>
          {' '}lieu{places.length > 1 ? 'x' : ''}
        </span>
        {userLoc && (
          <div style={{
            background: 'var(--gold-bg)', color: 'var(--gold)',
            fontSize: 11.5, fontWeight: 600, padding: '3px 8px',
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <i className="ti ti-map-pin-check" style={{ fontSize: 12 }} />
            Triés par proximité
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
        <PlaceList places={places} categories={categories} selectedId={selectedId} loading={loading} onSelect={onSelect} />
      </div>
    </aside>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 18, fontSize: 11.5, fontWeight: 500,
      border: `1px solid ${active ? 'rgba(184,134,11,.4)' : 'var(--border)'}`,
      background: active ? 'var(--gold-bg)' : 'var(--bg)',
      color: active ? 'var(--gold)' : 'var(--text2)',
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
    }}>
      {label}
    </div>
  )
}
