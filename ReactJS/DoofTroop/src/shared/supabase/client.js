import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabase.js'

export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  'Supabase is not configured (set VITE_SUPABASE_ANON_KEY)'

if (!SUPABASE_ANON_KEY) {
  console.error(`[supabase] ${SUPABASE_NOT_CONFIGURED_MESSAGE}`)
}

/**
 * `null` when the publishable key is missing — `createClient` throws on an
 * empty key, which would blank the whole app at import time.
 * @type {ReturnType<typeof createClient> | null}
 */
export const supabase = SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null
