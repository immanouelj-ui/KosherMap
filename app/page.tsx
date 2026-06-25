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
import { isOpenNow }       from '@/lib/utils'
import type { Place }      from '@/types'
import type { TileStyle }  from './components/Map'

const KosherMap = dynamic(() => import('./components/Map'), { ssr: false })

export default function Home() {
  const { places, categories, loading, error, computeDistances } = usePlaces()
  const { session, profile, isAdmin, signIn, signUp, signOut }   = useAuth()
  const { isMobile, ready } = useIsMobile()

  const [query, setQuery]               = useState('')
  const [filter, setFilter]             = useState('all')
  const [filterOpenNow, setFilterOpenNow] = useState(false)
  const [filterCertType, setFilterCertType] = useState<string | null>(null) // 'lait' | 'viande'
  const [filterCertAuth, setFilterCertAuth] = useState<string | null>(null)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [userLoc, setUserLoc]           = useState<{ lat: number; lng: number } | null>(null)
  const [tileStyle, setTile]            = useState<TileStyle>('plan')
  const [authOpen, setAuthOpen]         = useState(false)
  const [addOpen, setAddOpen]           = useState(false)
  const [pending, setPending]           = useState<'add' | 'edit' | null>(null)
  const [sheetSnap, setSheetSnap]       = useState(1)

  // Liste dédupliquée des autorités de certification pour les filtres
  const certAuthorities = useMemo(() => {
    const seen = new Set<string>()
    places.forEach(p => p._certifications.forEach(c => {
      const name = c.certification_authorities?.name
      if (c.is_active && name) seen.add(name)
    }))
    return Array.from(seen).sort()
  }, [places])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    let list = places.filter(p => {
      const matchQ = !q
        || p.name?.toLowerCase().includes(q)
        || p.city?.toLowerCase().includes(q)
        || p.address?.toLowerCase().includes(q)
      const matchCat = filter === 'all' || p._cats.includes(filter)
      const matchOpen = !filterOpenNow || isOpenNow(p._hours) === 'open'
      const matchCertType = !filterCertType || p._certifications.some(c =>
        c.is_active && c.cert_type?.toLowerCase().includes(filterCertType)
      )
      const matchCertAuth = !filterCertAuth || p._certifications.some(c =>
        c.is_active && c.certification_authorities?.name === filterCertAuth
      )
      return matchQ && matchCat && matchOpen && matchCertType && matchCertAuth
    })
    if (userLoc) {
      list = [...list].sort((a, b) => (a._distanceKm ?? Infinity) - (b._distanceKm ?? Infinity))
    }
    return list
  }, [places, query, filter, filterOpenNow, filterCertType, filterCertAuth, userLoc])

  const selected = useMemo<Place | null>(
    () => places.find(p => p.id === selectedId) ?? null,
    [places, selectedId]
  )

  // Index du lieu sélectionné dans la liste actuellement affichée (filtrée/triée),
  // pour permettre de naviguer vers le précédent/suivant depuis le détail.
  const selectedIndex = useMemo(
    () => selectedId ? filtered.findIndex(p => p.id === selectedId) : -1,
    [filtered, selectedId]
  )
  const hasPrev = selectedIndex > 0
  const hasNext = selectedIndex >= 0 && selectedIndex < filtered.length - 1

  function goPrev() {
    if (hasPrev) setSelectedId(filtered[selectedIndex - 1].id)
  }
  function goNext() {
    if (hasNext) setSelectedId(filtered[selectedIndex + 1].id)
  }

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

  /* Si la position GPS a été obtenue avant que les lieux finissent de charger
     (race condition fréquente sur mobile), on recalcule les distances dès
     que la liste de lieux se peuple, pour que le tri par proximité s'applique bien. */
  useEffect(() => {
    if (userLoc && places.length > 0) {
      computeDistances(userLoc.lat, userLoc.lng)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.length])

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
            <CategoryChipsMobile
              categories={categories} activeFilter={filter} onFilter={setFilter}
              filterOpenNow={filterOpenNow} onFilterOpenNow={setFilterOpenNow}
              filterCertType={filterCertType} onFilterCertType={setFilterCertType}
              filterCertAuth={filterCertAuth} onFilterCertAuth={setFilterCertAuth}
              certAuthorities={certAuthorities}
            />
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
          <BottomSheet key="detail" snapPoints={[6, 50, 92]} initial={sheetSnap} onSnapChange={i => { setSheetSnap(i); if (i === 0) closeDetail() }}>
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
              onPrev={goPrev}
              onNext={goNext}
              hasPrev={hasPrev}
              hasNext={hasNext}
            />
          </BottomSheet>
        ) : (
          <BottomSheet key="list" snapPoints={[14, 50, 92]} initial={sheetSnap} onSnapChange={setSheetSnap}>
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
          filterOpenNow={filterOpenNow} onFilterOpenNow={setFilterOpenNow}
          filterCertType={filterCertType} onFilterCertType={setFilterCertType}
          filterCertAuth={filterCertAuth} onFilterCertAuth={setFilterCertAuth}
          certAuthorities={certAuthorities}
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
            onPrev={goPrev} onNext={goNext} hasPrev={hasPrev} hasNext={hasNext}
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
