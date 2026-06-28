'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const FEATURES = [
  { icon: '👑', title: 'Badge Premium', desc: 'Votre fiche est mise en avant avec un badge doré visible par tous les utilisateurs.' },
  { icon: '🔝', title: 'Position prioritaire', desc: 'Apparaissez en tête de liste dans les résultats de recherche.' },
  { icon: '📸', title: 'Galerie photos illimitée', desc: 'Mettez en valeur votre établissement avec autant de photos que vous souhaitez.' },
  { icon: '📊', title: 'Statistiques de visites', desc: 'Consultez combien de personnes ont vu votre fiche chaque mois.' },
  { icon: '⚡', title: 'Modifications prioritaires', desc: 'Vos mises à jour (horaires, infos) sont appliquées immédiatement.' },
  { icon: '📍', title: 'Fiche optimisée SEO', desc: 'Votre page individuelle est référencée sur Google avec vos horaires et photos.' },
]

export default function PremiumPage() {
  const [placeName, setPlaceName] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<{ id: string; name: string; city: string | null }[]>([])
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function searchPlace() {
    if (!placeName.trim()) return
    setSearching(true)
    const { data } = await supabase.from('places').select('id,name,city')
      .ilike('name', `%${placeName.trim()}%`).eq('is_deleted', false).limit(8)
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

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/" style={{ fontSize: 20, fontWeight: 800, color: '#B8860B', letterSpacing: '-1px', textDecoration: 'none' }}>
          Kosher<span style={{ color: '#1FA452' }}>Map</span>
        </a>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px 80px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👑</div>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: '#111', margin: '0 0 14px', letterSpacing: '-1px' }}>
            Fiche Premium KosherMap
          </h1>
          <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.6, maxWidth: 560, margin: '0 auto 28px' }}>
            Attirez plus de clients en mettant votre établissement en avant sur la première carte casher d'Île-de-France.
          </p>
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #B8860B, #D4A017)', color: '#fff', borderRadius: 12, padding: '14px 32px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
            19 € / mois
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Sans engagement — résiliable à tout moment</div>
        </div>

        {/* Features grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 56 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 5 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Inscription */}
        <div style={{ background: '#fff', border: '2px solid #B8860B', borderRadius: 18, padding: '32px', maxWidth: 540, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 6px' }}>Commencer maintenant</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 22px' }}>Recherchez votre établissement puis souscrivez.</p>

          {!selected ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  value={placeName}
                  onChange={e => setPlaceName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchPlace()}
                  placeholder="Nom de votre établissement…"
                  style={{ flex: 1, height: 42, border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 14px', fontSize: 14, outline: 'none' }}
                />
                <button onClick={searchPlace} disabled={searching}
                  style={{ height: 42, padding: '0 18px', background: '#111', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {searching ? '…' : 'Chercher'}
                </button>
              </div>

              {results.length > 0 && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 9, overflow: 'hidden', marginBottom: 16 }}>
                  {results.map((r, i) => (
                    <div key={r.id} onClick={() => setSelected(r)}
                      style={{ padding: '11px 14px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid #f3f4f6' : 'none', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#faf9f7')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontWeight: 600 }}>{r.name}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{r.city || ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.length === 0 && placeName && !searching && (
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>
                  Aucun résultat. <a href="/" style={{ color: '#B8860B' }}>Proposer votre établissement</a>
                </div>
              )}
            </>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(184,134,11,.07)', border: '1.5px solid rgba(184,134,11,.3)', borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>👑 {selected.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Fiche sélectionnée</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>×</button>
              </div>
            </div>
          )}

          <button
            onClick={subscribe}
            disabled={!selected || loading}
            style={{
              width: '100%', height: 50, borderRadius: 12, border: 'none', cursor: selected ? 'pointer' : 'not-allowed',
              background: selected ? 'linear-gradient(135deg, #B8860B, #D4A017)' : '#e5e7eb',
              color: selected ? '#fff' : '#9ca3af', fontSize: 15, fontWeight: 800, transition: 'all .2s',
            }}
          >
            {loading ? 'Redirection…' : selected ? `Activer Premium — 19 €/mois` : 'Sélectionnez votre établissement'}
          </button>
          <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10 }}>
            Paiement sécurisé par Stripe · CB, Apple Pay, Google Pay
          </div>
        </div>
      </main>
    </div>
  )
}
