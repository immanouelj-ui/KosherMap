import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koshermap.fr'

interface Props { params: Promise<{ slug: string }> }

async function getPlace(slug: string) {
  const { data } = await supabaseServer
    .from('places')
    .select(`
      id, name, slug, address, city, country, phone, website, description,
      avg_rating, review_count,
      place_categories(categories(name, slug)),
      certifications(cert_type, is_active, certification_authorities(name)),
      opening_hours(day_of_week, open_time, close_time, is_closed, slot),
      photos(storage_path, is_primary)
    `)
    .eq('slug', slug)
    .eq('is_deleted', false)
    .single()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = await getPlace(slug)
  if (!p) return {}

  const cat = (p as any).place_categories?.[0]?.categories?.name || 'Établissement casher'
  const cert = (p as any).certifications?.find((c: any) => c.is_active)?.certification_authorities?.name
  const location = [p.address, p.city].filter(Boolean).join(', ')
  const title = `${p.name} — ${cat} casher${p.city ? ` à ${p.city}` : ''}`
  const description = p.description
    || `${p.name} est un ${cat.toLowerCase()} casher${location ? ` situé ${location}` : ''}${cert ? `, certifié ${cert}` : ''}. Retrouvez les horaires, le contact et les informations sur KosherMap.`

  const coverPhoto = (p as any).photos?.find((ph: any) => ph.is_primary)?.storage_path
  const imageUrl = coverPhoto
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${coverPhoto}`
    : undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE}/place/${slug}`,
      siteName: 'KosherMap',
      locale: 'fr_FR',
      type: 'website',
      ...(imageUrl ? { images: [{ url: imageUrl, width: 1200, height: 630, alt: p.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    alternates: { canonical: `${BASE}/place/${slug}` },
  }
}

export async function generateStaticParams() {
  const { data } = await supabaseServer
    .from('places')
    .select('slug')
    .eq('is_deleted', false)
    .not('slug', 'is', null)
  return (data || []).map(p => ({ slug: p.slug }))
}

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default async function PlacePage({ params }: Props) {
  const { slug } = await params
  const p = await getPlace(slug)
  if (!p) notFound()

  const cats = (p as any).place_categories?.map((pc: any) => pc.categories?.name).filter(Boolean) || []
  const activeCerts = (p as any).certifications?.filter((c: any) => c.is_active) || []
  const hours = (p as any).opening_hours || []
  const photos = (p as any).photos || []
  const coverPhoto = photos.find((ph: any) => ph.is_primary) || photos[0]
  const imageUrl = coverPhoto
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${coverPhoto.storage_path}`
    : null

  // Schema.org JSON-LD
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': cats.includes('Restaurant') ? 'Restaurant' : 'LocalBusiness',
    name: p.name,
    description: p.description || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: p.address || undefined,
      addressLocality: p.city || undefined,
      addressCountry: p.country || 'FR',
    },
    telephone: p.phone || undefined,
    url: p.website || `${BASE}/place/${slug}`,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(p.avg_rating && Number(p.avg_rating) > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(p.avg_rating).toFixed(1),
        reviewCount: p.review_count || 1,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    openingHoursSpecification: hours
      .filter((h: any) => !h.is_closed && h.open_time)
      .map((h: any) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${DAYS[h.day_of_week]}`,
        opens: h.open_time,
        closes: h.close_time,
      })),
  }

  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent([p.name, p.address, p.city].filter(Boolean).join(' '))}`

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div style={{ minHeight: '100vh', background: '#f8f7f5', fontFamily: 'var(--font, system-ui)' }}>
        {/* Header */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#B8860B', letterSpacing: '-1px' }}>Kosher<span style={{ color: '#1FA452' }}>Map</span></span>
          </a>
          <div style={{ flex: 1 }} />
          <a href="/" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
            ← Voir la carte
          </a>
        </header>

        <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
          {/* Photo */}
          {imageUrl && (
            <div style={{ height: 260, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
              <img src={imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* Titre */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px', marginBottom: 16, border: '1px solid #e5e7eb' }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111', margin: '0 0 10px', letterSpacing: '-0.5px' }}>{p.name}</h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {cats.map((cat: string) => (
                <span key={cat} style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#1FA45214', color: '#1FA452', border: '1px solid #1FA45230' }}>
                  {cat}
                </span>
              ))}
              {activeCerts.map((c: any, i: number) => (
                <span key={i} style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#B8860B12', color: '#B8860B', border: '1px solid #B8860B30', display: 'flex', alignItems: 'center', gap: 5 }}>
                  ✓ {c.certification_authorities?.name}
                  {c.cert_type ? ` · ${c.cert_type}` : ''}
                </span>
              ))}
            </div>

            {p.description && (
              <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, margin: '0 0 16px' }}>{p.description}</p>
            )}

            {/* Infos contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(p.address || p.city) && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#374151', fontSize: 14 }}>
                  <span style={{ fontSize: 18 }}>📍</span>
                  {[p.address, p.city].filter(Boolean).join(', ')}
                </a>
              )}
              {p.phone && (
                <a href={`tel:${p.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#374151', fontSize: 14 }}>
                  <span style={{ fontSize: 18 }}>📞</span>{p.phone}
                </a>
              )}
              {p.website && (
                <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#0A7CFF', fontSize: 14 }}>
                  <span style={{ fontSize: 18 }}>🌐</span>{p.website.replace(/https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>

          {/* Horaires */}
          {hours.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 16, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#111' }}>Horaires d'ouverture</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {DAYS.map((day, i) => {
                  const slots = hours.filter((h: any) => h.day_of_week === i && !h.is_closed && h.open_time)
                  const isClosed = hours.some((h: any) => h.day_of_week === i && h.is_closed) || slots.length === 0
                  const isToday = new Date().getDay() === i
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: i < 6 ? '1px solid #f3f4f6' : 'none' }}>
                      <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? '#B8860B' : '#374151', width: 96 }}>{day}</span>
                      {isClosed ? (
                        <span style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>Fermé</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                          {slots.map((s: any, si: number) => (
                            <span key={si} style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? '#B8860B' : '#374151' }}>
                              {s.open_time} – {s.close_time}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* CTA */}
          <a href={`/?place=${p.id}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#B8860B', color: '#fff', borderRadius: 12, height: 50,
            fontSize: 15, fontWeight: 700, textDecoration: 'none',
          }}>
            🗺️ Voir sur KosherMap
          </a>
        </main>
      </div>
    </>
  )
}
