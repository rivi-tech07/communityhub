import { NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/server-auth';

export async function PATCH(request: Request, context: { params: Promise<{ communityId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { communityId } = await context.params;
  let body: { userId?: string; status?: 'active' | 'blocked'; role?: 'admin' | 'member' };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if (!body.userId || (!body.status && !body.role)) return NextResponse.json({ error: 'A userId and membership change are required.' }, { status: 400 });
  const update = { ...(body.status ? { status: body.status } : {}), ...(body.role ? { role: body.role } : {}) };
  const { data, error } = await result.client.from('community_memberships').update(update).eq('community_id', communityId).eq('user_id', body.userId).select('*').single();
  if (error) return NextResponse.json({ error: 'You do not have permission to manage this membership.' }, { status: 403 });
  return NextResponse.json({ membership: data });
}
