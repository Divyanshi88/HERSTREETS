import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { supabase as supabaseConfig } from 'config'

const hasConfig = Boolean(supabaseConfig?.url?.trim() && supabaseConfig?.anonKey?.trim())

export const supabase: SupabaseClient | null = hasConfig
    ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
          auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
          },
      })
    : null

export function isSupabaseConfigured(): boolean {
    return supabase !== null
}

export function requireSupabase(): SupabaseClient {
    if (!supabase) {
        throw new Error('Community features are not configured yet. Add the Supabase URL and anon key to config-local.js.')
    }

    return supabase
}
