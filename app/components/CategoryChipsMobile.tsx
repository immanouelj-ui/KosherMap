'use client'
import { useState } from 'react'
import type { Category } from '@/types'
import { CAT_ICONS } from '@/lib/utils'

interface Props {
  categories: Category[]
  activeFilter: string
  onFilter: (c: string) => void
  filterOpenNow: boolean
  filterCertType: string | null
  filterCertAuth: string | null
  certAuthorities: string[]
  onFilterOpenNow: (v: boolean) => void
  onFilterCertType: (v: string | null) => void
  onFilterCertAuth: (v: string | null) => void
}

export default function CategoryChipsMobile({
  categories, activeFilter, onFilter,
  filterOpenNow, filterCertType, filterCertAuth, certAuthorities,
  onFilterOpenNow, onFilterCertType, onFilterCertAuth,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFiltersCount = (filterOpenNow ? 1 : 0) + (filterCertType ? 1 : 0) + (filterCertAuth ? 1 : 0)

  return (
    <div style={{
      position: 'fixed', top: 'calc(46px + max(10px, env(safe-area-inset-top)) + 10px)',
      left: 0, right: 0, zIndex: 690,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {/* Catégories row */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '0 12px', WebkitOverflowScrolling: 'touch' }}>
        <Chip label="✦ Tous" active={activeFilter === 'all'} onClick={() => onFilter('all')} />
        {categories.map(c => (
          <Chip key={c.id} label={`${CAT_ICONS[c.slug] || '📍'} ${c.name}`} active={activeFilter === c.slug} onClick={() => onFilter(c.slug)} />
        ))}
        {/* Bouton filtres */}
        <div
          onClick={() => setFiltersOpen(v => !v)}
          style={{
            padding: '7px 13px', borderRadius: 18, fontSize: 12.5, fontWeight: 600,
            background: (filtersOpen || activeFiltersCount > 0) ? 'var(--gold)' : '#fff',
            color: (filtersOpen || activeFiltersCount > 0) ? '#fff' : 'var(--text2)',
            boxShadow: '0 2px 8px rgba(0,0,0,.10)',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .15s',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <i className="ti ti-adjustments-horizontal" style={{ fontSize: 13 }} />
          Filtres{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
        </div>
      </div>

      {/* Overlay pour fermer en cliquant dehors */}
      {filtersOpen && (
        <div
          onClick={() => setFiltersOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 688, background: 'transparent' }}
        />
      )}

      {/* Filtres panel */}
      {filtersOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            margin: '0 10px', position: 'relative', zIndex: 689,
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 4px 20px rgba(0,0,0,.18)',
            padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Filtres</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => { onFilterOpenNow(false); onFilterCertType(null); onFilterCertAuth(null) }}
                  style={{ border: 'none', background: 'none', fontSize: 11.5, color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                >
                  Tout effacer
                </button>
              )}
              <button
                onClick={() => setFiltersOpen(false)}
                style={{ border: 'none', background: 'rgba(0,0,0,.06)', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text2)', padding: 0 }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <FilterChip label="🟢 Ouvert" active={filterOpenNow} onClick={() => onFilterOpenNow(!filterOpenNow)} />
            <FilterChip label="🥛 Lait" active={filterCertType === 'lait'} onClick={() => onFilterCertType(filterCertType === 'lait' ? null : 'lait')} />
            <FilterChip label="🥩 Viande" active={filterCertType === 'viande'} onClick={() => onFilterCertType(filterCertType === 'viande' ? null : 'viande')} />
          </div>

          {certAuthorities.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Certification</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {certAuthorities.map(auth => (
                  <FilterChip key={auth} label={auth} active={filterCertAuth === auth} onClick={() => onFilterCertAuth(filterCertAuth === auth ? null : auth)} small />
                ))}
              </div>
            </>
          )}
        </div>
      )}
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

function FilterChip({ label, active, onClick, small }: { label: string; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <div onClick={onClick} style={{
      padding: small ? '5px 10px' : '6px 13px',
      borderRadius: 18,
      fontSize: small ? 11.5 : 12.5,
      fontWeight: 600,
      border: `1.5px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
      background: active ? 'var(--gold)' : '#fff',
      color: active ? '#fff' : 'var(--text2)',
      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .15s',
    }}>
      {label}
    </div>
  )
}
