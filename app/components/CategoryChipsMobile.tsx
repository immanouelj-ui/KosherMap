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
  const [open, setOpen] = useState(false)
  const anyFilter = filterOpenNow || !!filterCertType || !!filterCertAuth || activeFilter !== 'all'
  const activeCount = (filterOpenNow ? 1 : 0) + (filterCertType ? 1 : 0) + (filterCertAuth ? 1 : 0) + (activeFilter !== 'all' ? 1 : 0)

  function clearAll() {
    onFilter('all')
    onFilterOpenNow(false)
    onFilterCertType(null)
    onFilterCertAuth(null)
  }

  return (
    <>
      {/* Barre de chips rapides */}
      <div style={{
        position: 'fixed', top: 'calc(46px + max(10px, env(safe-area-inset-top)) + 10px)',
        left: 0, right: 0, zIndex: 690,
        display: 'flex', gap: 7, overflowX: 'auto', padding: '0 12px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Bouton filtres */}
        <QuickChip
          icon="ti-adjustments-horizontal"
          label={activeCount > 0 ? `Filtres (${activeCount})` : 'Filtres'}
          active={open || anyFilter}
          onClick={() => setOpen(v => !v)}
        />

        {/* "Ouvert" raccourci rapide */}
        <QuickChip
          icon=""
          label="🟢 Ouvert"
          active={filterOpenNow}
          onClick={() => onFilterOpenNow(!filterOpenNow)}
        />

        {/* Catégories */}
        <QuickChip label="Tous" active={activeFilter === 'all'} onClick={() => onFilter('all')} />
        {categories.map(c => (
          <QuickChip key={c.id} label={`${CAT_ICONS[c.slug] || '📍'} ${c.name}`} active={activeFilter === c.slug} onClick={() => onFilter(c.slug)} />
        ))}
      </div>

      {/* Overlay fermeture */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 688, background: 'transparent' }} />
      )}

      {/* Panel filtres */}
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: 'calc(46px + max(10px, env(safe-area-inset-top)) + 54px)',
            left: 10, right: 10, zIndex: 689,
            background: '#fff', borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,.15)',
            padding: '16px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Filtres</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {anyFilter && (
                <button onClick={clearAll} style={{ border: 'none', background: 'none', fontSize: 12, color: 'var(--gold)', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                  Tout effacer
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'var(--bg)', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text2)', padding: 0 }}>
                <i className="ti ti-x" />
              </button>
            </div>
          </div>

          {/* Ouvert maintenant */}
          <div
            onClick={() => onFilterOpenNow(!filterOpenNow)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 10, marginBottom: 14, cursor: 'pointer',
              background: filterOpenNow ? '#1FA45210' : 'var(--bg)',
              border: `1.5px solid ${filterOpenNow ? '#1FA452' : 'var(--border)'}`,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: filterOpenNow ? '#1FA452' : 'var(--text2)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 9, color: filterOpenNow ? '#1FA452' : '#ccc' }}>●</span>
              Ouvert maintenant
            </span>
            <Toggle active={filterOpenNow} />
          </div>

          {/* Type */}
          <PanelLabel>Type</PanelLabel>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <PanelChip label="🥛 Lait" active={filterCertType === 'lait'} onClick={() => onFilterCertType(filterCertType === 'lait' ? null : 'lait')} />
            <PanelChip label="🥩 Viande" active={filterCertType === 'viande'} onClick={() => onFilterCertType(filterCertType === 'viande' ? null : 'viande')} />
          </div>

          {/* Catégorie */}
          <PanelLabel>Catégorie</PanelLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: certAuthorities.length > 0 ? 14 : 0 }}>
            <PanelChip label="Tous" active={activeFilter === 'all'} onClick={() => onFilter('all')} />
            {categories.map(c => (
              <PanelChip key={c.id} label={`${CAT_ICONS[c.slug] || '📍'} ${c.name}`} active={activeFilter === c.slug} onClick={() => onFilter(c.slug)} />
            ))}
          </div>

          {/* Certification */}
          {certAuthorities.length > 0 && (
            <>
              <PanelLabel>Certification</PanelLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {certAuthorities.map(auth => (
                  <PanelChip key={auth} label={auth} active={filterCertAuth === auth} onClick={() => onFilterCertAuth(filterCertAuth === auth ? null : auth)} small />
                ))}
              </div>
            </>
          )}

          {/* Appliquer */}
          <button
            onClick={() => setOpen(false)}
            style={{
              marginTop: 16, width: '100%', height: 44, borderRadius: 12,
              background: 'var(--gold)', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            Voir les résultats
          </button>
        </div>
      )}
    </>
  )
}

function QuickChip({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon?: string }) {
  return (
    <div onClick={onClick} style={{
      padding: '7px 13px', borderRadius: 18, fontSize: 12.5, fontWeight: 600,
      background: active ? 'var(--gold)' : '#fff',
      color: active ? '#fff' : 'var(--text2)',
      boxShadow: '0 2px 8px rgba(0,0,0,.10)',
      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .15s',
      display: 'flex', alignItems: 'center', gap: icon ? 5 : 0,
    }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 13 }} />}
      {label}
    </div>
  )
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>{children}</div>
}

function PanelChip({ label, active, onClick, small }: { label: string; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <div onClick={onClick} style={{
      padding: small ? '5px 10px' : '6px 14px',
      borderRadius: 18, fontSize: small ? 11.5 : 13, fontWeight: 600,
      border: `1.5px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
      background: active ? 'var(--gold)' : '#fff',
      color: active ? '#fff' : 'var(--text2)',
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
    }}>
      {label}
    </div>
  )
}

function Toggle({ active }: { active: boolean }) {
  return (
    <div style={{ width: 34, height: 20, borderRadius: 10, padding: 2, background: active ? '#1FA452' : '#ddd', transition: 'background .2s', position: 'relative', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: active ? 16 : 2, transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
    </div>
  )
}
