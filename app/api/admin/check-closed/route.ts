import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Remplace les séquences unicode \uXXXX dans une string brute HTML
function decodeUnicode(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}

function isClosed(html: string): boolean {
  // Décode les escapes unicode présents dans les blocs <script> de Google
  const decoded = decodeUnicode(html)
  const lower = decoded.toLowerCase()

  return (
    lower.includes('définitivement fermé') ||
    lower.includes('définitivement close') ||
    lower.includes('permanently closed') ||
    lower.includes('closed permanently') ||
    // Variantes encodées HTML
    lower.includes('d&#233;finitivement ferm&#233;') ||
    lower.includes('définitivement fermé') ||
    // Variante sans espace insécable
    lower.includes('définitivement fermé') ||
    // Clés présentes dans le JSON de Google Maps Knowledge Graph
    lower.includes('"closed_permanently"') ||
    lower.includes('"business_status":"closed_permanently"') ||
    lower.includes('closedpermanently')
  )
}

export async function POST(req: NextRequest) {
  const { place_id, name, city } = await req.json()
  if (!place_id || !name) return NextResponse.json({ error: 'place_id et name requis' }, { status: 400 })

  const query = [name, city].filter(Boolean).join(' ')

  // On essaie deux URLs : Google Search + Google Maps
  const urls = [
    `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=fr&gl=fr&num=3`,
    `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
  ]

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml;q=0.9,*/*;q=0.8',
    'Cache-Control': 'no-cache',
  }

  try {
    for (const url of urls) {
      const res = await fetch(url, { headers })
      const html = await res.text()

      if (isClosed(html)) {
        await supabaseAdmin.from('places').update({ is_deleted: true }).eq('id', place_id)
        return NextResponse.json({ place_id, name, closed: true })
      }
    }

    return NextResponse.json({ place_id, name, closed: false })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur scraping' }, { status: 500 })
  }
}
