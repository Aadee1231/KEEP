import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let client: SupabaseClient | null = null;

/**
 * Supabase client wired to Clerk: the session JWT is attached as the
 * access token so `auth.jwt()->>'sub'` resolves to the Clerk user id.
 * Configure Clerk under Supabase → Authentication → Third Party.
 */
export function getSupabase(getToken: () => Promise<string | null>): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      accessToken: getToken,
    });
  }
  return client;
}
