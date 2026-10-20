import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getSupabaseConfig, type Database, type Role } from '@communityhub/shared';
import { NextResponse } from 'next/server';

function getConfig() {
  const config = getSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!config) throw new Error('Supabase public environment variables are not configured.');
  return config;
}

export function getUserClient(accessToken: string) {
  const config = getConfig();
  return createClient<Database>(config.url, config.anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getPublicClient() {
  return createClient<Database>(getConfig().url, getConfig().anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function authenticate(
  request: Request,
): Promise<{ user: User; client: SupabaseClient<Database> } | NextResponse> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const client = getUserClient(token);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user)
      return NextResponse.json({ error: 'Session is invalid or expired.' }, { status: 401 });
    const { data: restricted, error: restrictionError } = await client.rpc('is_user_restricted', { target_user: data.user.id });
    if (restrictionError) return NextResponse.json({ error: 'Unable to verify account status.' }, { status: 503 });
    if (restricted) return NextResponse.json({ error: 'This account is restricted. Contact support if you believe this is an error.' }, { status: 403 });
    return { user: data.user, client };
  } catch {
    return NextResponse.json({ error: 'Authentication service is unavailable.' }, { status: 503 });
  }
}

export async function requireRole(request: Request, allowed: readonly Role[]) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { data, error } = await result.client
    .from('user_roles')
    .select('role')
    .eq('user_id', result.user.id);
  if (error) return NextResponse.json({ error: 'Unable to verify permissions.' }, { status: 503 });
  const roles = (data ?? []).map((row) => row.role as Role);
  if (!roles.some((role) => allowed.includes(role)))
    return NextResponse.json(
      { error: 'You do not have permission for this action.' },
      { status: 403 },
    );
  return { ...result, roles };
}

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey)
    throw new Error('Server-only Supabase service role credentials are not configured.');
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
