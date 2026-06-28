import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Kosher Map — Annuaire certifié'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg, #0f1410 0%, #1a2318 50%, #0d1a14 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-start', justifyContent: 'center',
          padding: '80px 100px', fontFamily: 'sans-serif',
        }}
      >
        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: 'linear-gradient(135deg, #B8860B, #1FA452)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="40" height="40" viewBox="0 0 32 32">
              <circle cx="16" cy="13" r="5.5" fill="none" stroke="white" stroke-width="2.5"/>
              <circle cx="16" cy="13" r="2" fill="white"/>
              <line x1="16" y1="18.5" x2="16" y2="26" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>
              <span style={{ color: '#B8860B' }}>Kosher</span>
              <span style={{ color: '#1FA452' }}>Map</span>
            </span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 4 }}>
              Annuaire certifié
            </span>
          </div>
        </div>

        {/* Headline */}
        <div style={{
          fontSize: 68, fontWeight: 800, color: '#fff',
          letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 28,
          maxWidth: 800,
        }}>
          Les adresses casher<br />
          <span style={{ color: '#1FA452' }}>certifiées</span> près de chez vous
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,.6)', lineHeight: 1.5, maxWidth: 660 }}>
          Restaurants, boucheries, traiteurs et épiceries casher en Île-de-France.
        </div>

        {/* URL */}
        <div style={{ marginTop: 56, fontSize: 18, color: '#B8860B', letterSpacing: '.5px' }}>
          koshermap.store
        </div>
      </div>
    ),
    size,
  )
}
