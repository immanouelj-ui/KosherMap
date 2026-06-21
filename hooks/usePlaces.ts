'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { parseWkbPoint, haversineKm } from '@/lib/utils'
import type { Place, Category } from '@/types'

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [{ data: cats, error: catErr }, { data: rawPlaces, error: placesErr }] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('places').select(`
          id,name,slug,address,city,country,phone,website,description,
          avg_rating,review_count,status,is_deleted,location,
          place_categories(category_id,categories(name,slug,icon)),
          certifications(id,cert_type,valid_until,is_active,certification_authorities(name)),
          opening_hours(day_of_week,open_time,close_time,is_closed),
          reviews(rating,content,created_at,profiles(display_name))
        `).eq('is_deleted', false).order('name')
      ])

      if (catErr) throw catErr
      if (placesErr) throw placesErr

      setCategories(cats || [])

      const mapped: Place[] = (rawPlaces || []).map((p: any) => {
        const coords = parseWkbPoint(p.location)
        return {
          ...p,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          _cats: p.place_categories?.map((pc: any) => pc.categories?.slug).filter(Boolean) || [],
          _certifications: p.certifications || [],
          _hours: p.opening_hours || [],
          _reviews: p.reviews || [],
          _photos: [],
        }
      })

      setPlaces(mapped)
    } catch (e: any) {
      console.error('usePlaces error:', JSON.stringify(e), e)
      setError(e.message || e.code || e.hint || JSON.stringify(e) || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const computeDistances = useCallback((userLat: number, userLng: number) => {
    setPlaces(prev => prev.map(p => ({
      ...p,
      _distanceKm: p.latitude != null && p.longitude != null
        ? haversineKm(userLat, userLng, p.latitude, p.longitude)
        : undefined
    })))
  }, [])

  return { places, categories, loading, error, computeDistances, reload: load }
}
