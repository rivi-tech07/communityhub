import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/server-auth';

export async function GET(request: Request) {
  const actor = await requireRole(request, ['administrator', 'moderator']);
  if (actor instanceof NextResponse) return actor;
  const { data, error } = await actor.client
    .from('businesses')
    .select('id,name,slug,category,city,country,verification_status,is_published,created_at,owner_id')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Unable to load business approvals.' }, { status: 503 });
  return NextResponse.json({ businesses: data ?? [] });
}

export async function PATCH(request: Request) {
  const actor = await requireRole(request, ['administrator', 'moderator']);
  if (actor instanceof NextResponse) return actor;
  const body = await request.json().catch(() => null) as { businessId?: string; status?: 'verified' | 'rejected' | 'pending'; published?: boolean } | null;
  if (!body?.businessId || !body.status || typeof body.published !== 'boolean') {
    return NextResponse.json({ error: 'Business, verification status and publish choice are required.' }, { status: 400 });
  }
  const { data, error } = await actor.client
    .from('businesses')
    .update({ verification_status: body.status, is_published: body.status === 'verified' && body.published })
    .eq('id', body.businessId)
    .select('id,name,verification_status,is_published')
    .single();
  if (error || !data) return NextResponse.json({ error: 'Business approval could not be saved.' }, { status: 400 });
  return NextResponse.json({ business: data });
}
