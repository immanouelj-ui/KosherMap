export interface Category {
  id: string
  name: string
  slug: string
  icon: string
}

export interface Certification {
  id: string
  cert_type: string | null
  valid_until: string | null
  is_active: boolean
  certification_authorities: { name: string } | null
}

export interface OpeningHour {
  day_of_week: number
  open_time: string | null
  close_time: string | null
  is_closed: boolean
}

export interface Review {
  id: string
  place_id: string
  user_id: string
  rating: number
  content: string | null
  created_at: string
  profiles: { display_name: string | null } | null
}

export interface Place {
  id: string
  name: string
  slug: string
  address: string | null
  city: string | null
  country: string | null
  phone: string | null
  website: string | null
  description: string | null
  avg_rating: number | null
  review_count: number | null
  status: string
  location: string | null
  latitude: number | null
  longitude: number | null
  is_premium: boolean
  premium_until: string | null
  _cats: string[]
  _certifications: Certification[]
  _hours: OpeningHour[]
  _reviews: Review[]
  _photos: string[]
  _distanceKm?: number
}

export interface Profile {
  id: string
  display_name: string | null
  role: string | null
  auth_user_id: string
}
