'use client'
import { useEffect, useRef } from 'react'

interface Props {
  lat: number | null
  lng: number | null
}

export default function MiniMap({ lat, lng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    import('leaflet').then(({ default: L }) => {
      if (!containerRef.current || mapRef.current) return
      const map = L.map(containerRef.current, {
        zoomControl: false, attributionControl: false, dragging: false,
        scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false,
      }).setView([lat ?? 48.8566, lng ?? 2.3522], lat ? 15 : 5)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)
      mapRef.current = map

      requestAnimationFrame(() => map.invalidateSize())

      if (lat && lng) {
        const icon = L.divIcon({
          html: `<div style="width:26px;height:26px;border-radius:50%;background:var(--gold);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:13px">📍</div>`,
          className: '', iconSize: [26, 26], iconAnchor: [13, 13],
        })
        markerRef.current = L.marker([lat, lng], { icon }).addTo(map)
      }
    })
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then(({ default: L }) => {
      if (!lat || !lng) {
        markerRef.current?.remove()
        markerRef.current = null
        return
      }
      mapRef.current.setView([lat, lng], 15, { animate: true })
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        const icon = L.divIcon({
          html: `<div style="width:26px;height:26px;border-radius:50%;background:var(--gold);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:13px">📍</div>`,
          className: '', iconSize: [26, 26], iconAnchor: [13, 13],
        })
        markerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current)
      }
    })
  }, [lat, lng])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
