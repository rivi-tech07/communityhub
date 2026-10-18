import { createSupabaseClient, getSupabaseConfig } from '@communityhub/shared';

export const supabaseConfig = getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
export const supabase = supabaseConfig ? createSupabaseClient(supabaseConfig) : null;
