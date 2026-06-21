import type { OpeningHour } from '@/types'

export const CAT_ICONS: Record<string, string> = {
  restaurant: '🍽', boucherie: '🥩', boucher: '🥩',
  traiteur: '🥘', epicerie: '🛒', boulangerie: '🥐',
  patisserie: '🍰', boutique: '🛍', hotel: '🏨',
  'maison-retraite': '🏠', synagogue: '🕍',
  'location-vaisselle': '🍴', mikve: '💧', librairie: '📚',
}

export const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export function parseWkbPoint(hex: string | null | undefined): { lat: number; lng: number } | null {
  if (!hex || typeof hex !== 'string' || hex.length < 18) return null
  try {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
    const dv = new DataView(bytes.buffer)
    const little = bytes[0] === 1
    const wkbType = dv.getUint32(1, little)
    const hasSrid = (wkbType & 0x20000000) !== 0
    const offset = hasSrid ? 9 : 5
    const x = dv.getFloat64(offset, little)
    const y = dv.getFloat64(offset + 8, little)
    if (!isFinite(x) || !isFinite(y)) return null
    if (Math.abs(y) > 90 || Math.abs(x) > 180) return null
    return { lat: y, lng: x }
  } catch { return null }
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

export function isOpenNow(hours: OpeningHour[]): 'open' | 'closed' | 'unknown' {
  if (!hours || hours.length === 0) return 'unknown'
  const today = new Date().getDay()
  const h = hours.find(x => x.day_of_week === today)
  if (!h) return 'unknown'
  if (h.is_closed) return 'closed'
  if (!h.open_time || !h.close_time) return 'unknown'
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = h.open_time.split(':').map(Number)
  const [ch, cm] = h.close_time.split(':').map(Number)
  return cur >= oh * 60 + om && cur < ch * 60 + cm ? 'open' : 'closed'
}
