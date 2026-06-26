'use client'
import { useEffect, useRef, useState } from 'react'
import type { Place } from '@/types'
import { CAT_ICONS } from '@/lib/utils'

// Couleurs par catégorie — palette distinctive pour identifier visuellement
const CAT_COLORS: Record<string, string> = {
  restaurant:  '#1FA452', // vert
  boucherie:   '#E0363B', // rouge
  boucher:     '#E0363B',
  epicerie:    '#0A7CFF', // bleu
  patisserie:  '#E88A00', // orange
  traiteur:    '#8B5CF6', // violet
}

function pinHtml(emoji: string, color: string, size: number, selected: boolean): string {
  const s = size
  const shadow = selected
    ? `0 4px 18px ${color}66, 0 0 0 4px ${color}33`
    : `0 3px 10px rgba(0,0,0,.22)`
  const scale = selected ? `transform:scale(1.18);` : ''
  return `
    <div style="position:relative;width:${s}px;height:${s + s * 0.4}px;${scale}">
      <div style="
        position:absolute;top:0;left:0;width:${s}px;height:${s}px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${color};
        box-shadow:${shadow};
        border:2.5px solid #fff;
      "></div>
      <div style="
        position:absolute;top:${s * 0.12}px;left:${s * 0.12}px;
        width:${s * 0.76}px;height:${s * 0.76}px;
        border-radius:50%;
        background:#fff;
        display:flex;align-items:center;justify-content:center;
        font-size:${s * 0.38}px;
        transform:rotate(45deg);
      ">${emoji}</div>
    </div>
  `
}

