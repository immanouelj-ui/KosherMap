'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Place, Category } from '@/types'
import { CAT_ICONS, DAYS, isOpenNow, formatDistance } from '@/lib/utils'

interface PlacePhoto {
  id: string
  storage_path: string
  is_primary: boolean
}

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
  const [confirmDeletePlace, setConfirmDeletePlace] = useState(false)
  const [deleteSent, setDeleteSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reviews, setReviews] = useState<any[]>(p._reviews || [])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const myReview = reviews.find(r => r.user_id === profile?.id)
  const swipeStartX = useRef<number | null>(null)
  const swipeStartY = useRef<number | null>(null)

  useEffect(() => {
    setPlacePhotos([])
    setActivePhoto(0)
    setConfirmDeletePlace(false)
    setDeleteSent(false)
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
      .order('created_at', { ascending: true })
    setPlacePhotos(data || [])
  }

  function getUrl(path: string) {
    const { data } = supabase.storage.from('photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function requestDeletePhoto(photoId: string) {
    if (!session) { onAuthRequired(); return }
    setBusy(true)
    await supabase.from('deletion_requests').insert({
      target_type: 'photo',
      photo_id: photoId,
      user_id: profile?.id || null,
      reason: 'Demande de suppression photo via fiche',
    })
    setBusy(false)
    await loadPhotos()
  }

  async function requestDeletePlace() {
    if (!session) { onAuthRequired(); return }
    setBusy(true)
    await supabase.from('deletion_requests').insert({
      target_type: 'place',
      place_id: p.id,
      user_id: profile?.id || null,
      reason: 'Demande de suppression de fiche',
    })
    setBusy(false)
    setConfirmDeletePlace(false)
    setDeleteSent(true)
  }

  async function submitReview() {
    if (!session || !profile) { onAuthRequired(); return }
    setReviewBusy(true)
    setReviewError('')
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
      setReviews(prev => {
        const others = prev.filter(r => r.user_id !== profile.id)
        return [data, ...others]
      })
      setShowReviewForm(false)
    } catch (e: any) {
      setReviewError(e.message || "Erreur lors de l'envoi de l'avis")
    } finally {
      setReviewBusy(false)
    }
  }

  function openReviewForm() {
    if (!session) { onAuthRequired(); return }
    if (myReview) {
      setReviewRating(myReview.rating)
      setReviewContent(myReview.content || '')
    }
    setShowReviewForm(true)
  }

  /* Navigation entre fiches par swipe horizontal (geste type "carrousel mobile").
     On ignore le geste si le mouvement est surtout vertical (= l'utilisateur scrolle le contenu). */
  function onTouchStart(e: React.TouchEvent) {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (swipeStartX.current == null || swipeStartY.current == null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = e.changedTouches[0].clientY - swipeStartY.current
    swipeStartX.current = null
    swipeStartY.current = null
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return // pas assez horizontal
    if (dx < 0 && hasNext) onNext?.()
    if (dx > 0 && hasPrev) onPrev?.()
  }

  const hasCert     = p._certifications.some(c => c.is_active)
  const activeCerts = p._certifications.filter(c => c.is_active)
  const cat         = p._cats[0] || ''
  const catLabel    = categories.find(c => c.slug === cat)?.name || cat
  const openStatus  = isOpenNow(p._hours)
  const today       = new Date().getDay()
  const todayH      = p._hours.find(h => h.day_of_week === today)
  const rating      = Number(p.avg_rating || 0).toFixed(1)

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
      {/* Zone scrollable unique : la photo défile avec le reste du contenu */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {/* Hero photo */}
        <div style={{ height: 180, background: 'var(--bg)', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
        {placePhotos.length > 0 ? (
          <>
            <img
              src={getUrl(placePhotos[activePhoto]?.storage_path)}
              alt={p.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Navigation photos */}
            {placePhotos.length > 1 && (
              <>
                <button onClick={() => setActivePhoto(i => (i - 1 + placePhotos.length) % placePhotos.length)} style={navBtn('left')}>
                  <i className="ti ti-chevron-left" />
                </button>
                <button onClick={() => setActivePhoto(i => (i + 1) % placePhotos.length)} style={navBtn('right')}>
                  <i className="ti ti-chevron-right" />
                </button>
                {/* Dots */}
                <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                  {placePhotos.map((_, i) => (
                    <div key={i} onClick={() => setActivePhoto(i)} style={{
                      width: i === activePhoto ? 18 : 6, height: 6, borderRadius: 3,
                      background: i === activePhoto ? '#fff' : 'rgba(255,255,255,.5)',
                      cursor: 'pointer', transition: 'all .2s',
                    }} />
                  ))}
                </div>
              </>
            )}
            {/* Supprimer la photo active */}
            <button
              onClick={() => requestDeletePhoto(placePhotos[activePhoto].id)}
              disabled={busy}
              title="Demander la suppression de cette photo"
              style={{
                position: 'absolute', top: 10, left: 10, width: 28, height: 28,
                background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(6px)',
                border: 'none', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: '#fff', fontSize: 13,
              }}
            >
              <i className="ti ti-trash" />
            </button>
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg,#f0f0f2,#e8e8ed)',
          }}>
            <i className="ti ti-building-store" style={{ fontSize: 52, color: 'rgba(184,134,11,.2)' }} />
          </div>
        )}

        {hasCert && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12,
            background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(31,164,82,.3)', borderRadius: 20,
            padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--green)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <i className="ti ti-shield-check" />
            {activeCerts[0]?.certification_authorities?.name || 'Certifié'}
          </div>
        )}

        <button onClick={onClose} style={{
          position: 'absolute', top: 10, right: 10, width: 30, height: 30,
          background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(10px)',
          border: '1px solid var(--border)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text2)', fontSize: 15,
        }}>
          <i className="ti ti-x" />
        </button>

        {/* Navigation vers la fiche précédente / suivante */}
        {fullscreen && hasPrev && (
          <button onClick={onPrev} title="Lieu précédent" style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            width: 34, height: 34, background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(10px)',
            border: '1px solid var(--border)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text2)', fontSize: 17,
          }}>
            <i className="ti ti-chevron-left" />
          </button>
        )}
        {fullscreen && hasNext && (
          <button onClick={onNext} title="Lieu suivant" style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            width: 34, height: 34, background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(10px)',
            border: '1px solid var(--border)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text2)', fontSize: 17,
          }}>
            <i className="ti ti-chevron-right" />
          </button>
        )}
      </div>

      {/* Corps — dans le même flux scrollable que la photo ci-dessus */}
      <div style={{ padding: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.3px', lineHeight: 1.2, marginBottom: 8 }}>
          {p.name}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {catLabel && (
            <span style={{ fontSize: 11.5, fontWeight: 500, padding: '3px 9px', borderRadius: 12, background: 'var(--gold-bg)', color: 'var(--gold)', border: '1px solid rgba(184,134,11,.2)' }}>
              {CAT_ICONS[cat] || '📍'} {catLabel}
            </span>
          )}
          {p.avg_rating != null && (
            <span style={{ fontSize: 11.5, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-star-filled" style={{ color: 'var(--gold)', fontSize: 12 }} />
              {rating} <span style={{ color: 'var(--text3)' }}>({p.review_count || 0})</span>
            </span>
          )}
          {openStatus !== 'unknown' && (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: openStatus === 'open' ? 'var(--green)' : 'var(--red)' }}>
              {openStatus === 'open'
                ? `Ouvert · ferme ${todayH?.close_time || ''}`
                : todayH?.is_closed ? "Fermé aujourd'hui" : `Fermé · ouvre ${todayH?.open_time || ''}`}
            </span>
          )}
          {p._distanceKm != null && (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-walk" style={{ fontSize: 12 }} />
              {formatDistance(p._distanceKm)}
            </span>
          )}
        </div>

        <Section title="Informations">
          <InfoRow icon="ti-map-pin">
            {[p.address, p.city, p.country !== 'FR' ? p.country : null].filter(Boolean).join(', ') || 'Non renseignée'}
          </InfoRow>
          {p.phone && <InfoRow icon="ti-phone">{p.phone}</InfoRow>}
          {p.website && (
            <InfoRow icon="ti-world">
              <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                {p.website.replace(/https?:\/\//, '')}
              </a>
            </InfoRow>
          )}
          {p.description && <InfoRow icon="ti-info-circle"><span style={{ lineHeight: 1.5 }}>{p.description}</span></InfoRow>}
        </Section>

        {activeCerts.length > 0 && (
          <Section title="Certifications">
            {activeCerts.map((c, i) => (
              <div key={i} style={{ padding: '9px 11px', borderRadius: 8, marginBottom: 6, background: 'rgba(31,164,82,.05)', border: '1px solid rgba(31,164,82,.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-shield-check" style={{ fontSize: 15, color: 'var(--green)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.certification_authorities?.name || '–'}</div>
                  {c.cert_type && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.cert_type}</div>}
                </div>
                {c.valid_until && <span style={{ fontSize: 10.5, color: 'var(--green)', fontWeight: 600 }}>✓ Valide</span>}
              </div>
            ))}
          </Section>
        )}

        <Section title="Horaires">
          {DAYS.map((d, i) => {
            const h = p._hours.find(x => x.day_of_week === i)
            const isToday = i === today
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}>
                <span style={{ width: 82, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--gold)' : 'var(--text3)' }}>{d}</span>
                {!h || h.is_closed
                  ? <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Fermé</span>
                  : <span style={{ fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--gold)' : 'var(--text2)' }}>{h.open_time} – {h.close_time}</span>
                }
              </div>
            )
          })}
        </Section>

        <Section title="Avis clients">
          {/* Bouton pour laisser / modifier son avis */}
          {!showReviewForm && (
            <button onClick={openReviewForm} style={{
              width: '100%', height: 36, marginBottom: 10, borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'var(--font)',
            }}>
              <i className={`ti ${myReview ? 'ti-edit' : 'ti-star'}`} />
              {myReview ? 'Modifier mon avis' : 'Laisser un avis'}
            </button>
          )}

          {/* Formulaire avis */}
          {showReviewForm && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              {reviewError && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{reviewError}</div>
              )}
              <div style={{ display: 'flex', gap: 4, marginBottom: 10, justifyContent: 'center' }}>
                {Array.from({ length: 5 }, (_, j) => (
                  <i
                    key={j}
                    onClick={() => setReviewRating(j + 1)}
                    className={`ti ti-star${j < reviewRating ? '-filled' : ''}`}
                    style={{ fontSize: 26, color: 'var(--gold)', cursor: 'pointer' }}
                  />
                ))}
              </div>
              <textarea
                value={reviewContent}
                onChange={e => setReviewContent(e.target.value)}
                placeholder="Votre avis (facultatif)…"
                style={{
                  width: '100%', height: 64, resize: 'none', padding: '8px 10px',
                  border: '1px solid var(--border)', borderRadius: 7, fontSize: 12.5,
                  fontFamily: 'var(--font)', outline: 'none', marginBottom: 8, background: '#fff',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowReviewForm(false)} style={{
                  flex: '0 0 auto', height: 34, padding: '0 14px', borderRadius: 7,
                  border: '1px solid var(--border)', background: '#fff', color: 'var(--text2)',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                }}>Annuler</button>
                <button onClick={submitReview} disabled={reviewBusy} style={{
                  flex: 1, height: 34, borderRadius: 7, border: 'none',
                  background: 'var(--gold)', color: '#fff', fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font)',
                }}>
                  {reviewBusy ? 'Envoi…' : 'Publier'}
                </button>
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: 12.5 }}>Aucun avis pour l'instant.</div>
          ) : reviews.slice(0, 8).map((r, i) => (
            <div key={r.id || i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {r.profiles?.display_name || 'Anonyme'}
                  {r.user_id === profile?.id && <span style={{ color: 'var(--gold)', fontWeight: 500 }}> (vous)</span>}
                </span>
                <span>{Array.from({ length: 5 }, (_, j) => <i key={j} className={`ti ti-star${j < r.rating ? '-filled' : ''}`} style={{ fontSize: 11, color: 'var(--gold)' }} />)}</span>
              </div>
              {r.content && <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{r.content}</div>}
              <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 5 }}>
                {new Date(r.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))}
        </Section>

        {/* Signalement / suppression */}
        <Section title="Signaler">
          {deleteSent ? (
            <div style={{
              fontSize: 12.5, color: 'var(--green)', background: 'rgba(31,164,82,.06)',
              border: '1px solid rgba(31,164,82,.2)', borderRadius: 8, padding: '10px 12px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="ti ti-circle-check" /> Demande envoyée, en attente de validation par un admin.
            </div>
          ) : confirmDeletePlace ? (
            <div style={{
              background: 'rgba(224,54,59,.05)', border: '1px solid rgba(224,54,59,.2)',
              borderRadius: 8, padding: '12px', fontSize: 12.5,
            }}>
              <div style={{ color: 'var(--text2)', marginBottom: 10, lineHeight: 1.4 }}>
                Confirmer la demande de suppression de cette fiche ? Un administrateur devra la valider.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmDeletePlace(false)} style={{ ...miniBtn, background: 'var(--bg)', color: 'var(--text2)' }}>Annuler</button>
                <button onClick={requestDeletePlace} disabled={busy} style={{ ...miniBtn, background: 'var(--red)', color: '#fff' }}>
                  {busy ? '...' : 'Confirmer'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => session ? setConfirmDeletePlace(true) : onAuthRequired()}
              style={{
                fontSize: 12.5, color: 'var(--red)', background: 'none', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0,
                fontFamily: 'var(--font)',
              }}
            >
              <i className="ti ti-flag" /> Demander la suppression de cette fiche
            </button>
          )}
        </Section>
      </div>
      </div>
      {/* ↑ fin de la zone scrollable unique (photo + corps) */}

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
        <Btn onClick={onShare}><i className="ti ti-share" /> Partager</Btn>
        <Btn onClick={onEdit} primary><i className="ti ti-edit" /> Modifier</Btn>
      </div>
    </aside>
  )
}

function navBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side]: 8, width: 28, height: 28,
    background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,.5)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: 14, color: 'var(--text)',
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 10, paddingBottom: 7, borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  )
}

function InfoRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.03)' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 14, color: 'var(--text3)', width: 18, textAlign: 'center', flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.4 }}>{children}</span>
    </div>
  )
}

function Btn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, height: 38, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      fontFamily: 'var(--font)', transition: 'all .15s',
      background: primary ? 'var(--gold)' : 'var(--bg)',
      color: primary ? '#fff' : 'var(--text2)',
      border: primary ? 'none' : '1px solid var(--border)',
    }}>
      {children}
    </button>
  )
}

const miniBtn: React.CSSProperties = {
  flex: 1, height: 32, borderRadius: 7, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', border: 'none', fontFamily: 'var(--font)',
}
