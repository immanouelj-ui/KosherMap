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
  filterOpenNow: boolean
  filterCertType: string | null
  filterCertAuth: string | null
  certAuthorities: string[]
  onFilter: (cat: string) => void
  onSelect: (id: string) => void
  onFilterOpenNow: (v: boolean) => void
  onFilterCertType: (v: string | null) => void
  onFilterCertAuth: (v: string | null) => void
}

export default function Sidebar({
  places, categories, activeFilter, selectedId,
  loading, userLoc,
  filterOpenNow, filterCertType, filterCertAuth, certAuthorities,
  onFilter, onSelect, onFilterOpenNow, onFilterCertType, onFilterCertAuth,
}: Props) {
  const activeFiltersCount = (filterOpenNow ? 1 : 0) + (filterCertType ? 1 : 0) + (filterCertAuth ? 1 : 0)

  return (
    <aside style={{
      width: 290, background: '#fff', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Catégories */}
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

      {/* Filtres */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.7px' }}>
            Filtres
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={() => { onFilterOpenNow(false); onFilterCertType(null); onFilterCertAuth(null) }}
              style={{ border: 'none', background: 'none', fontSize: 11, color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
            >
              Effacer ({activeFiltersCount})
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <FilterChip label="🟢 Ouvert" active={filterOpenNow} onClick={() => onFilterOpenNow(!filterOpenNow)} />
          <FilterChip label="🥛 Lait" active={filterCertType === 'lait'} onClick={() => onFilterCertType(filterCertType === 'lait' ? null : 'lait')} />
          <FilterChip label="🥩 Viande" active={filterCertType === 'viande'} onClick={() => onFilterCertType(filterCertType === 'viande' ? null : 'viande')} />
        </div>

        {certAuthorities.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>
              Certification
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {certAuthorities.map(auth => (
                <FilterChip key={auth} label={auth} active={filterCertAuth === auth} onClick={() => onFilterCertAuth(filterCertAuth === auth ? null : auth)} small />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', fontSize: 12 }}>
        <span style={{ color: 'var(--text3)', fontWeight: 500 }}>
          <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 13 }}>{places.length}</span>
          {' '}lieu{places.length > 1 ? 'x' : ''}
        </span>
        {userLoc && (
          <div style={{ background: 'var(--gold-bg)', color: 'var(--gold)', fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
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

function FilterChip({ label, active, onClick, small }: { label: string; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <div onClick={onClick} style={{
      padding: small ? '3px 8px' : '4px 10px',
      borderRadius: 18,
      fontSize: small ? 11 : 11.5,
      fontWeight: 600,
      border: `1.5px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
      background: active ? 'var(--gold)' : '#fff',
      color: active ? '#fff' : 'var(--text2)',
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
    }}>
      {label}
    </div>
  )
}
