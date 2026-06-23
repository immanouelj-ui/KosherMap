import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kosher Map — Annuaire certifié',
  description: 'Trouvez les restaurants, boucheries, traiteurs et épiceries casher certifiés près de chez vous.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kosher Map',
  },
}

export const viewport: Viewport = {
  themeColor: '#B8860B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        {/* Icônes Tabler */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"
        />
        {/* PWA — icône iOS */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Leaflet Marker Cluster CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
        />
      </head>
      <body>
        {children}
        {/* Enregistrement du Service Worker pour la PWA */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('SW enregistré', reg.scope); })
                .catch(function(err) { console.warn('SW échec', err); });
            });
          }
        `}} />
      </body>
    </html>
  )
}
