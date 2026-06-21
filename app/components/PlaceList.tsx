'use client'
import type { Place, Category } from '@/types'
import { CAT_ICONS, formatDistance, isOpenNow } from '@/lib/utils'

interface Props {
  places: Place[]
  categories: Category[]
  selectedId: string | null
  loading: boolean
  onSelect: (id: string) => void
}

export function PlaceList({ places, categories, selectedId, loading, onSelect }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 30, gap: 6 }}>
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    )
  }

  if (places.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
        <i className="ti ti-mood-sad" style={{ fontSize: 30, display: 'block', marginBottom: 8, color: 'var(--gold)', opacity: .4 }} />
        Aucun résultat
      </div>
    )
  }

  return (
    <div>
      {places.map(p => {
        const hasCert  = p._certifications.some(c => c.is_active)
        const cat      = p._cats[0] || ''
        const catLabel = categories.find(c => c.slug === cat)?.name || cat
        const openStat = isOpenNow(p._hours)
        const selected = p.id === selectedId

        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              padding: '11px 10px', borderRadius: 12, marginBottom: 2,
              background: selected ? 'rgba(184,134,11,.06)' : 'transparent',
              display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: hasCert ? 'rgba(31,164,82,.1)' : 'var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>
              {CAT_ICONS[cat] || '📍'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                {p._distanceKm != null && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', flexShrink: 0 }}>{formatDistance(p._distanceKm)}</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {hasCert && <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ Certifié</span>}
                {catLabel && <span>{catLabel}</span>}
                {openStat !== 'unknown' && (
                  <span style={{ fontWeight: 600, color: openStat === 'open' ? 'var(--green)' : 'var(--red)' }}>
                    {openStat === 'open' ? 'Ouvert' : 'Fermé'}
                  </span>
                )}
              </div>
            </div>

            <i className="ti ti-chevron-right" style={{ color: 'var(--text3)', fontSize: 16, flexShrink: 0 }} />
          </div>
        )
      })}
    </div>
  )
}
