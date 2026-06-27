import type { MetadataRoute } from 'next'
import { supabaseServer } from '@/lib/supabase-server'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koshermap.store'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: places } = await supabaseServer
    .from('places')
    .select('slug, updated_at')
    .eq('is_deleted', false)
    .not('slug', 'is', null)
    .limit(50000)
    .catch(() => ({ data: null }))

  const placeUrls: MetadataRoute.Sitemap = (places || []).map(p => ({
    url: `${BASE}/place/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...placeUrls,
  ]
}
