import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Endpoint de debug : retourne un extrait du HTML de Google pour un lieu donné
// Usage : POST { "name": "...", "city": "..." }
export async function POST(req: NextRequest) {
  const { name, city } = await req.json()
  if (!name) return NextResponse.json({ error: 'name requis' }, { status: 400 })

  const query = [name, city].filter(Boolean).join(' ')
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=fr&gl=fr&num=3`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml;q=0.9,*/*;q=0.8',
    },
  })

  const html = await res.text()
  const decoded = html.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))

  // Cherche les 200 caractères autour de mots-clés liés à la fermeture
  const keywords = ['fermé', 'closed', 'permanently', 'définitivement', 'ferm', 'status']
  const snippets: { keyword: string; context: string }[] = []

  for (const kw of keywords) {
    const idx = decoded.toLowerCase().indexOf(kw)
    if (idx !== -1) {
      snippets.push({
        keyword: kw,
        context: decoded.slice(Math.max(0, idx - 80), idx + 120),
      })
    }
  }

  return NextResponse.json({
    url,
    status: res.status,
    snippets,
    // Premiers 500 chars pour voir si c'est un CAPTCHA
    head: decoded.slice(0, 500),
  })
}
