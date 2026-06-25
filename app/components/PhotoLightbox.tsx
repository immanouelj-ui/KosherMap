'use client'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  photos: string[]
  currentIndex: number
  onIndexChange: (i: number) => void
  onClose: () => void
}

export default function PhotoLightbox({ photos, currentIndex, onIndexChange, onClose }: Props) {
  const touchStartX = useRef(0)

  const prev = () => { if (currentIndex > 0) onIndexChange(currentIndex - 1) }
  const next = () => { if (currentIndex < photos.length - 1) onIndexChange(currentIndex + 1) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    const prev_overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev_overflow
    }
  }, [currentIndex])

  if (typeof window === 'undefined') return null

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.93)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (dx > 50) prev()
        else if (dx < -50) next()
      }}
    >
      {/* Bouton fermer */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16, zIndex: 1,
        width: 42, height: 42, borderRadius: '50%',
        background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)',
        border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="ti ti-x" />
      </button>

      {/* Compteur */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,.75)', fontSize: 13, fontWeight: 600,
          background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(6px)',
          padding: '4px 12px', borderRadius: 20,
        }}>
          {currentIndex + 1} / {photos.length}
        </div>
      )}

      {/* Image */}
      <img
        src={photos[currentIndex]}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 'min(90vw, 1000px)',
          maxHeight: '82vh',
          objectFit: 'contain',
          borderRadius: 10,
          userSelect: 'none',
          boxShadow: '0 20px 60px rgba(0,0,0,.5)',
        }}
      />

      {/* Flèche gauche */}
      {currentIndex > 0 && (
        <button onClick={e => { e.stopPropagation(); prev() }} style={arrowStyle('left')}>
          <i className="ti ti-chevron-left" />
        </button>
      )}

      {/* Flèche droite */}
      {currentIndex < photos.length - 1 && (
        <button onClick={e => { e.stopPropagation(); next() }} style={arrowStyle('right')}>
          <i className="ti ti-chevron-right" />
        </button>
      )}

      {/* Points de navigation */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 24,
          display: 'flex', gap: 6, alignItems: 'center',
        }}>
          {photos.map((_, i) => (
            <div
              key={i}
              onClick={e => { e.stopPropagation(); onIndexChange(i) }}
              style={{
                width: i === currentIndex ? 22 : 7,
                height: 7, borderRadius: 4,
                background: i === currentIndex ? '#fff' : 'rgba(255,255,255,.35)',
                cursor: 'pointer', transition: 'all .2s',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}

const arrowStyle = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute',
  [side]: 14,
  top: '50%', transform: 'translateY(-50%)',
  width: 46, height: 46, borderRadius: '50%',
  background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)',
  border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1, transition: 'background .15s',
})
