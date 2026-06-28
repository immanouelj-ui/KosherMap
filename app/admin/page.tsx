'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import HoraireEditor, { emptyWeek, rowsToWeek, weekToRows, type WeekSchedule } from '@/app/components/HoraireEditor'

interface Suggestion {
  id: string; created_at: string; status: string; place_id: string | null
  suggested_changes: Record<string, any>; profiles: { display_name: string | null } | null
}
interface DeletionRequest {
  id: string; created_at: string; status: string; target_type: 'place' | 'photo'
  place_id: string | null; photo_id: string | null; reason: string | null
  profiles: { display_name: string | null } | null; places: { name: string } | null
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
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number; closed: string[] } | null>(null)

  useEffect(() => {
    if (isAdmin) { loadSuggestions(); loadPlaces(); loadDeletions() }
  }, [isAdmin])

  async function loadDeletions() {
    const { data } = await supabase.from('deletion_requests')
      .select('id,created_at,status,target_type,place_id,photo_id,reason,profiles(display_name),places(name)')
      .order('created_at', { ascending: false }).limit(50)
    setDeletions((data as any) || [])
  }

  async function updateDeletion(id: string, status: 'approved' | 'rejected') {
    setBusy(true)
    await supabase.from('deletion_requests').update({ status }).eq('id', id)
    await loadDeletions(); await loadPlaces()
    setBusy(false)
  }

  async function loadSuggestions() {
    const { data } = await supabase.from('place_suggestions')
      .select('id,created_at,status,place_id,suggested_changes,profiles(display_name)')
      .order('created_at', { ascending: false }).limit(50)
    setSuggestions((data as any) || [])
  }

  async function loadPlaces() {
    const { data } = await supabase.from('places')
      .select('id,name,city,address,phone,website,description,status,is_deleted,avg_rating,review_count,location,is_premium,premium_until,place_categories(category_id,categories(slug,name))')
      .order('name')
    setPlaces(data || [])
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

  async function scanClosedPlaces() {
    const active = places.filter(p => !p.is_deleted)
    if (active.length === 0) return
    setScanning(true)
    setScanProgress({ done: 0, total: active.length, closed: [] })
    const closed: string[] = []
    for (let i = 0; i < active.length; i++) {
      const p = active[i]
      try {
        const res = await fetch('/api/admin/check-closed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place_id: p.id, name: p.name, city: p.city }),
        })
        const data = await res.json()
        if (data.closed) closed.push(p.name)
      } catch {}
      setScanProgress({ done: i + 1, total: active.length, closed: [...closed] })
      await new Promise(r => setTimeout(r, 1200))
    }
    setScanning(false)
    await loadPlaces()
  }

  async function togglePremium(id: string, currentPremium: boolean) {
    setBusy(true)
    await supabase.from('places').update({
      is_premium: !currentPremium,
      premium_until: !currentPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    }).eq('id', id)
    await loadPlaces()
    setBusy(false)
  }

  if (loading) return <Loading />
  if (!session) return <Center><AccessDenied icon="ti-lock" msg="Connectez-vous pour accéder à l'administration." /></Center>
  if (!isAdmin) return <Center><AccessDenied icon="ti-shield-off" msg="Votre compte n'a pas les droits administrateur." red /></Center>

  const pending = suggestions.filter(s => s.status === 'pending')
  const pendingDeletions = deletions.filter(d => d.status === 'pending')
  const totalPending = pending.length + pendingDeletions.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
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

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
          {(['suggestions', 'deletions', 'places'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', transition: 'all .15s',
              background: tab === t ? 'var(--gold)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text2)',
            }}>
              {t === 'suggestions' ? `Suggestions (${pending.length})` : t === 'deletions' ? `Suppressions (${pendingDeletions.length})` : `Lieux (${places.length})`}
            </button>
          ))}
        </div>

        {/* ── Suggestions ── */}
        {tab === 'suggestions' && (
          <div>
            {suggestions.length === 0 && <Empty msg="Aucune suggestion." />}
            {suggestions.map(s => (
              <div key={s.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 10, borderLeft: `4px solid ${s.status === 'pending' ? 'var(--gold)' : s.status === 'approved' ? 'var(--green)' : 'var(--red)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                      {s.suggested_changes?.name || '(sans nom)'}
                      {s.place_id ? <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>modification</span> : <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--blue)', fontWeight: 400 }}>nouveau lieu</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {s.suggested_changes?.city && <span><i className="ti ti-map-pin" /> {s.suggested_changes.city}</span>}
                      {s.profiles?.display_name && <span><i className="ti ti-user" /> {s.profiles.display_name}</span>}
                      <span><i className="ti ti-clock" /> {new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  {s.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => updateSuggestion(s.id, 'approved')} disabled={busy} style={{ ...actionBtn, background: 'var(--green)', color: '#fff' }}><i className="ti ti-check" /> Valider</button>
                      <button onClick={() => updateSuggestion(s.id, 'rejected')} disabled={busy} style={{ ...actionBtn, background: 'var(--bg)', color: 'var(--red)', border: '1px solid rgba(224,54,59,.3)' }}><i className="ti ti-x" /> Refuser</button>
                    </div>
                  ) : (
                    <StatusBadge ok={s.status === 'approved'} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Suppressions ── */}
        {tab === 'deletions' && (
          <div>
            {deletions.length === 0 && <Empty msg="Aucune demande de suppression." />}
            {deletions.map(d => (
              <div key={d.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 10, borderLeft: `4px solid ${d.status === 'pending' ? 'var(--gold)' : d.status === 'approved' ? 'var(--green)' : 'var(--red)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className={`ti ${d.target_type === 'place' ? 'ti-building-store' : 'ti-photo'}`} style={{ color: 'var(--red)' }} />
                      {d.target_type === 'place' ? `Suppression : ${d.places?.name || '–'}` : 'Suppression de photo'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {d.profiles?.display_name && <span><i className="ti ti-user" /> {d.profiles.display_name}</span>}
                      <span><i className="ti ti-clock" /> {new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {d.reason && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', fontStyle: 'italic' }}>{d.reason}</div>}
                  </div>
                  {d.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => updateDeletion(d.id, 'approved')} disabled={busy} style={{ ...actionBtn, background: 'var(--red)', color: '#fff' }}><i className="ti ti-trash" /> Confirmer</button>
                      <button onClick={() => updateDeletion(d.id, 'rejected')} disabled={busy} style={{ ...actionBtn, background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }}><i className="ti ti-x" /> Refuser</button>
                    </div>
                  ) : (
                    <StatusBadge ok={d.status !== 'approved'} labelOk="Refusé" labelNo="Supprimé" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Lieux ── */}
        {tab === 'places' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 15 }} />
              <input type="search" value={placeSearch} onChange={e => setPlaceSearch(e.target.value)} placeholder="Rechercher un lieu, une ville…"
                style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px 0 36px', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
              </div>
              <button
                onClick={scanClosedPlaces}
                disabled={scanning || busy}
                style={{ ...actionBtn, background: scanning ? 'var(--bg)' : 'rgba(224,54,59,.08)', color: 'var(--red)', border: '1px solid rgba(224,54,59,.25)', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                <i className="ti ti-brand-google" />
                {scanning ? `Scan… ${scanProgress?.done}/${scanProgress?.total}` : 'Vérifier fermetures Google'}
              </button>
            </div>

            {scanProgress && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--red)', borderRadius: 3, transition: 'width .3s', width: `${Math.round((scanProgress.done / scanProgress.total) * 100)}%` }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{scanProgress.done}/{scanProgress.total}</span>
                </div>
                {scanProgress.closed.length === 0 && !scanning && (
                  <p style={{ fontSize: 12.5, color: 'var(--green)', margin: 0, fontWeight: 600 }}>Aucun établissement définitivement fermé détecté.</p>
                )}
                {scanProgress.closed.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--red)', margin: '0 0 6px' }}>
                      {scanProgress.closed.length} établissement{scanProgress.closed.length > 1 ? 's' : ''} définitivement fermé{scanProgress.closed.length > 1 ? 's' : ''} et masqué{scanProgress.closed.length > 1 ? 's' : ''} :
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {scanProgress.closed.map(n => <li key={n} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>{n}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    {['Nom', 'Ville', 'Tél', 'GPS', 'Premium', 'Statut'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {places.filter(p => {
                    const q = placeSearch.toLowerCase().trim()
                    return !q || p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q)
                  }).map((p, i, arr) => (
                    <tr key={p.id} onClick={() => setEditingPlace(p)}
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', opacity: p.is_deleted ? 0.4 : 1, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{p.city || '–'}</td>
                      <td style={{ padding: '10px 14px', color: p.phone ? 'var(--text2)' : 'var(--text3)', fontSize: 12 }}>{p.phone || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {p.location
                          ? <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>✓ GPS</span>
                          : <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>✗ Manquant</span>
                        }
                      </td>
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => togglePremium(p.id, p.is_premium)} disabled={busy}
                          title={p.premium_until ? `Expire : ${new Date(p.premium_until).toLocaleDateString('fr-FR')}` : ''}
                          style={{ ...actionBtn, background: p.is_premium ? 'rgba(184,134,11,.12)' : 'var(--bg)', color: p.is_premium ? 'var(--gold)' : 'var(--text3)', border: `1px solid ${p.is_premium ? 'rgba(184,134,11,.35)' : 'var(--border)'}` }}>
                          {p.is_premium ? '👑 Premium' : '— Activer'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: p.is_deleted ? 'rgba(224,54,59,.08)' : 'rgba(31,164,82,.08)', color: p.is_deleted ? 'var(--red)' : 'var(--green)' }}>
                          {p.is_deleted ? 'Supprimé' : 'Actif'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => togglePlace(p.id, p.is_deleted)} disabled={busy}
                          style={{ ...actionBtn, background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
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

      {editingPlace && (
        <EditPlaceModal place={editingPlace} onClose={() => { setEditingPlace(null); loadPlaces() }} />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Modale d'édition — 3 onglets : Infos / Photos / GPS
══════════════════════════════════════════════════════ */
function EditPlaceModal({ place, onClose }: { place: any; onClose: () => void }) {
  const [tab, setTab] = useState<'infos' | 'photos' | 'horaires' | 'gps'>('infos')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── Infos ──
  const [f, setF] = useState({
    name: place.name || '', city: place.city || '', address: place.address || '',
    phone: place.phone || '', website: place.website || '', description: place.description || '',
  })

  async function saveInfos() {
    setBusy(true)
    await supabase.from('places').update({
      name: f.name, city: f.city, address: f.address,
      phone: f.phone, website: f.website, description: f.description,
    }).eq('id', place.id)
    setBusy(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  // ── Photos ──
  const [photos, setPhotos] = useState<any[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)

  async function loadPhotos() {
    setPhotosLoading(true)
    const { data } = await supabase.from('photos').select('id,storage_path,is_primary').eq('place_id', place.id).order('is_primary', { ascending: false })
    if (data && data.length > 0) { setPhotos(data); setPhotosLoading(false); return }
    // Fallback Storage
    const { data: files } = await supabase.storage.from('photos').list(`places/${place.id}`, { limit: 10, sortBy: { column: 'name', order: 'asc' } })
    if (files) {
      setPhotos(files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f.name)).map((f, i) => ({
        id: f.id || `${place.id}-${i}`, storage_path: `places/${place.id}/${f.name}`, is_primary: f.name === 'cover.jpg',
      })))
    }
    setPhotosLoading(false)
  }

  async function deletePhoto(photo: any) {
    setBusy(true)
    await supabase.from('photos').delete().eq('id', photo.id)
    await supabase.storage.from('photos').remove([photo.storage_path])
    await loadPhotos()
    setBusy(false)
  }

  async function setPrimary(photo: any) {
    setBusy(true)
    await supabase.from('photos').update({ is_primary: false }).eq('place_id', place.id)
    await supabase.from('photos').update({ is_primary: true }).eq('id', photo.id)
    await loadPhotos()
    setBusy(false)
  }

  // ── GPS ──
  const parseLocation = () => {
    if (!place.location) return { lat: '', lng: '' }
    const m = place.location.match(/POINT\(([^ ]+) ([^ )]+)\)/)
    return m ? { lat: m[2], lng: m[1] } : { lat: '', lng: '' }
  }
  const initial = parseLocation()
  const [lat, setLat] = useState(initial.lat)
  const [lng, setLng] = useState(initial.lng)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeResult, setGeocodeResult] = useState<string | null>(null)

  async function geocodeAddress() {
    const addr = [f.address, f.city, 'France'].filter(Boolean).join(', ')
    setGeocoding(true); setGeocodeResult(null)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`)
      const data = await res.json()
      if (data[0]) {
        setLat(String(parseFloat(data[0].lat).toFixed(6)))
        setLng(String(parseFloat(data[0].lon).toFixed(6)))
        setGeocodeResult(`Trouvé : ${data[0].display_name}`)
      } else {
        setGeocodeResult('Adresse introuvable')
      }
    } catch { setGeocodeResult('Erreur réseau') }
    setGeocoding(false)
  }

  async function saveGPS() {
    if (!lat || !lng) return
    setBusy(true)
    await supabase.from('places').update({ location: `SRID=4326;POINT(${lng} ${lat})` }).eq('id', place.id)
    setBusy(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  useEffect(() => {
    if (tab === 'photos') loadPhotos()
    if (tab === 'horaires') loadHours()
  }, [tab])

  function getUrl(path: string) {
    const { data } = supabase.storage.from('photos').getPublicUrl(path)
    return data.publicUrl
  }

  // ── Horaires ──
  const [schedule, setSchedule] = useState<WeekSchedule>(emptyWeek())
  const [hoursLoading, setHoursLoading] = useState(false)

  async function loadHours() {
    setHoursLoading(true)
    const { data } = await supabase.from('opening_hours').select('*').eq('place_id', place.id)
    setSchedule(data && data.length > 0 ? rowsToWeek(data) : emptyWeek())
    setHoursLoading(false)
  }

  async function saveHours() {
    setBusy(true)
    await supabase.from('opening_hours').delete().eq('place_id', place.id)
    const rows = weekToRows(place.id, schedule)
    if (rows.length > 0) await supabase.from('opening_hours').insert(rows)
    setBusy(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const TABS = [
    { id: 'infos', label: 'Infos', icon: 'ti-edit' },
    { id: 'photos', label: 'Photos', icon: 'ti-photo' },
    { id: 'horaires', label: 'Horaires', icon: 'ti-clock' },
    { id: 'gps', label: 'Localisation', icon: 'ti-map-pin' },
  ] as const

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(6px)',
      zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 50px rgba(0,0,0,.2)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{place.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{[place.address, place.city].filter(Boolean).join(', ')}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)', padding: 4 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', gap: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              height: 44, padding: '0 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
              color: tab === t.id ? 'var(--gold)' : 'var(--text2)',
              borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'color .15s',
            }}>
              <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ── Onglet Infos ── */}
          {tab === 'infos' && (
            <div>
              <EField label="Nom"><input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} style={efInput} /></EField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <EField label="Ville"><input value={f.city} onChange={e => setF(p => ({ ...p, city: e.target.value }))} style={efInput} /></EField>
                <EField label="Téléphone"><input value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} style={efInput} /></EField>
              </div>
              <EField label="Adresse"><input value={f.address} onChange={e => setF(p => ({ ...p, address: e.target.value }))} style={efInput} /></EField>
              <EField label="Site web"><input value={f.website} onChange={e => setF(p => ({ ...p, website: e.target.value }))} style={efInput} /></EField>
              <EField label="Description">
                <textarea value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} style={{ ...efInput, height: 80, resize: 'none', padding: '10px 12px' }} />
              </EField>
            </div>
          )}

          {/* ── Onglet Photos ── */}
          {tab === 'photos' && (
            <div>
              {photosLoading && <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Chargement…</div>}
              {!photosLoading && photos.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>
                  <i className="ti ti-photo-off" style={{ fontSize: 36, display: 'block', marginBottom: 8, opacity: .3 }} />
                  Aucune photo enregistrée
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {photos.map(ph => (
                  <div key={ph.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: ph.is_primary ? '2.5px solid var(--gold)' : '1px solid var(--border)', aspectRatio: '4/3' }}>
                    <img src={getUrl(ph.storage_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {ph.is_primary && (
                      <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--gold)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8 }}>
                        Principale
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px', display: 'flex', gap: 4, background: 'linear-gradient(transparent, rgba(0,0,0,.6))' }}>
                      {!ph.is_primary && (
                        <button onClick={() => setPrimary(ph)} disabled={busy} title="Définir comme principale"
                          style={{ flex: 1, height: 26, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.25)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          <i className="ti ti-star" />
                        </button>
                      )}
                      <button onClick={() => deletePhoto(ph)} disabled={busy} title="Supprimer"
                        style={{ flex: 1, height: 26, borderRadius: 6, border: 'none', background: 'rgba(224,54,59,.7)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Onglet Horaires ── */}
          {tab === 'horaires' && (
            <div>
              {hoursLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Chargement…</div>
              ) : (
                <HoraireEditor value={schedule} onChange={setSchedule} />
              )}
            </div>
          )}

          {/* ── Onglet GPS ── */}
          {tab === 'gps' && (
            <div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Coordonnées actuelles</div>
                {place.location ? (
                  <div style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="ti ti-map-pin-check" style={{ color: 'var(--green)', fontSize: 16 }} />
                    lat {parseLocation().lat} / lng {parseLocation().lng}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="ti ti-map-pin-off" style={{ fontSize: 16 }} /> Localisation manquante
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                  Géocoder depuis l'adresse
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                  Adresse : <strong>{[f.address, f.city].filter(Boolean).join(', ') || '(non renseignée)'}</strong>
                </div>
                <button onClick={geocodeAddress} disabled={geocoding || busy}
                  style={{ ...actionBtn, height: 36, padding: '0 16px', background: '#0A7CFF', color: '#fff' }}>
                  <i className="ti ti-wand" /> {geocoding ? 'Recherche…' : 'Géocoder automatiquement'}
                </button>
                {geocodeResult && (
                  <div style={{ marginTop: 10, fontSize: 12, color: geocodeResult.startsWith('Trouvé') ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                    {geocodeResult}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <EField label="Latitude">
                  <input value={lat} onChange={e => setLat(e.target.value)} placeholder="48.8566" style={efInput} />
                </EField>
                <EField label="Longitude">
                  <input value={lng} onChange={e => setLng(e.target.value)} placeholder="2.3522" style={efInput} />
                </EField>
              </div>

              {lat && lng && (
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0A7CFF', marginBottom: 14, textDecoration: 'none' }}
                >
                  <i className="ti ti-external-link" /> Vérifier sur Google Maps
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}><i className="ti ti-circle-check" /> Enregistré</span>}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ ...actionBtn, height: 38, padding: '0 18px', background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
            Fermer
          </button>
          {tab === 'infos' && (
            <button onClick={saveInfos} disabled={busy} style={{ ...actionBtn, height: 38, padding: '0 20px', background: 'var(--gold)', color: '#fff' }}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          )}
          {tab === 'horaires' && (
            <button onClick={saveHours} disabled={busy} style={{ ...actionBtn, height: 38, padding: '0 20px', background: 'var(--gold)', color: '#fff' }}>
              {busy ? 'Enregistrement…' : 'Enregistrer les horaires'}
            </button>
          )}
          {tab === 'gps' && (
            <button onClick={saveGPS} disabled={busy || !lat || !lng} style={{ ...actionBtn, height: 38, padding: '0 20px', background: 'var(--gold)', color: '#fff' }}>
              {busy ? 'Enregistrement…' : 'Enregistrer GPS'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ── */
function EField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function Empty({ msg }: { msg: string }) {
  return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 14 }}>{msg}</div>
}

function StatusBadge({ ok, labelOk = 'Validé', labelNo = 'Refusé' }: { ok: boolean; labelOk?: string; labelNo?: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 8, flexShrink: 0, background: ok ? 'rgba(31,164,82,.1)' : 'rgba(224,54,59,.08)', color: ok ? 'var(--green)' : 'var(--red)' }}>
      {ok ? labelOk : labelNo}
    </span>
  )
}

function AccessDenied({ icon, msg, red }: { icon: string; msg: string; red?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 48, color: red ? 'var(--red)' : 'var(--gold)', display: 'block', marginBottom: 12 }} />
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{red ? 'Accès refusé' : 'Connexion requise'}</div>
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{msg}</div>
      <a href="/" style={{ display: 'inline-block', marginTop: 16, color: 'var(--gold)', fontSize: 13 }}>← Retour</a>
    </div>
  )
}

function Loading() {
  return <Center><div style={{ display: 'flex', gap: 6 }}><span className="dot" /><span className="dot" /><span className="dot" /></div></Center>
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)' }}>{children}</div>
}

const efInput: React.CSSProperties = {
  width: '100%', height: 38, background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '0 12px', fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
}

const actionBtn: React.CSSProperties = {
  height: 30, padding: '0 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none',
  fontFamily: 'var(--font)', transition: 'all .15s', whiteSpace: 'nowrap',
}