const TILES = {
  plan:      { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',      attr: '© OpenStreetMap © CARTO' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '© Esri' },
  sombre:    { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',       attr: '© OpenStreetMap © CARTO' },
}

export type TileStyle = keyof typeof TILES

interface Props {
  places: Place[]
  selectedId: string | null
  userLoc: { lat: number; lng: number } | null
  tileStyle: TileStyle
  isMobile?: boolean
  onTileChange: (s: TileStyle) => void
  onSelect: (id: string) => void
  onLocate: () => void
}

export default function KosherMap({ places, selectedId, userLoc, tileStyle, isMobile, onTileChange, onSelect, onLocate }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const mapRef         = useRef<any>(null)
  const tileLayerRef   = useRef<any>(null)
  const markersRef     = useRef<globalThis.Map<string, any>>(new globalThis.Map())
  const clusterRef     = useRef<any>(null)
  const userMarkerRef  = useRef<any>(null)
  const fittedRef      = useRef(false)
  const [layersOpen, setLayersOpen] = useState(false)

  /* ────────────────────────────────────
     Init carte (une seule fois)
     Le secret anti-tuiles fractionnées :
     - width/height 100% sur le div
     - invalidateSize() après le rendu React
     - ResizeObserver pour le panneau latéral
  ──────────────────────────────────── */
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    // Attendre que le container ait de vraies dimensions avant d'init Leaflet
    function init() {
      if (mapRef.current || !containerRef.current) return
      const { offsetWidth, offsetHeight } = containerRef.current
      if (offsetWidth === 0 || offsetHeight === 0) {
        // Container pas encore visible — réessayer via IntersectionObserver
        const io = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting) { io.disconnect(); init() }
        })
        io.observe(containerRef.current)
        return
      }
      doInit()
    }

    async function doInit() {
      const { default: L } = await import('leaflet')
      try { await import('leaflet.markercluster') } catch {}
      if (mapRef.current || !containerRef.current) return

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
      }).setView([48.8566, 2.3522], 6)

      const tile = L.tileLayer(TILES.plan.url, {
        attribution: TILES.plan.attr,
        maxZoom: 19,
      }).addTo(map)

      tileLayerRef.current = tile
      mapRef.current = map

      // Groupe de clustering avec design amélioré
      const cluster = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        disableClusteringAtZoom: 16,
        iconCreateFunction: (c: any) => {
          const count = c.getChildCount()
          const size = count < 10 ? 36 : count < 50 ? 44 : 52
          // Couleur dominante selon les catégories dans le cluster
          const markers = c.getAllChildMarkers()
          const cats = markers.map((m: any) => m.options.catSlug || '')
          const catCount: Record<string, number> = {}
          cats.forEach((cat: string) => { catCount[cat] = (catCount[cat] || 0) + 1 })
          const dominant = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
          const color = CAT_COLORS[dominant] || '#B8860B'
          return L.divIcon({
            html: `<div class="km-cluster" style="width:${size}px;height:${size}px;background:${color};box-shadow:0 3px 10px ${color}55">${count}</div>`,
            className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
          })
        },
      })
      cluster.addTo(map)
      clusterRef.current = cluster

      requestAnimationFrame(() => map.invalidateSize())
      setTimeout(() => map.invalidateSize(), 300)
      setTimeout(() => map.invalidateSize(), 1000)

      // Ré-invalider à chaque redimensionnement du conteneur
      const ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(containerRef.current!)
      ;(map as any)._ro = ro

      // Ré-invalider quand la fenêtre finit de charger (polyfill pour slow connections)
      window.addEventListener('load', () => map.invalidateSize(), { once: true })
      setTimeout(() => map.invalidateSize(), 3000)
    } // fin doInit

    init()

    return () => {
      if (mapRef.current) {
        ;(mapRef.current as any)._ro?.disconnect()
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current.clear()
        clusterRef.current = null
      }
    }
  }, [])

  /* Changement de fond de carte */
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then(({ default: L }) => {
      if (tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current)
      }
      const cfg = TILES[tileStyle]
      tileLayerRef.current = L.tileLayer(cfg.url, {
        attribution: cfg.attr, maxZoom: 19,
      }).addTo(mapRef.current)
    })
  }, [tileStyle])

  /* Marqueur de position utilisateur */
  useEffect(() => {
    if (!mapRef.current || !userLoc) return
    import('leaflet').then(({ default: L }) => {
      const icon = L.divIcon({
        html: `<div style="position:relative;width:14px;height:14px"><div class="user-pulse"></div><div class="user-dot"></div></div>`,
        className: '', iconSize: [14, 14], iconAnchor: [7, 7],
      })
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLoc.lat, userLoc.lng])
      } else {
        userMarkerRef.current = L.marker([userLoc.lat, userLoc.lng], {
          icon, zIndexOffset: 2000, interactive: false,
        }).addTo(mapRef.current)
      }
      mapRef.current.flyTo([userLoc.lat, userLoc.lng], 13, { duration: 1 })
    })
  }, [userLoc])

  /* Marqueurs des lieux */
  useEffect(() => {
    if (!mapRef.current || !clusterRef.current) return
    import('leaflet').then(({ default: L }) => {
      const visibleIds = new Set(places.map(p => p.id))

      // Supprimer les marqueurs qui ne sont plus visibles
      markersRef.current.forEach((marker, id) => {
        if (!visibleIds.has(id)) {
          clusterRef.current.removeLayer(marker)
          markersRef.current.delete(id)
        }
      })

      // Ajouter / mettre à jour
      places.forEach(p => {
        if (p.latitude == null || p.longitude == null) return
        const isSel   = p.id === selectedId
        const cat     = p._cats[0] || ''
        const hasCert = p._certifications.some(c => c.is_active)
        const emoji   = CAT_ICONS[cat] || '📍'
        const color   = isSel ? '#B8860B' : (hasCert ? (CAT_COLORS[cat] || '#1FA452') : '#9CA3AF')
        const size    = isSel ? 40 : 34

        const icon = L.divIcon({
          html: pinHtml(emoji, color, size, isSel),
          className: '',
          iconSize:   [size, size * 1.4],
          iconAnchor: [size / 2, size * 1.4],
        })

        if (markersRef.current.has(p.id)) {
          const m = markersRef.current.get(p.id)
          m.setIcon(icon)
          m.setZIndexOffset(isSel ? 1000 : 0)
        } else {
          const m = L.marker([p.latitude!, p.longitude!], { icon, catSlug: cat } as any)
          m.on('click', () => onSelect(p.id))
          clusterRef.current.addLayer(m)
          markersRef.current.set(p.id, m)
        }
      })
    })
  }, [places, selectedId, onSelect])

  /* Fly to selected — révèle le marqueur même s'il est actuellement regroupé dans un cluster */
  useEffect(() => {
    if (!mapRef.current || !selectedId || !clusterRef.current) return
    const marker = markersRef.current.get(selectedId)
    const p = places.find(x => x.id === selectedId)
    if (!p?.latitude || !p?.longitude) return

    if (marker && clusterRef.current.hasLayer(marker)) {
      clusterRef.current.zoomToShowLayer(marker, () => {
        mapRef.current.flyTo([p.latitude, p.longitude], Math.max(mapRef.current.getZoom?.() ?? 6, 15), { duration: 0.4 })
      })
    } else {
      mapRef.current.flyTo([p.latitude, p.longitude], Math.max(mapRef.current.getZoom?.() ?? 6, 15), { duration: 0.5 })
    }
  }, [selectedId, places])

  /* Fit bounds initial */
  useEffect(() => {
    if (!mapRef.current || fittedRef.current || places.length === 0 || userLoc) return
    import('leaflet').then(({ default: L }) => {
      const valid = places.filter(p => p.latitude != null && p.longitude != null)
      if (!valid.length) return
      const bounds = L.latLngBounds(valid.map(p => [p.latitude!, p.longitude!]))
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
      fittedRef.current = true
    })
  }, [places, userLoc])

  return (
    <div style={{ flex: 1, minHeight: 0, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
      {/* Conteneur Leaflet — doit avoir une taille explicite */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Sélecteur de fond — masqué sur mobile (espace pris par la search bar) */}
      {!isMobile && (
        <div style={{
          position: 'absolute', top: 14, left: 14, zIndex: 500,
          background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--border)', borderRadius: 24,
          padding: 4, display: 'flex', gap: 2,
          boxShadow: 'var(--shadow-sm)',
        }}>
          {(Object.keys(TILES) as TileStyle[]).map(s => (
            <button key={s} onClick={() => onTileChange(s)} style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
              background: tileStyle === s ? 'var(--gold)' : 'transparent',
              color: tileStyle === s ? '#fff' : 'var(--text3)',
              transition: 'all .15s',
            }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Légende — masquée sur mobile (peu de place, moins prioritaire) */}
      {!isMobile && (
        <div style={{
          position: 'absolute', top: 14, right: 14, zIndex: 500,
          background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--border)', borderRadius: 'var(--r)',
          padding: '10px 14px', boxShadow: 'var(--shadow-sm)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {[
            { color: 'var(--green)', label: 'Certifié' },
            { color: '#6b7280',      label: 'Non vérifié' },
            { color: 'var(--gold)',  label: 'Sélectionné' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--text2)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Contrôles zoom + localisation */}
      <div style={{
        position: 'absolute', right: 14,
        bottom: isMobile ? 'calc(14vh + 14px)' : 28,
        zIndex: 500,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {/* Bouton calques (mobile uniquement) avec menu déroulant */}
        {isMobile && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setLayersOpen(o => !o)} style={{
              width: 42, height: 42, border: '1px solid var(--border)',
              background: layersOpen ? 'var(--gold)' : 'rgba(255,255,255,.95)',
              backdropFilter: 'blur(12px)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: layersOpen ? '#fff' : 'var(--text2)', fontSize: 19,
              boxShadow: 'var(--shadow-md)', transition: 'all .15s',
            }}>
              <i className="ti ti-layers-intersect" />
            </button>

            {layersOpen && (
              <div style={{
                position: 'absolute', right: 50, top: 0,
                background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--border)', borderRadius: 14,
                padding: 5, display: 'flex', flexDirection: 'column', gap: 2,
                boxShadow: 'var(--shadow-md)', minWidth: 110,
              }}>
                {(Object.keys(TILES) as TileStyle[]).map(s => (
                  <button key={s} onClick={() => { onTileChange(s); setLayersOpen(false) }} style={{
                    padding: '9px 12px', borderRadius: 9, fontSize: 13, fontWeight: 500,
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left',
                    background: tileStyle === s ? 'var(--gold-bg)' : 'transparent',
                    color: tileStyle === s ? 'var(--gold)' : 'var(--text2)',
                  }}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {(isMobile
          ? [{ icon: 'ti-current-location', action: onLocate }]
          : [
              { icon: 'ti-plus',             action: () => mapRef.current?.zoomIn() },
              { icon: 'ti-minus',            action: () => mapRef.current?.zoomOut() },
              { icon: 'ti-current-location', action: onLocate },
            ]
        ).map(({ icon, action }) => (
          <button key={icon} onClick={action} style={{
            width: isMobile ? 42 : 36, height: isMobile ? 42 : 36, border: '1px solid var(--border)',
            background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(12px)',
            borderRadius: isMobile ? '50%' : 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text2)', fontSize: isMobile ? 19 : 17,
            boxShadow: 'var(--shadow-md)', transition: 'all .15s',
          }}>
            <i className={`ti ${icon}`} />
          </button>
        ))}
      </div>
    </div>
  )
}
