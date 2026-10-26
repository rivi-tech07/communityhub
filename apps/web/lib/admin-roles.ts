import { ROLES, type Role } from '@communityhub/shared';
import type { getAdminClient } from '../app/lib/server-auth';

const MAX_SESSION_AGE_SECONDS = 15 * 60;

export type RoleChange = { userId: string; role: Role; action: 'grant' | 'revoke' };

export function isSessionFresh(issuedAt: number | null, now = Math.floor(Date.now() / 1000)) {
  return issuedAt !== null && issuedAt <= now && now - issuedAt <= MAX_SESSION_AGE_SECONDS;
}

export function parseRoleChange(body: unknown, action: RoleChange['action']): RoleChange | null {
  if (!body || typeof body !== 'object') return null;
  const candidate = body as { userId?: unknown; role?: unknown; action?: unknown };
  const requestedAction = candidate.action ?? action;
  if (
    typeof candidate.userId !== 'string' ||
    !candidate.userId ||
    typeof candidate.role !== 'string' ||
    !ROLES.includes(candidate.role as Role) ||
    (requestedAction !== 'grant' && requestedAction !== 'revoke')
  )
    return null;
  return { userId: candidate.userId, role: candidate.role as Role, action: requestedAction };
}

export async function applyRoleChange(
  admin: ReturnType<typeof getAdminClient>,
  actorId: string,
  change: RoleChange,
) {
  const roleQuery = admin.from('user_roles');
  const roleResult =
    change.action === 'grant'
      ? await roleQuery.upsert({ user_id: change.userId, role: change.role })
      : await roleQuery.delete().eq('user_id', change.userId).eq('role', change.role);
  if (roleResult.error) return { error: 'Role update failed.', status: 400 as const };

  const invalidation = await admin.auth.admin.signOut(change.userId, 'global');
  if (invalidation.error)
    return { error: 'Unable to invalidate the user session.', status: 502 as const };

  const audit = await admin
    .from('moderation_audit_log')
    .insert({
      actor_id: actorId,
      target_user_id: change.userId,
      role: change.role,
      action: change.action === 'grant' ? 'role_grant' : 'role_revoke',
    });
  if (audit.error) return { error: 'Role changed but audit logging failed.', status: 500 as const };
  return { ok: true as const };
}
