import { NextResponse } from 'next/server';
import { getAdminClient, requireRole } from '../../../../lib/server-auth';

const statuses = ['active', 'blocked', 'blacklisted'] as const;

export async function GET(request: Request) {
  const actor = await requireRole(request, ['administrator']);
  if (actor instanceof NextResponse) return actor;
  const admin = getAdminClient();
  const { data, error } = await admin.from('user_safety_controls').select('*').order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Unable to load user safety controls.' }, { status: 503 });
  return NextResponse.json({ controls: data ?? [] });
}

export async function PATCH(request: Request) {
  const actor = await requireRole(request, ['administrator']);
  if (actor instanceof NextResponse) return actor;
  let body: { userId?: string; status?: (typeof statuses)[number]; reason?: string; expiresAt?: string | null };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if (!body.userId || !body.status || !statuses.includes(body.status) || !body.reason?.trim()) return NextResponse.json({ error: 'userId, status, and reason are required.' }, { status: 400 });
  if (body.status === 'blocked' && !body.expiresAt) return NextResponse.json({ error: 'Temporary blocks require an expiry time.' }, { status: 400 });
  if (body.userId === actor.user.id && body.status !== 'active') return NextResponse.json({ error: 'You cannot restrict your own administrator account.' }, { status: 400 });
  const admin = getAdminClient();
  const { data, error } = await admin.from('user_safety_controls').upsert({ user_id: body.userId, status: body.status, reason: body.reason.trim(), expires_at: body.status === 'blocked' ? body.expiresAt : null, created_by: actor.user.id }, { onConflict: 'user_id' }).select('*').single();
  if (error) return NextResponse.json({ error: 'Unable to update user safety control.' }, { status: 400 });
  await admin.from('moderation_audit_log').insert({ actor_id: actor.user.id, action: body.status === 'active' ? 'user_unrestricted' : `user_${body.status}`, target_user_id: body.userId, reason: body.reason.trim() });
  return NextResponse.json({ control: data });
}
