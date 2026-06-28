export default function PremiumSuccess() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111', margin: '0 0 12px' }}>Bienvenue dans Premium !</h1>
        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, margin: '0 0 28px' }}>
          Votre fiche est maintenant mise en avant sur KosherMap. Les modifications peuvent prendre quelques minutes à apparaître.
        </p>
        <a href="/" style={{
          display: 'inline-block', background: 'linear-gradient(135deg, #B8860B, #D4A017)', color: '#fff',
          borderRadius: 12, padding: '14px 28px', fontSize: 14, fontWeight: 700, textDecoration: 'none',
        }}>
          Voir la carte →
        </a>
      </div>
    </div>
  )
}
