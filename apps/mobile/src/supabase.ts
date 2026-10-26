import { createSupabaseClient, getSupabaseConfig } from '@communityhub/shared';

export const MOBILE_SESSION_ID =
  globalThis.crypto?.randomUUID?.() ??
  `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const config = getSupabaseConfig({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});
export const supabase = config ? createSupabaseClient(config) : null;
