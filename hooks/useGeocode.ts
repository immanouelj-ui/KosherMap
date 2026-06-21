'use client'
import { useState, useEffect, useRef } from 'react'

type Status = 'idle' | 'loading' | 'found' | 'not_found' | 'error'

interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
}

/**
 * Géocode une adresse via Nominatim (OpenStreetMap), avec debounce 700ms.
 * Combine adresse + ville pour de meilleurs résultats.
 */
export function useGeocode(address: string, city: string) {
  const [result, setResult] = useState<GeocodeResult | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const query = [address, city].filter(Boolean).join(', ').trim()

    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    if (query.length < 5) {
      setResult(null)
      setStatus('idle')
      return
    }

    setStatus('loading')
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q=${encodeURIComponent(query)}`
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept-Language': 'fr' },
        })
        const data = await res.json()
        if (data?.[0]) {
          setResult({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name,
          })
          setStatus('found')
        } else {
          setResult(null)
          setStatus('not_found')
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setResult(null)
          setStatus('error')
        }
      }
    }, 700)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [address, city])

  return { result, status }
}
