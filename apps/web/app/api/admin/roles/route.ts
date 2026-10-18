import { NextResponse } from 'next/server';
import { getAdminClient, requireRole } from '../../../lib/server-auth';
import { ROLES, type Role } from '@communityhub/shared';

export async function POST(request: Request) {
  const actor = await requireRole(request, ['administrator']);
  if (actor instanceof NextResponse) return actor;
  let body: { userId?: string; role?: Role };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if (!body.userId || !body.role || !ROLES.includes(body.role)) return NextResponse.json({ error: 'A valid userId and role are required.' }, { status: 400 });
  const admin = getAdminClient();
  const { error } = await admin.from('user_roles').upsert({ user_id: body.userId, role: body.role });
  if (error) return NextResponse.json({ error: 'Role update failed.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
