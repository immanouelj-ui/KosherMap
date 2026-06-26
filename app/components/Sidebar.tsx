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
  const anyFilter = filterOpenNow || filterCertType || filterCertAuth || activeFilter !== 'all'

  function clearAll() {
    onFilter('all')
    onFilterOpenNow(false)
    onFilterCertType(null)
    onFilterCertAuth(null)
  }

  return (
    <aside style={{
      width: 290, background: '#fff', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* ── Filtres unifiés ── */}
      <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--border)' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.7px' }}>
            Filtres
          </span>
          {anyFilter && (
            <button onClick={clearAll} style={{ border: 'none', background: 'none', fontSize: 11, color: 'var(--gold)', cursor: 'pointer', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
              <i className="ti ti-x" style={{ fontSize: 11 }} /> Tout effacer
            </button>
          )}
        </div>

        {/* Ouvert maintenant — toggle pleine largeur */}
        <div
          onClick={() => onFilterOpenNow(!filterOpenNow)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 12px', borderRadius: 10, marginBottom: 10, cursor: 'pointer',
            background: filterOpenNow ? '#1FA45210' : 'var(--bg)',
            border: `1.5px solid ${filterOpenNow ? '#1FA452' : 'var(--border)'}`,
            transition: 'all .15s',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: filterOpenNow ? '#1FA452' : 'var(--text2)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 9, color: filterOpenNow ? '#1FA452' : '#ccc' }}>●</span>
            Ouvert maintenant
          </span>
          <Toggle active={filterOpenNow} />
        </div>

        {/* Type de certification : Lait / Viande */}
        <div style={{ marginBottom: 10 }}>
          <Label>Type</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip label="🥛 Lait" active={filterCertType === 'lait'} onClick={() => onFilterCertType(filterCertType === 'lait' ? null : 'lait')} />
            <Chip label="🥩 Viande" active={filterCertType === 'viande'} onClick={() => onFilterCertType(filterCertType === 'viande' ? null : 'viande')} />
          </div>
        </div>

        {/* Catégorie */}
        <div style={{ marginBottom: certAuthorities.length > 0 ? 10 : 0 }}>
          <Label>Catégorie</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <Chip label="Tous" active={activeFilter === 'all'} onClick={() => onFilter('all')} />
            {categories.map(c => (
              <Chip key={c.id} label={`${CAT_ICONS[c.slug] || '📍'} ${c.name}`} active={activeFilter === c.slug} onClick={() => onFilter(c.slug)} />
            ))}
          </div>
        </div>

        {/* Certification */}
        {certAuthorities.length > 0 && (
          <div>
            <Label>Certification</Label>
            <select
              value={filterCertAuth || ''}
              onChange={e => onFilterCertAuth(e.target.value || null)}
              style={{
                width: '100%', height: 36, borderRadius: 8, border: `1.5px solid ${filterCertAuth ? 'var(--gold)' : 'var(--border)'}`,
                background: filterCertAuth ? 'var(--gold-bg)' : '#fff',
                color: filterCertAuth ? 'var(--gold)' : 'var(--text2)',
                fontSize: 12.5, fontWeight: filterCertAuth ? 700 : 500,
                padding: '0 10px', fontFamily: 'var(--font)', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">Toutes les certifications</option>
              {certAuthorities.map(auth => (
                <option key={auth} value={auth}>{auth}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Compteur résultats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px' }}>
        <span style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 500 }}>
          <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 13 }}>{places.length}</span>
          {' '}lieu{places.length > 1 ? 'x' : ''}
        </span>
        {userLoc && (
          <div style={{ background: 'var(--gold-bg)', color: 'var(--gold)', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-map-pin-check" style={{ fontSize: 11 }} /> Proximité
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        <PlaceList places={places} categories={categories} selectedId={selectedId} loading={loading} onSelect={onSelect} />
      </div>
    </aside>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{children}</div>
}

function Toggle({ active }: { active: boolean }) {
  return (
    <div style={{
      width: 34, height: 20, borderRadius: 10, padding: 2,
      background: active ? '#1FA452' : '#ddd',
      transition: 'background .2s', position: 'relative', flexShrink: 0,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2,
        left: active ? 16 : 2,
        transition: 'left .2s',
        boxShadow: '0 1px 4px rgba(0,0,0,.2)',
      }} />
    </div>
  )
}

function Chip({ label, active, onClick, small }: { label: string; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <div onClick={onClick} style={{
      padding: small ? '3px 9px' : '4px 11px',
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
