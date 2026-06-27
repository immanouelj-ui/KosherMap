import { createClient } from '@supabase/supabase-js'

// Client serveur avec service_role — uniquement dans les Server Components / Route Handlers
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
