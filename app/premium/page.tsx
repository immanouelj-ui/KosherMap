'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif`

const FEATURES = [
  { title: 'Position prioritaire', desc: 'Votre fiche apparaît en tête de liste dans tous les résultats de recherche.' },
  { title: 'Badge identifié', desc: 'Un badge discret et élégant signale votre fiche aux utilisateurs.' },
  { title: 'Page référencée sur Google', desc: 'Une page dédiée avec horaires, photos et certifications, indexée par les moteurs de recherche.' },
  { title: 'Paiement sécurisé', desc: 'Stripe gère votre abonnement. CB, Apple Pay ou Google Pay.' },
]

function CrownBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: '#111', border: '1px solid rgba(245,198,60,.3)',
      borderRadius: 5, padding: '3px 9px 3px 7px',
    }}>
      <svg width="11" height="10" viewBox="0 0 11 10" fill="none">
        <path d="M1 8.5L2.2 3.2L4.8 6L5.5 1.5L6.2 6L8.8 3.2L10 8.5H1Z" fill="#F5C83C" stroke="#F5C83C" strokeWidth=".4" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#F5C83C', textTransform: 'uppercase' as const }}>Premium</span>
    </span>
  )
}

export default function PremiumPage() {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<{ id: string; name: string; city: string | null }[]>([])
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function searchPlace() {
    if (!query.trim()) return
    setSearching(true)
    const { data } = await supabase.from('places').select('id,name,city')
      .ilike('name', `%${query.trim()}%`).eq('is_deleted', false).limit(8)
    setResults(data || [])
    setSearching(false)
  }

  async function subscribe() {
    if (!selected) return
    setLoading(true)
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_id: selected.id, place_name: selected.name }),
    })
    const { url, error } = await res.json()
    if (error) { alert(error); setLoading(false); return }
    window.location.href = url
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const, height: 42,
    border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 14px',
    fontSize: 14, fontFamily: FONT, outline: 'none', background: '#fff', color: '#111',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9f8f6', fontFamily: FONT }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #ebebeb', height: 56, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 19, fontWeight: 800, color: '#B8860B', letterSpacing: '-1px' }}>Kosher</span>
          <span style={{ fontSize: 19, fontWeight: 800, color: '#1FA452', letterSpacing: '-1px' }}>Map</span>
        </a>
        <div style={{ flex: 1 }} />
        <a href="/" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>← Retour à la carte</a>
      </header>

      <main style={{ maxWidth: 700, margin: '0 auto', padding: '56px 20px 80px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 52 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: '#B8860B', margin: '0 0 14px' }}>
            KosherMap Premium
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#111', margin: '0 0 16px', letterSpacing: '-1.2px', lineHeight: 1.1 }}>
            Votre établissement<br />en tête de liste.
          </h1>
          <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.65, margin: '0 0 28px', maxWidth: 480 }}>
            Atteignez plus de clients casher en Île-de-France avec une fiche mise en avant sur la première carte casher de la région.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: '#111', letterSpacing: '-2px', lineHeight: 1 }}>9 €</span>
            <span style={{ fontSize: 15, color: '#9ca3af' }}>/ mois · sans engagement</span>
          </div>
        </div>

        {/* Aperçu badge + features */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>

          {/* Aperçu visuel */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 14, padding: '20px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 14px' }}>Aperçu dans la liste</p>
            {/* Row premium */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(184,134,11,.05)', border: '1px solid rgba(184,134,11,.15)', borderRadius: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(31,164,82,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🥩</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <CrownBadge />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>La Table de Sarah</div>
              </div>
            </div>
            {/* Rows normaux */}
            {['Boulangerie Friedman', 'Épicerie Katz'].map(n => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', opacity: .38, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f3f4f6' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{n}</span>
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 14, padding: '20px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 14px' }}>Ce qui est inclus</p>
            {FEATURES.map((f, i) => (
              <div key={f.title} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < FEATURES.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1FA452', marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: '0 0 2px' }}>{f.title}</p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulaire d'inscription */}
        <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 16, padding: '28px 28px 24px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 4px', letterSpacing: '-.4px' }}>Activer pour mon établissement</h2>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>Recherchez votre établissement pour commencer.</p>

          {!selected ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchPlace()}
                  placeholder="Nom de votre établissement…"
                  style={{ ...inp, flex: 1 }}
                />
                <button onClick={searchPlace} disabled={searching} style={{
                  height: 42, padding: '0 18px', background: '#111', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap',
                }}>
                  {searching ? '…' : 'Chercher'}
                </button>
              </div>

              {results.length > 0 && (
                <div style={{ border: '1px solid #ebebeb', borderRadius: 9, overflow: 'hidden', marginBottom: 14 }}>
                  {results.map((r, i) => (
                    <div key={r.id} onClick={() => { setSelected(r); setResults([]) }}
                      style={{ padding: '11px 14px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid #f3f4f6' : 'none', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f8f6')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <span style={{ fontWeight: 600, color: '#111' }}>{r.name}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{r.city || ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.length === 0 && query && !searching && (
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>
                  Aucun résultat. <a href="/" style={{ color: '#B8860B', textDecoration: 'none' }}>Proposer votre établissement</a>
                </p>
              )}
            </>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', background: 'rgba(184,134,11,.05)', border: '1px solid rgba(184,134,11,.2)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CrownBadge />
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{selected.name}</span>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: 4, fontFamily: FONT }}>×</button>
              </div>
            </div>
          )}

          <button onClick={subscribe} disabled={!selected || loading} style={{
            width: '100%', height: 48, borderRadius: 10, border: 'none',
            background: selected ? '#111' : '#e5e7eb',
            color: selected ? '#fff' : '#9ca3af',
            fontSize: 15, fontWeight: 700, cursor: selected ? 'pointer' : 'not-allowed',
            fontFamily: FONT, transition: 'background .15s',
          }}>
            {loading ? 'Redirection…' : selected ? `Activer Premium — 9 € / mois` : 'Sélectionnez votre établissement'}
          </button>
          <p style={{ fontSize: 11, color: '#c4c4c4', textAlign: 'center', margin: '10px 0 0' }}>
            Paiement sécurisé par Stripe · CB, Apple Pay, Google Pay
          </p>
        </div>
      </main>
    </div>
  )
}
