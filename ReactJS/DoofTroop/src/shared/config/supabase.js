/**
 * DoofTroop-Development Supabase (publishable client key).
 * Override via VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 */
const DEFAULT_URL = 'https://xypxrqyecjeiftuqppeu.supabase.co'

export const SUPABASE_URL =
  (typeof import.meta.env.VITE_SUPABASE_URL === 'string' &&
    import.meta.env.VITE_SUPABASE_URL.trim()) ||
  DEFAULT_URL

export const SUPABASE_ANON_KEY =
  (typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY.trim()) ||
  ''

/** Development channel-01 — bind every round feed to this stream. */
export const DOOF_CHANNEL_ID = '43fa047a-dfe0-45a3-a093-2cb11cc29b55'
