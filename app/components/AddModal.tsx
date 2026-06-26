'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useGeocode } from '@/hooks/useGeocode'
import type { Profile } from '@/types'
import type { Session } from '@supabase/supabase-js'
import HoraireEditor, { emptyWeek, weekToRows, type WeekSchedule } from './HoraireEditor'

const MiniMap = dynamic(() => import('./MiniMap'), { ssr: false })

interface Props {
  open: boolean
  placeId?: string | null
  initialData?: Record<string, string>
  profile: Profile | null
  session: Session | null
  onClose: () => void
  onSuccess: () => void
}

const CATS = ['boucherie','epicerie','patisserie','restaurant']
const BUCKET = 'photos'

export default function AddModal({ open, placeId, initialData, profile, session, onClose, onSuccess }: Props) {
  const [f, setF]               = useState<Record<string, string>>(initialData || {})
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [photos, setPhotos]     = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [schedule, setSchedule] = useState<WeekSchedule>(emptyWeek())
  const [showHoraires, setShowHoraires] = useState(false)
  const [certAuthorities, setCertAuthorities] = useState<{ id: string; name: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('certification_authorities').select('id,name').order('name').then(({ data }) => {
      if (data) setCertAuthorities(data)
    })
  }, [])

  useEffect(() => {
    setF(initialData || {}); setError(''); setPhotos([]); setPreviews([])
    setSchedule(emptyWeek()); setShowHoraires(false)
  }, [initialData, open])

  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }))

  const { result: geo, status: geoStatus } = useGeocode(f.address || '', f.city || '')

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 5)
    setPhotos(files)
    setPreviews(files.map(f => URL.createObjectURL(f)))
  }

  function removePhoto(i: number) {
    setPhotos(p => p.filter((_, j) => j !== i))
    setPreviews(p => p.filter((_, j) => j !== i))
  }

  async function uploadPhotos(refFolder: string): Promise<string[]> {
    const paths: string[] = []
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i]
      const ext  = file.name.split('.').pop()
      const path = `${refFolder}/${Date.now()}_${i}.${ext}`

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
      if (upErr) { setProgress(Math.round(((i + 1) / photos.length) * 100)); continue }

      await supabase.from('photos').insert({
        place_id: placeId || null,
        user_id: profile?.id || null,
        storage_path: path,
        is_primary: i === 0,
      })

      paths.push(path)
      setProgress(Math.round(((i + 1) / photos.length) * 100))
    }
    return paths
  }

  async function submit() {
    if (!f.name?.trim()) { setError('Le nom est requis.'); return }
    if (photos.length > 0 && !session) { setError('Connectez-vous pour ajouter des photos.'); return }
    setLoading(true); setError(''); setProgress(0)
    try {
      const refFolder = placeId || `pending_${Date.now()}`
      const photoPaths = photos.length > 0 ? await uploadPhotos(refFolder) : []

      const horaireRows = weekToRows('__placeholder__', schedule).map(({ place_id: _, ...r }) => r)
      const { error: err } = await supabase.from('place_suggestions').insert({
        place_id: placeId || null,
        user_id: profile?.id || null,
        suggested_changes: {
          name: f.name, city: f.city, address: f.address,
          category: f.category, phone: f.phone, website: f.website,
          description: f.description, cert_authority: f.cert,
          photo_paths: photoPaths,
          lat: geo?.lat ?? null,
          lng: geo?.lng ?? null,
          opening_hours: horaireRows.length > 0 ? horaireRows : null,
        },
        status: 'pending',
      })
      if (err) throw err
      onSuccess(); onClose()
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setLoading(false); setProgress(0)
    }
  }

  if (!open) return null

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(6px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div className="fade-up" style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
      }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{placeId ? 'Suggérer une modification' : 'Proposer un lieu casher'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
          {error && <div style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 14, padding: '8px 10px', background: 'rgba(224,54,59,.06)', borderRadius: 7 }}>{error}</div>}

          <F label="Nom de l'établissement *">
            <input type="text" value={f.name || ''} onChange={e => set('name', e.target.value)} placeholder="Ex: Chez David Traiteur" style={inp} />
          </F>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <F label="Catégorie">
              <select value={f.category || ''} onChange={e => set('category', e.target.value)} style={inp}>
                <option value="">Choisir…</option>
                {CATS.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
              </select>
            </F>
            <F label="Ville">
              <input type="text" value={f.city || ''} onChange={e => set('city', e.target.value)} placeholder="Paris, Lyon…" style={inp} />
            </F>
          </div>
          <F label="Adresse">
            <input type="text" value={f.address || ''} onChange={e => set('address', e.target.value)} placeholder="12 rue des Rosiers, 75004" style={inp} />
          </F>

          {/* Aperçu géolocalisation */}
          {(f.address || '').trim().length >= 3 && (
            <div style={{ marginBottom: 13 }}>
              <div style={{
                fontSize: 11.5, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
                color: geoStatus === 'found' ? 'var(--green)' : geoStatus === 'loading' ? 'var(--text3)' : 'var(--red)',
                fontWeight: 600,
              }}>
                {geoStatus === 'loading' && <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Localisation en cours…</>}
                {geoStatus === 'found' && <><i className="ti ti-map-pin-check" /> Adresse localisée</>}
                {geoStatus === 'not_found' && <><i className="ti ti-map-pin-off" /> Adresse non trouvée — vérifiez l'orthographe ou précisez la ville</>}
                {geoStatus === 'error' && <><i className="ti ti-alert-triangle" /> Erreur de géolocalisation, réessayez</>}
              </div>
              {geoStatus === 'found' && geo && (
                <div style={{ height: 130, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <MiniMap lat={geo.lat} lng={geo.lng} />
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <F label="Téléphone">
              <input type="text" value={f.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="01 XX XX XX XX" style={inp} />
            </F>
            <F label="Site web">
              <input type="text" value={f.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://…" style={inp} />
            </F>
          </div>
          <F label="Autorité de certification">
            <select value={f.cert || ''} onChange={e => set('cert', e.target.value)} style={inp}>
              <option value="">Inconnue / non renseignée</option>
              {certAuthorities.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </F>
          <F label="Description / Notes">
            <textarea value={f.description || ''} onChange={e => set('description', e.target.value)}
              placeholder="Spécialités, informations utiles…"
              style={{ ...inp, height: 72, resize: 'none', padding: '10px 12px' }} />
          </F>

          {/* Section horaires (optionnelle, dépliable) */}
          <div style={{ marginBottom: 13 }}>
            <button
              type="button"
              onClick={() => setShowHoraires(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)', color: 'var(--text2)', fontSize: 13, fontWeight: 600 }}
            >
              <i className={`ti ${showHoraires ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: 13 }} />
              <i className="ti ti-clock" style={{ fontSize: 14, color: 'var(--gold)' }} />
              Horaires d'ouverture <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)', marginLeft: 4 }}>(optionnel)</span>
            </button>
            {showHoraires && (
              <div style={{ marginTop: 12, padding: '14px 0 0', borderTop: '1px solid var(--border)' }}>
                <HoraireEditor value={schedule} onChange={setSchedule} />
              </div>
            )}
          </div>

          <F label={`Photos${!session ? ' (connexion requise)' : ' (max 5)'}`}>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} style={{ display: 'none' }} />
            {previews.length === 0 ? (
              <div
                onClick={() => session && fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)', borderRadius: 8, padding: 16,
                  textAlign: 'center', cursor: session ? 'pointer' : 'not-allowed',
                  background: 'var(--bg)', opacity: session ? 1 : 0.5, transition: 'border-color .15s',
                }}
                onMouseEnter={e => { if (session) e.currentTarget.style.borderColor = 'var(--gold)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <i className="ti ti-camera" style={{ fontSize: 24, color: 'var(--text3)', display: 'block', marginBottom: 5 }} />
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {session ? 'Cliquez pour ajouter des photos' : 'Connectez-vous pour ajouter des photos'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <div onClick={() => removePhoto(i)} style={{
                      position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                      background: 'var(--red)', borderRadius: '50%', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, cursor: 'pointer', border: '2px solid #fff',
                    }}>✕</div>
                  </div>
                ))}
                {previews.length < 5 && (
                  <div onClick={() => fileRef.current?.click()} style={{
                    width: 72, height: 72, border: '2px dashed var(--border)', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--text3)', fontSize: 24,
                  }}>+</div>
                )}
              </div>
            )}
          </F>
        </div>

        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {loading && progress > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 4 }}>Upload… {progress}%</div>
              <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gold)', borderRadius: 2, transition: 'width .2s' }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ ...btn, flex: '0 0 auto', padding: '0 20px', background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }}>Annuler</button>
            <button onClick={submit} disabled={loading} style={{ ...btn, flex: 1, background: loading ? 'rgba(184,134,11,.5)' : 'var(--gold)', color: '#fff', border: 'none' }}>
              {loading
                ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> {progress > 0 ? `Upload ${progress}%` : 'Envoi…'}</>
                : <><i className="ti ti-send" /> Envoyer la suggestion</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', height: 38, background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '0 12px', fontSize: 13, fontFamily: 'var(--font)',
  color: 'var(--text)', outline: 'none', appearance: 'auto',
}
const btn: React.CSSProperties = {
  height: 38, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  fontFamily: 'var(--font)', transition: 'all .15s',
}
