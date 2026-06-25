'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Place, Category } from '@/types'
import { CAT_ICONS, DAYS, isOpenNow, formatDistance } from '@/lib/utils'
import PhotoLightbox from './PhotoLightbox'

const CAT_COLORS: Record<string, string> = {
  restaurant: '#1FA452', boucherie: '#E0363B', boucher: '#E0363B',
  epicerie: '#0A7CFF', patisserie: '#E88A00', traiteur: '#8B5CF6',
}

interface PlacePhoto { id: string; storage_path: string; is_primary: boolean }

interface Props {
  place: Place
  categories: Category[]
  session: any
  profile: any
  fullscreen?: boolean
  onClose: () => void
  onEdit: () => void
  onShare: () => void
  onAuthRequired: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export default function DetailPanel({ place: p, categories, session, profile, fullscreen, onClose, onEdit, onShare, onAuthRequired, onPrev, onNext, hasPrev, hasNext }: Props) {
  const [placePhotos, setPlacePhotos] = useState<PlacePhoto[]>([])
  const [activePhoto, setActivePhoto] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [confirmDeletePlace, setConfirmDeletePlace] = useState(false)
  const [deleteSent, setDeleteSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reviews, setReviews] = useState<any[]>(p._reviews || [])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const swipeStartX = useRef<number | null>(null)
  const swipeStartY = useRef<number | null>(null)
  const myReview = reviews.find(r => r.user_id === profile?.id)

  useEffect(() => {
    setPlacePhotos([])
    setActivePhoto(0)
    setConfirmDeletePlace(false)
    setDeleteSent(false)
    setLightboxOpen(false)
    setReviews(p._reviews || [])
    setShowReviewForm(false)
    setReviewRating(5)
    setReviewContent('')
    setReviewError('')
    loadPhotos()
  }, [p.id])

  async function loadPhotos() {
    const { data } = await supabase
      .from('photos')
      .select('id,storage_path,is_primary')
      .eq('place_id', p.id)
      .order('is_primary', { ascending: false })

    if (data && data.length > 0) {
      setPlacePhotos(data)
      return
    }

    // Fallback : lister les fichiers directement depuis le bucket Storage
    const { data: files } = await supabase.storage
      .from('photos')
      .list(`places/${p.id}`, { limit: 10, sortBy: { column: 'name', order: 'asc' } })

    if (files && files.length > 0) {
      const synth = files
        .filter(f => f.name.endsWith('.jpg') || f.name.endsWith('.png') || f.name.endsWith('.webp'))
        .map((f, i) => ({
          id: f.id || `${p.id}-${i}`,
          storage_path: `places/${p.id}/${f.name}`,
          is_primary: f.name === 'cover.jpg',
        }))
        .sort((a, b) => (a.is_primary ? -1 : 1) - (b.is_primary ? -1 : 1))
      setPlacePhotos(synth)
    }
  }

  function getUrl(path: string) {
    const { data } = supabase.storage.from('photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function requestDeletePhoto(photoId: string) {
    if (!session) { onAuthRequired(); return }
    setBusy(true)
    await supabase.from('deletion_requests').insert({
      target_type: 'photo', photo_id: photoId,
      user_id: profile?.id || null, reason: 'Demande suppression photo',
    })
    setBusy(false)
    await loadPhotos()
  }

  async function requestDeletePlace() {
    if (!session) { onAuthRequired(); return }
    setBusy(true)
    await supabase.from('deletion_requests').insert({
      target_type: 'place', place_id: p.id,
      user_id: profile?.id || null, reason: 'Demande de suppression de fiche',
    })
    setBusy(false)
    setConfirmDeletePlace(false)
    setDeleteSent(true)
  }

  async function submitReview() {
    if (!session || !profile) { onAuthRequired(); return }
    setReviewBusy(true); setReviewError('')
    try {
      const { data, error } = await supabase
        .from('reviews')
        .upsert(
          { place_id: p.id, user_id: profile.id, rating: reviewRating, content: reviewContent.trim() || null },
          { onConflict: 'place_id,user_id' }
        )
        .select('id,place_id,user_id,rating,content,created_at,profiles(display_name)')
        .single()
      if (error) throw error
      setReviews(prev => [data, ...prev.filter(r => r.user_id !== profile.id)])
      setShowReviewForm(false)
    } catch (e: any) {
      setReviewError(e.message || "Erreur lors de l'envoi")
    } finally {
      setReviewBusy(false)
    }
  }

  function openReviewForm() {
    if (!session) { onAuthRequired(); return }
    if (myReview) { setReviewRating(myReview.rating); setReviewContent(myReview.content || '') }
    setShowReviewForm(true)
  }

  function onTouchStart(e: React.TouchEvent) {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (swipeStartX.current == null || swipeStartY.current == null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = e.changedTouches[0].clientY - swipeStartY.current
    swipeStartX.current = null; swipeStartY.current = null
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0 && hasNext) onNext?.()
    if (dx > 0 && hasPrev) onPrev?.()
  }

  const hasCert     = p._certifications.some(c => c.is_active)
  const activeCerts = p._certifications.filter(c => c.is_active)
  const cat         = p._cats[0] || ''
  const catLabel    = categories.find(c => c.slug === cat)?.name || cat
  const catColor    = CAT_COLORS[cat] || '#6b7280'
  const openStatus  = isOpenNow(p._hours)
  const today       = new Date().getDay()
  const todayH      = p._hours.find(h => h.day_of_week === today)
  const rating      = Number(p.avg_rating || 0).toFixed(1)
  const mapsUrl     = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([p.address, p.city].filter(Boolean).join(', '))}`

  return (
    <aside
      className="slide-in"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        width: fullscreen ? '100%' : 340,
        height: fullscreen ? '100%' : 'auto',
        background: '#fff',
        borderLeft: fullscreen ? 'none' : '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
      }}>

      {/* Zone scrollable unique */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* ── HERO PHOTO ── */}
        <div style={{ height: fullscreen ? 260 : 200, background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
          {placePhotos.length > 0 ? (
            <>
              <img
                src={getUrl(placePhotos[activePhoto].storage_path)}
                alt=""
                onClick={() => setLightboxOpen(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
              />
              {/* Dégradé bas pour lisibilité */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.1) 0%, transparent 40%, rgba(0,0,0,.5) 100%)' }} />

              {/* Navigation photos */}
              {placePhotos.length > 1 && (
                <>
                  {activePhoto > 0 && (
                    <button onClick={e => { e.stopPropagation(); setActivePhoto(i => i - 1); setLightboxOpen(true) }} style={navBtnStyle('left')}>
                      <i className="ti ti-chevron-left" />
                    </button>
                  )}
                  {activePhoto < placePhotos.length - 1 && (
                    <button onClick={e => { e.stopPropagation(); setActivePhoto(i => i + 1); setLightboxOpen(true) }} style={navBtnStyle('right')}>
                      <i className="ti ti-chevron-right" />
                    </button>
                  )}
                  <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                    {placePhotos.map((_, i) => (
                      <div key={i} onClick={() => setActivePhoto(i)} style={{
                        width: i === activePhoto ? 18 : 6, height: 5, borderRadius: 3,
                        background: i === activePhoto ? '#fff' : 'rgba(255,255,255,.5)',
                        cursor: 'pointer', transition: 'all .2s',
                      }} />
                    ))}
                  </div>
                  <button onClick={() => requestDeletePhoto(placePhotos[activePhoto].id)} style={{
                    position: 'absolute', top: 10, left: 10, width: 30, height: 30,
                    background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(8px)',
                    border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 13,
                  }}>
                    <i className="ti ti-trash" />
                  </button>
                </>
              )}

              {/* Compteur photos */}
              {placePhotos.length > 1 && (
                <div style={{ position: 'absolute', top: 10, right: 46, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(6px)', borderRadius: 12, padding: '3px 9px', fontSize: 11, fontWeight: 600, color: '#fff' }}>
                  {activePhoto + 1}/{placePhotos.length}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${catColor}15, ${catColor}08)` }}>
                <span style={{ fontSize: 56, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.1))' }}>{CAT_ICONS[cat] || '📍'}</span>
              </div>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,.2) 100%)' }} />
            </>
          )}

          {/* Bouton fermer */}
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, width: 32, height: 32,
            background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(10px)',
            border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', fontSize: 16,
          }}>
            <i className="ti ti-x" />
          </button>

          {/* Certification badge */}
          {hasCert && (
            <div style={{
              position: 'absolute', bottom: 12, left: 12,
              background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(8px)',
              borderRadius: 20, padding: '5px 10px',
              fontSize: 11, fontWeight: 700, color: '#1FA452',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <i className="ti ti-shield-check" style={{ fontSize: 13 }} />
              {activeCerts[0]?.certification_authorities?.name || 'Certifié'}
            </div>
          )}

          {/* Navigation fiches prev/next */}
          {fullscreen && hasPrev && (
            <button onClick={onPrev} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', ...ghostBtnStyle }}>
              <i className="ti ti-chevron-left" />
            </button>
          )}
          {fullscreen && hasNext && (
            <button onClick={onNext} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', ...ghostBtnStyle }}>
              <i className="ti ti-chevron-right" />
            </button>
          )}
        </div>

        {/* ── CORPS ── */}
        <div style={{ padding: '16px 16px 0' }}>

          {/* Titre + catégorie + note */}
          <div style={{ marginBottom: 12 }}>
            <h1 style={{ fontSize: fullscreen ? 22 : 18, fontWeight: 800, letterSpacing: '-.5px', lineHeight: 1.15, color: 'var(--text)', margin: 0, marginBottom: 8 }}>
              {p.name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {catLabel && (
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  background: `${catColor}14`, color: catColor, border: `1px solid ${catColor}30`,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span>{CAT_ICONS[cat] || '📍'}</span>{catLabel}
                </span>
              )}

              {p.avg_rating != null && Number(p.avg_rating) > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                  {Array.from({ length: 5 }, (_, j) => (
                    <span key={j} style={{ fontSize: 14, color: j < Math.round(Number(p.avg_rating)) ? '#F59E0B' : 'rgba(0,0,0,.12)' }}>★</span>
                  ))}
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginLeft: 2 }}>{rating}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>({p.review_count || 0})</span>
                </span>
              )}

              {openStatus !== 'unknown' && (
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: openStatus === 'open' ? '#1FA452' : '#E0363B',
                  background: openStatus === 'open' ? '#1FA45212' : '#E0363B12',
                  padding: '3px 9px', borderRadius: 12,
                }}>
                  {openStatus === 'open' ? '● Ouvert' : '● Fermé'}
                  {openStatus === 'open' && todayH?.close_time && ` · ferme ${todayH.close_time}`}
                </span>
              )}

              {p._distanceKm != null && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0A7CFF', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="ti ti-walk" style={{ fontSize: 13 }} />
                  {formatDistance(p._distanceKm)}
                </span>
              )}
            </div>
          </div>

          {/* ── ACTIONS RAPIDES ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            <ActionBtn icon="ti-navigation" label="Itinéraire" color="#0A7CFF" onClick={() => window.open(mapsUrl, '_blank')} />
            <ActionBtn icon="ti-share" label="Partager" color="#1FA452" onClick={onShare} />
            <ActionBtn icon="ti-edit" label="Modifier" color="#B8860B" onClick={onEdit} />
          </div>

          {/* ── INFOS ── */}
          <Section title="Informations">
            {[p.address, p.city, p.country !== 'FR' ? p.country : null].filter(Boolean).join(', ') && (
              <InfoRow icon="ti-map-pin" iconColor="#E0363B">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text2)', textDecoration: 'none' }}>
                  {[p.address, p.city].filter(Boolean).join(', ')}
                </a>
              </InfoRow>
            )}
            {p.phone && (
              <InfoRow icon="ti-phone" iconColor="#1FA452">
                <a href={`tel:${p.phone}`} style={{ color: 'var(--text2)', textDecoration: 'none' }}>{p.phone}</a>
              </InfoRow>
            )}
            {p.website && (
              <InfoRow icon="ti-world" iconColor="#0A7CFF">
                <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ color: '#0A7CFF', textDecoration: 'none' }}>
                  {p.website.replace(/https?:\/\//, '')}
                </a>
              </InfoRow>
            )}
            {p.description && (
              <InfoRow icon="ti-info-circle" iconColor="#8B5CF6">
                <span style={{ lineHeight: 1.55, color: 'var(--text2)' }}>{p.description}</span>
              </InfoRow>
            )}
          </Section>

          {/* ── CERTIFICATIONS ── */}
          {activeCerts.length > 0 && (
            <Section title="Certifications">
              {activeCerts.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                  background: '#1FA45208', border: '1px solid #1FA45225',
                  borderRadius: 12, marginBottom: 8,
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1FA45215', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-shield-check" style={{ fontSize: 18, color: '#1FA452' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{c.certification_authorities?.name || '–'}</div>
                    {c.cert_type && <div style={{ fontSize: 11.5, color: '#1FA452', marginTop: 1 }}>{c.cert_type}</div>}
                  </div>
                  {c.valid_until && <span style={{ fontSize: 11, fontWeight: 700, color: '#1FA452', background: '#1FA45215', padding: '3px 8px', borderRadius: 8 }}>Valide</span>}
                </div>
              ))}
            </Section>
          )}

          {/* ── HORAIRES ── */}
          <Section title="Horaires">
            <div style={{ background: 'var(--bg)', borderRadius: 12, overflow: 'hidden' }}>
              {DAYS.map((d, i) => {
                const slots = p._hours.filter(x => x.day_of_week === i && !x.is_closed && x.open_time)
                const isClosed = p._hours.some(x => x.day_of_week === i && x.is_closed) || slots.length === 0
                const isToday = i === today
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: '9px 14px',
                    background: isToday ? '#B8860B08' : 'transparent',
                    borderBottom: i < 6 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? '#B8860B' : 'var(--text2)', width: 88, flexShrink: 0 }}>{d}</span>
                    {isClosed ? (
                      <span style={{ fontSize: 12.5, color: 'var(--text3)', fontStyle: 'italic', flex: 1 }}>Fermé</span>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {slots.map((s, si) => (
                          <span key={si} style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? '#B8860B' : 'var(--text2)' }}>
                            {s.open_time} – {s.close_time}
                          </span>
                        ))}
                      </div>
                    )}
                    {isToday && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: openStatus === 'open' ? '#1FA452' : '#E0363B', marginLeft: 8, flexShrink: 0 }}>
                        {openStatus === 'open' ? '● Ouvert' : openStatus === 'closed' ? '● Fermé' : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>

          {/* ── AVIS ── */}
          <Section title={`Avis clients${reviews.length > 0 ? ` · ${reviews.length}` : ''}`}>
            {!showReviewForm && (
              <button onClick={openReviewForm} style={{
                width: '100%', height: 42, marginBottom: 12, borderRadius: 10,
                border: '1.5px solid var(--border)', background: '#fff',
                color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                fontFamily: 'var(--font)',
              }}>
                <i className={`ti ${myReview ? 'ti-edit' : 'ti-star'}`} style={{ fontSize: 16 }} />
                {myReview ? 'Modifier mon avis' : 'Laisser un avis'}
              </button>
            )}

            {showReviewForm && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                {reviewError && <div style={{ fontSize: 12, color: '#E0363B', marginBottom: 8, fontWeight: 600 }}>{reviewError}</div>}
                <div style={{ display: 'flex', gap: 4, marginBottom: 12, justifyContent: 'center' }}>
                  {Array.from({ length: 5 }, (_, j) => (
                    <button key={j} type="button" onClick={() => setReviewRating(j + 1)} style={{
                      width: 44, height: 44, border: 'none', background: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0, WebkitTapHighlightColor: 'transparent',
                    }}>
                      <span style={{ fontSize: 32, color: j < reviewRating ? '#F59E0B' : 'rgba(0,0,0,.15)', pointerEvents: 'none', lineHeight: 1 }}>★</span>
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewContent}
                  onChange={e => setReviewContent(e.target.value)}
                  placeholder="Décrivez votre expérience…"
                  style={{
                    width: '100%', height: 72, resize: 'none', padding: '10px 12px',
                    border: '1px solid var(--border)', borderRadius: 8, fontSize: 13,
                    fontFamily: 'var(--font)', outline: 'none', marginBottom: 10, background: '#fff',
                    lineHeight: 1.5,
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowReviewForm(false)} style={{ flex: '0 0 auto', height: 38, padding: '0 16px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Annuler</button>
                  <button onClick={submitReview} disabled={reviewBusy} style={{ flex: 1, height: 38, borderRadius: 8, border: 'none', background: '#B8860B', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    {reviewBusy ? 'Envoi…' : 'Publier'}
                  </button>
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>
                <i className="ti ti-star" style={{ fontSize: 28, display: 'block', marginBottom: 6, opacity: .3 }} />
                Soyez le premier à laisser un avis
              </div>
            ) : reviews.slice(0, 8).map((r, i) => (
              <div key={r.id || i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#B8860B20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#B8860B' }}>
                      {(r.profiles?.display_name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
                        {r.profiles?.display_name || 'Anonyme'}
                        {r.user_id === profile?.id && <span style={{ color: '#B8860B', fontWeight: 500 }}> (vous)</span>}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 1 }}>
                        {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {Array.from({ length: 5 }, (_, j) => (
                      <span key={j} style={{ fontSize: 13, color: j < r.rating ? '#F59E0B' : 'rgba(0,0,0,.1)' }}>★</span>
                    ))}
                  </div>
                </div>
                {r.content && <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55, marginTop: 4 }}>{r.content}</div>}
              </div>
            ))}
          </Section>

          {/* ── SIGNALER ── */}
          <Section title="Signaler">
            {deleteSent ? (
              <div style={{ fontSize: 12.5, color: '#1FA452', background: '#1FA45210', border: '1px solid #1FA45225', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-circle-check" /> Demande envoyée — un admin va vérifier.
              </div>
            ) : confirmDeletePlace ? (
              <div style={{ background: '#E0363B08', border: '1px solid #E0363B25', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.4 }}>Confirmer la demande de suppression ? Un admin devra la valider.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDeletePlace(false)} style={{ flex: 1, height: 34, borderRadius: 7, border: '1px solid var(--border)', background: '#fff', color: 'var(--text2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                  <button onClick={requestDeletePlace} disabled={busy} style={{ flex: 1, height: 34, borderRadius: 7, border: 'none', background: '#E0363B', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Confirmer</button>
                </div>
              </div>
            ) : (
              <button onClick={() => session ? setConfirmDeletePlace(true) : onAuthRequired()} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#E0363B', padding: 0, fontFamily: 'var(--font)' }}>
                <i className="ti ti-flag" /> Demander la suppression de cette fiche
              </button>
            )}
          </Section>

          <div style={{ height: 16 }} />
        </div>
      </div>
      {lightboxOpen && placePhotos.length > 0 && (
        <PhotoLightbox
          photos={placePhotos.map(ph => getUrl(ph.storage_path))}
          currentIndex={activePhoto}
          onIndexChange={i => { setActivePhoto(i) }}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </aside>
  )
}

/* ── Shared helpers ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ icon, iconColor, children }: { icon: string; iconColor?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.03)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${iconColor || '#6b7280'}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: iconColor || 'var(--text3)' }} />
      </div>
      <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, paddingTop: 6, flex: 1 }}>{children}</span>
    </div>
  )
}

function ActionBtn({ icon, label, color, onClick }: { icon: string; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      height: 58, borderRadius: 12, border: 'none',
      background: `${color}10`, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      fontFamily: 'var(--font)', transition: 'all .15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = `${color}20`}
      onMouseLeave={e => e.currentTarget.style.background = `${color}10`}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 20, color }} />
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
    </button>
  )
}

const navBtnStyle = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute',
  [side]: 10,
  top: '50%', transform: 'translateY(-50%)',
  width: 34, height: 34,
  background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)',
  border: 'none', borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#fff', fontSize: 17,
})

const ghostBtnStyle: React.CSSProperties = {
  width: 34, height: 34,
  background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)',
  border: 'none', borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#fff', fontSize: 17,
}

const miniBtn: React.CSSProperties = {
  flex: 1, height: 32, borderRadius: 7, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', border: 'none', fontFamily: 'var(--font)',
}
