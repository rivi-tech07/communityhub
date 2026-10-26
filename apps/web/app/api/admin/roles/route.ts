import { NextResponse } from 'next/server';
import { getAdminClient, requireRole } from '../../../lib/server-auth';
import {
  applyRoleChange,
  isSessionFresh,
  parseRoleChange,
  type RoleChange,
} from '../../../lib/admin-roles';

function readIssuedAt(request: Request): number | null {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { iat?: number; issued_at?: number };
    const issuedAt = payload.issued_at ?? payload.iat;
    return typeof issuedAt === 'number' && Number.isFinite(issuedAt) ? issuedAt : null;
  } catch {
    return null;
  }
}

async function handleRoleChange(request: Request, fallbackAction: RoleChange['action']) {
  const actor = await requireRole(request, ['administrator']);
  if (actor instanceof NextResponse) return actor;
  if (!isSessionFresh(readIssuedAt(request)))
    return NextResponse.json(
      { error: 'Reauthentication required before changing roles.', code: 'reauthenticate' },
      { status: 401 },
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const change = parseRoleChange(body, fallbackAction);
  if (!change)
    return NextResponse.json({ error: 'A valid userId and role are required.' }, { status: 400 });

  const result = await applyRoleChange(getAdminClient(), actor.user.id, change);
  if ('error' in result)
    return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

export function POST(request: Request) {
  return handleRoleChange(request, 'grant');
}
export function DELETE(request: Request) {
  return handleRoleChange(request, 'revoke');
}
