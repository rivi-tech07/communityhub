import { NextResponse } from 'next/server';
import { getPublicClient, requireRole } from '../../../lib/server-auth';

export async function GET() {
  const { data, error } = await getPublicClient().from('feature_flags').select('key,enabled,description').order('key');
  if (error) return NextResponse.json({ error: 'Unable to load feature flags.' }, { status: 503 });
  return NextResponse.json({ flags: data ?? [] });
}

export async function PATCH(request: Request) {
  const actor = await requireRole(request, ['administrator']);
  if (actor instanceof NextResponse) return actor;
  const body = (await request.json().catch(() => null)) as { key?: string; enabled?: boolean } | null;
  if (!body?.key || typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'A feature key and enabled value are required.' }, { status: 400 });
  const { data, error } = await actor.client.from('feature_flags').update({ enabled: body.enabled, updated_by: actor.user.id }).eq('key', body.key).select('key,enabled,description').single();
  if (error || !data) return NextResponse.json({ error: 'Feature flag not found or could not be updated.' }, { status: 400 });
  return NextResponse.json({ flag: data });
}
