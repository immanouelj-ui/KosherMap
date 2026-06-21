'use client'
import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import TopBar             from './components/TopBar'
import TopBarMobile        from './components/TopBarMobile'
import CategoryChipsMobile from './components/CategoryChipsMobile'
import Sidebar             from './components/Sidebar'
import { PlaceList }       from './components/PlaceList'
import BottomSheet         from './components/BottomSheet'
import DetailPanel         from './components/DetailPanel'
import AuthModal           from './components/AuthModal'
import AddModal            from './components/AddModal'
import { Toast, toast }    from './components/Toast'
import { usePlaces }       from '@/hooks/usePlaces'
import { useAuth }         from '@/hooks/useAuth'
import { useIsMobile }     from '@/hooks/useIsMobile'
import type { Place }      from '@/types'
import type { TileStyle }  from './components/Map'

const KosherMap = dynamic(() => import('./components/Map'), { ssr: false })

export default function Home() {
  const { places, categories, loading, error, computeDistances } = usePlaces()
  const { session, profile, isAdmin, signIn, signUp, signOut }   = useAuth()
  const { isMobile, ready } = useIsMobile()

  const [query, setQuery]           = useState('')
  const [filter, setFilter]         = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userLoc, setUserLoc]       = useState<{ lat: number; lng: number } | null>(null)
  const [tileStyle, setTile]        = useState<TileStyle>('plan')
  const [authOpen, setAuthOpen]     = useState(false)
  const [addOpen, setAddOpen]       = useState(false)
  const [pending, setPending]       = useState<'add' | 'edit' | null>(null)
  const [sheetSnap, setSheetSnap]   = useState(1)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    let list = places.filter(p => {
      const matchQ = !q
        || p.name?.toLowerCase().includes(q)
        || p.city?.toLowerCase().includes(q)
        || p.address?.toLowerCase().includes(q)
      const matchCat = filter === 'all' || p._cats.includes(filter)
      return matchQ && matchCat
    })
    // Tri automatique par proximité dès que la position GPS est connue
    if (userLoc) {
      list = [...list].sort((a, b) => (a._distanceKm ?? Infinity) - (b._distanceKm ?? Infinity))
    }
    return list
  }, [places, query, filter, userLoc])

  const selected = useMemo<Place | null>(
    () => places.find(p => p.id === selectedId) ?? null,
    [places, selectedId]
  )

  function locate(silent = false) {
    if (!navigator.geolocation) { if (!silent) toast('Indisponible', 'Géolocalisation non supportée', 'error'); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserLoc({ lat, lng })
        computeDistances(lat, lng)
        if (!silent) toast('Localisé', 'Carte centrée sur votre position', 'success')
      },
      () => { if (!silent) toast('Erreur', 'Impossible de récupérer votre position', 'error') },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  /* Géolocalisation automatique à l'ouverture sur mobile (silencieuse, sans toast d'erreur si refusée) */
  useEffect(() => {
    if (isMobile && ready) {
      locate(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, ready])

  function openAdd() {
    if (!session) { setPending('add'); setAuthOpen(true); return }
    setAddOpen(true)
  }

  function openEdit() {
    if (!session) { setPending('edit'); setAuthOpen(true); return }
    setAddOpen(true)
  }

  function onAuthSuccess() {
    if (pending) { setAddOpen(true); setPending(null) }
  }

  function share() {
    if (!selected) return
    const text = `${selected.name} — ${[selected.address, selected.city].filter(Boolean).join(', ')}`
    navigator.clipboard?.writeText(text)
    toast('Copié !', 'Informations copiées dans le presse-papier', 'info')
  }

  function selectPlace(id: string) {
    setSelectedId(id)
    if (isMobile) setSheetSnap(1) // ouvre le détail à mi-écran sur mobile (l'utilisateur peut le remonter)
  }

  function closeDetail() {
    setSelectedId(null)
    if (isMobile) setSheetSnap(1)
  }

  const initialData = selected
    ? { name: selected.name || '', city: selected.city || '', address: selected.address || '', phone: selected.phone || '', website: selected.website || '', description: selected.description || '' }
    : undefined

  /* Évite tout mismatch d'hydratation : on attend de connaître la taille d'écran réelle côté client */
  if (!ready) {
    return (
      <div style={{ height: '100dvh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="dot" /><span className="dot" /><span className="dot" />
        </div>
      </div>
    )
  }

  /* ───────────────────────── MOBILE ───────────────────────── */
  if (isMobile) {
    return (
      <div style={{ height: '100dvh', width: '100vw', position: 'relative', overflow: 'hidden', display: 'flex' }}>
        <KosherMap
          places={filtered}
          selectedId={selectedId}
          userLoc={userLoc}
          tileStyle={tileStyle}
          isMobile
          onTileChange={setTile}
          onSelect={selectPlace}
          onLocate={locate}
        />

        {!selected && (
          <>
            <TopBarMobile
              query={query}
              onQuery={setQuery}
              profile={profile}
              session={session}
              isAdmin={isAdmin}
              onAdmin={() => window.location.href = '/admin'}
              onSignOut={() => { signOut(); toast('Déconnecté', 'À bientôt !', 'info') }}
              onAuthClick={() => setAuthOpen(true)}
            />
            <CategoryChipsMobile categories={categories} activeFilter={filter} onFilter={setFilter} />
          </>
        )}

        {/* Bouton flottant "Proposer un lieu" */}
        {!selected && sheetSnap < 2 && (
          <button onClick={openAdd} style={{
            position: 'fixed', right: 14, zIndex: 650,
            bottom: `calc(${[14, 50, 92][sheetSnap]}vh + 14px)`,
            height: 46, padding: '0 18px', borderRadius: 24,
            background: 'var(--gold)', color: '#fff', border: 'none',
            display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600,
            boxShadow: '0 4px 16px rgba(184,134,11,.35)', fontFamily: 'var(--font)',
            transition: 'bottom .28s cubic-bezier(.32,.72,0,1)',
          }}>
            <i className="ti ti-plus" /> Proposer
          </button>
        )}

        {selected ? (
          <BottomSheet snapPoints={[6, 50, 92]} initial={sheetSnap} onSnapChange={i => { setSheetSnap(i); if (i === 0) closeDetail() }}>
            <DetailPanel
              place={selected}
              categories={categories}
              session={session}
              profile={profile}
              fullscreen
              onClose={closeDetail}
              onEdit={openEdit}
              onShare={share}
              onAuthRequired={() => setAuthOpen(true)}
            />
          </BottomSheet>
        ) : (
          <BottomSheet snapPoints={[14, 50, 92]} initial={sheetSnap} onSnapChange={setSheetSnap}>
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ fontSize: 12.5, color: 'var(--text3)', padding: '2px 2px 10px' }}>
                <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{filtered.length}</span> lieu{filtered.length > 1 ? 'x' : ''} trouvé{filtered.length > 1 ? 's' : ''}
              </div>
              <PlaceList places={filtered} categories={categories} selectedId={selectedId} loading={loading} onSelect={selectPlace} />
            </div>
          </BottomSheet>
        )}

        {error && (
          <div style={{
            position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--red)', color: '#fff', padding: '10px 20px',
            borderRadius: 8, fontSize: 12.5, zIndex: 9999, maxWidth: '90vw',
          }}>
            Erreur : {error}
          </div>
        )}

        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSignIn={signIn} onSignUp={signUp} onSuccess={onAuthSuccess} />
        <AddModal open={addOpen} placeId={selectedId} initialData={initialData} profile={profile} session={session}
          onClose={() => setAddOpen(false)} onSuccess={() => toast('Suggestion envoyée !', 'Merci — notre équipe va vérifier', 'success')} />
        <Toast />
      </div>
    )
  }

  /* ───────────────────────── DESKTOP ───────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar
        query={query} onQuery={setQuery} profile={profile} session={session} isAdmin={isAdmin}
        onAdd={openAdd} onAdmin={() => window.location.href = '/admin'}
        onSignOut={() => { signOut(); toast('Déconnecté', 'À bientôt !', 'info') }}
        onAuthClick={() => setAuthOpen(true)}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          places={filtered} categories={categories} activeFilter={filter} selectedId={selectedId}
          loading={loading} userLoc={userLoc}
          onFilter={setFilter} onSelect={selectPlace}
        />

        <KosherMap
          places={filtered} selectedId={selectedId} userLoc={userLoc} tileStyle={tileStyle}
          onTileChange={setTile} onSelect={setSelectedId} onLocate={locate}
        />

        {selected && (
          <DetailPanel
            place={selected} categories={categories} session={session} profile={profile}
            onClose={() => setSelectedId(null)} onEdit={openEdit} onShare={share}
            onAuthRequired={() => setAuthOpen(true)}
          />
        )}
      </div>

      {error && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--red)', color: '#fff', padding: '10px 20px',
          borderRadius: 8, fontSize: 13, zIndex: 9999,
        }}>
          Erreur Supabase : {error}
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSignIn={signIn} onSignUp={signUp} onSuccess={onAuthSuccess} />
      <AddModal open={addOpen} placeId={selectedId} initialData={initialData} profile={profile} session={session}
        onClose={() => setAddOpen(false)} onSuccess={() => toast('Suggestion envoyée !', 'Merci — notre équipe va vérifier', 'success')} />
      <Toast />
    </div>
  )
}
