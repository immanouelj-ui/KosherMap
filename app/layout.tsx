import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kosher Map — Annuaire certifié',
  description: 'Trouvez les restaurants, boucheries, traiteurs et épiceries casher certifiés près de chez vous.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Leaflet CSS — chargé en premier pour éviter les tuiles fractionnées */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        {/* Icons Tabler */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
