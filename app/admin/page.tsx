'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Suggestion {
  id: string
  created_at: string
  status: string
  place_id: string | null
  suggested_changes: Record<string, any>
  profiles: { display_name: string | null } | null
}

interface DeletionRequest {
  id: string
  created_at: string
  status: string
  target_type: 'place' | 'photo'
  place_id: string | null
  photo_id: string | null
  reason: string | null
  profiles: { display_name: string | null } | null
  places: { name: string } | null
}

export default function AdminPage() {
  const { session, profile, isAdmin, loading } = useAuth()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [deletions, setDeletions] = useState<DeletionRequest[]>([])
  const [places, setPlaces] = useState<any[]>([])
  const [tab, setTab] = useState<'suggestions' | 'deletions' | 'places'>('suggestions')
  const [busy, setBusy] = useState(false)
  const [placeSearch, setPlaceSearch] = useState('')
  const [editingPlace, setEditingPlace] = useState<any | null>(null)

  useEffect(() => {
    if (isAdmin) { loadSuggestions(); loadPlaces(); loadDeletions() }
  }, [isAdmin])

  async function loadDeletions() {
    const { data } = await supabase
      .from('deletion_requests')
      .select('id,created_at,status,target_type,place_id,photo_id,reason,profiles(display_name),places(name)')
      .order('created_at', { ascending: false })
      .limit(50)
    setDeletions((data as any) || [])
  }

  async function updateDeletion(id: string, status: 'approved' | 'rejected') {
    setBusy(true)
    await supabase.from('deletion_requests').update({ status }).eq('id', id)
    await loadDeletions()
    await loadPlaces()
    setBusy(false)
  }

  async function loadSuggestions() {
    const { data } = await supabase
      .from('place_suggestions')
      .select('id,created_at,status,place_id,suggested_changes,profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(50)
    setSuggestions((data as any) || [])
  }

  async function loadPlaces() {
    const { data } = await supabase
      .from('places')
      .select('id,name,city,address,phone,website,description,status,is_deleted,avg_rating,review_count,place_categories(category_id,categories(slug,name))')
      .order('name')
    setPlaces(data || [])
  }

  async function saveEdit(id: string, fields: Record<string, string>) {
    setBusy(true)
    await supabase.from('places').update({
      name: fields.name,
      city: fields.city,
      address: fields.address,
      phone: fields.phone,
      website: fields.website,
      description: fields.description,
    }).eq('id', id)
    setBusy(false)
    setEditingPlace(null)
    await loadPlaces()
  }

  async function updateSuggestion(id: string, status: 'approved' | 'rejected') {
    setBusy(true)
    await supabase.from('place_suggestions').update({ status }).eq('id', id)
    await loadSuggestions()
    setBusy(false)
  }

  async function togglePlace(id: string, deleted: boolean) {
    setBusy(true)
    await supabase.from('places').update({ is_deleted: !deleted }).eq('id', id)
    await loadPlaces()
    setBusy(false)
  }

  if (loading) return <Loading />

  if (!session) return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <i className="ti ti-lock" style={{ fontSize: 48, color: 'var(--gold)', display: 'block', marginBottom: 12 }} />
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Connexion requise</div>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>Connectez-vous pour accéder à l'administration.</div>
        <a href="/" style={{ display: 'inline-block', marginTop: 16, color: 'var(--gold)', fontSize: 13 }}>← Retour</a>
      </div>
    </Center>
  )

  if (!isAdmin) return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <i className="ti ti-shield-off" style={{ fontSize: 48, color: 'var(--red)', display: 'block', marginBottom: 12 }} />
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Accès refusé</div>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>Votre compte n'a pas les droits administrateur.</div>
        <a href="/" style={{ display: 'inline-block', marginTop: 16, color: 'var(--gold)', fontSize: 13 }}>← Retour</a>
      </div>
    </Center>
  )

  const pending = suggestions.filter(s => s.status === 'pending')
  const pendingDeletions = deletions.filter(d => d.status === 'pending')
  const totalPending = pending.length + pendingDeletions.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
      {/* Header */}
      <header style={{
        background: '#fff', borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <a href="/" style={{ color: 'var(--text3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <i className="ti ti-arrow-left" /> Retour
        </a>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Administration</span>
          <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text3)' }}>{profile?.display_name}</span>
        </div>
        {totalPending > 0 && (
          <div style={{ background: 'var(--red)', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
            {totalPending} en attente
          </div>
        )}
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
          {(['suggestions', 'deletions', 'places'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', transition: 'all .15s',
              background: tab === t ? 'var(--gold)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text2)',
            }}>
              {t === 'suggestions' ? `Suggestions (${pending.length})`
                : t === 'deletions' ? `Suppressions (${pendingDeletions.length})`
                : `Lieux (${places.length})`}
            </button>
          ))}
        </div>

        {/* Suggestions */}
        {tab === 'suggestions' && (
          <div>
            {suggestions.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 14 }}>Aucune suggestion.</div>
            )}
            {suggestions.map(s => (
              <div key={s.id} style={{
                background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
                padding: '16px 18px', marginBottom: 10,
                borderLeft: `4px solid ${s.status === 'pending' ? 'var(--gold)' : s.status === 'approved' ? 'var(--green)' : 'var(--red)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                      {s.suggested_changes?.name || '(sans nom)'}
                      {s.place_id ? <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>modification</span> : <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--blue)', fontWeight: 400 }}>nouveau lieu</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {s.suggested_changes?.city && <span><i className="ti ti-map-pin" /> {s.suggested_changes.city}</span>}
                      {s.suggested_changes?.category && <span><i className="ti ti-tag" /> {s.suggested_changes.category}</span>}
                      {s.suggested_changes?.cert_authority && <span><i className="ti ti-shield-check" /> {s.suggested_changes.cert_authority}</span>}
                      {s.profiles?.display_name && <span><i className="ti ti-user" /> {s.profiles.display_name}</span>}
                      <span><i className="ti ti-clock" /> {new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {s.suggested_changes?.description && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        "{s.suggested_changes.description}"
                      </div>
                    )}
                  </div>
                  {s.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => updateSuggestion(s.id, 'approved')} disabled={busy} style={{ ...actionBtn, background: 'var(--green)', color: '#fff' }}>
                        <i className="ti ti-check" /> Valider
                      </button>
                      <button onClick={() => updateSuggestion(s.id, 'rejected')} disabled={busy} style={{ ...actionBtn, background: 'var(--bg)', color: 'var(--red)', border: '1px solid rgba(224,54,59,.3)' }}>
                        <i className="ti ti-x" /> Refuser
                      </button>
                    </div>
                  )}
                  {s.status !== 'pending' && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 8,
                      background: s.status === 'approved' ? 'rgba(31,164,82,.1)' : 'rgba(224,54,59,.08)',
                      color: s.status === 'approved' ? 'var(--green)' : 'var(--red)',
                      flexShrink: 0,
                    }}>
                      {s.status === 'approved' ? 'Validé' : 'Refusé'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suppressions */}
        {tab === 'deletions' && (
          <div>
            {deletions.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 14 }}>Aucune demande de suppression.</div>
            )}
            {deletions.map(d => (
              <div key={d.id} style={{
                background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
                padding: '16px 18px', marginBottom: 10,
                borderLeft: `4px solid ${d.status === 'pending' ? 'var(--gold)' : d.status === 'approved' ? 'var(--green)' : 'var(--red)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className={`ti ${d.target_type === 'place' ? 'ti-building-store' : 'ti-photo'}`} style={{ color: 'var(--red)' }} />
                      {d.target_type === 'place' ? `Suppression de fiche : ${d.places?.name || '–'}` : 'Suppression de photo'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {d.profiles?.display_name && <span><i className="ti ti-user" /> {d.profiles.display_name}</span>}
                      <span><i className="ti ti-clock" /> {new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {d.reason && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', fontStyle: 'italic' }}>{d.reason}</div>}
                  </div>
                  {d.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => updateDeletion(d.id, 'approved')} disabled={busy} style={{ ...actionBtn, background: 'var(--red)', color: '#fff' }}>
                        <i className="ti ti-trash" /> Confirmer
                      </button>
                      <button onClick={() => updateDeletion(d.id, 'rejected')} disabled={busy} style={{ ...actionBtn, background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                        <i className="ti ti-x" /> Refuser
                      </button>
                    </div>
                  ) : (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 8,
                      background: d.status === 'approved' ? 'rgba(224,54,59,.08)' : 'rgba(31,164,82,.08)',
                      color: d.status === 'approved' ? 'var(--red)' : 'var(--green)',
                      flexShrink: 0,
                    }}>
                      {d.status === 'approved' ? 'Supprimé' : 'Refusé'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lieux */}
        {tab === 'places' && (
          <div>
            {/* Barre de recherche */}
            <div style={{ position: 'relative', marginBottom: 14, maxWidth: 360 }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 15 }} />
              <input
                type="search"
                value={placeSearch}
                onChange={e => setPlaceSearch(e.target.value)}
                placeholder="Rechercher un lieu, une ville…"
                style={{
                  width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8,
                  padding: '0 12px 0 36px', fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
                }}
              />
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    {['Nom', 'Ville', 'Note', 'Avis', 'Statut'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {places
                    .filter(p => {
                      const q = placeSearch.toLowerCase().trim()
                      if (!q) return true
                      return p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q)
                    })
                    .map((p, i, arr) => (
                    <tr
                      key={p.id}
                      onClick={() => setEditingPlace(p)}
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', opacity: p.is_deleted ? 0.4 : 1, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{p.city || '–'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{p.avg_rating ? Number(p.avg_rating).toFixed(1) : '–'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{p.review_count || 0}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                          background: p.is_deleted ? 'rgba(224,54,59,.08)' : 'rgba(31,164,82,.08)',
                          color: p.is_deleted ? 'var(--red)' : 'var(--green)',
                        }}>
                          {p.is_deleted ? 'Supprimé' : 'Actif'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => togglePlace(p.id, p.is_deleted)} disabled={busy} style={{
                          ...actionBtn, background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)',
                        }}>
                          {p.is_deleted ? 'Restaurer' : 'Masquer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modale édition lieu */}
      {editingPlace && (
        <EditPlaceModal
          place={editingPlace}
          onClose={() => setEditingPlace(null)}
          onSave={saveEdit}
          busy={busy}
        />
      )}
    </div>
  )
}

function EditPlaceModal({ place, onClose, onSave, busy }: { place: any; onClose: () => void; onSave: (id: string, f: Record<string,string>) => void; busy: boolean }) {
  const [f, setF] = useState({
    name: place.name || '', city: place.city || '', address: place.address || '',
    phone: place.phone || '', website: place.website || '', description: place.description || '',
  })
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(6px)',
      zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
        maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 40px rgba(0,0,0,.18)',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Modifier la fiche</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
          <EField label="Nom"><input value={f.name} onChange={e => set('name', e.target.value)} style={efInput} /></EField>
          <EField label="Ville"><input value={f.city} onChange={e => set('city', e.target.value)} style={efInput} /></EField>
          <EField label="Adresse"><input value={f.address} onChange={e => set('address', e.target.value)} style={efInput} /></EField>
          <EField label="Téléphone"><input value={f.phone} onChange={e => set('phone', e.target.value)} style={efInput} /></EField>
          <EField label="Site web"><input value={f.website} onChange={e => set('website', e.target.value)} style={efInput} /></EField>
          <EField label="Description">
            <textarea value={f.description} onChange={e => set('description', e.target.value)} style={{ ...efInput, height: 80, resize: 'none', padding: '10px 12px' }} />
          </EField>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ ...actionBtn, height: 38, flex: '0 0 auto', padding: '0 18px', background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }}>Annuler</button>
          <button onClick={() => onSave(place.id, f)} disabled={busy} style={{ ...actionBtn, height: 38, flex: 1, background: 'var(--gold)', color: '#fff' }}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const efInput: React.CSSProperties = {
  width: '100%', height: 38, background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '0 12px', fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
}

function Loading() {
  return (
    <Center>
      <div style={{ display: 'flex', gap: 6 }}>
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </Center>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)' }}>
      {children}
    </div>
  )
}

const actionBtn: React.CSSProperties = {
  height: 30, padding: '0 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, border: 'none',
  fontFamily: 'var(--font)', transition: 'all .15s', whiteSpace: 'nowrap',
}
