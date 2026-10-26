import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireRole, getAdminClient } = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getAdminClient: vi.fn(),
}));

vi.mock('../apps/web/app/lib/server-auth', () => ({ getAdminClient, requireRole }));

import { DELETE } from '../apps/web/app/api/admin/roles/route';
import { applyRoleChange, isSessionFresh } from '../apps/web/lib/admin-roles';

function tokenWithIssuedAt(issuedAt: number) {
  const payload = Buffer.from(JSON.stringify({ issued_at: issuedAt })).toString('base64url');
  return `header.${payload}.signature`;
}

function createAdminMock() {
  const upsertRole = vi.fn().mockResolvedValue({ error: null });
  const deleteRole = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  });
  const insertAudit = vi.fn().mockResolvedValue({ error: null });
  const admin = {
    from: vi.fn((table: string) => {
      if (table === 'user_roles') return { delete: deleteRole, upsert: upsertRole };
      if (table === 'moderation_audit_log') return { insert: insertAudit };
      throw new Error(`Unexpected table ${table}`);
    }),
    auth: { admin: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
  };
  return { admin, deleteRole, insertAudit, signOut: admin.auth.admin.signOut, upsertRole };
}

describe('admin role changes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({ user: { id: 'actor-id' } });
  });

  it('revokes a role, invalidates all target sessions, and writes an audit row', async () => {
    const mock = createAdminMock();
    getAdminClient.mockReturnValue(mock.admin);
    const issuedAt = Math.floor(Date.now() / 1000);
    const response = await DELETE(
      new Request('http://localhost/api/admin/roles', {
        method: 'DELETE',
        headers: { authorization: `Bearer ${tokenWithIssuedAt(issuedAt)}` },
        body: JSON.stringify({ userId: 'target-id', role: 'moderator' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mock.signOut).toHaveBeenCalledWith('target-id', 'global');
    expect(mock.insertAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: 'actor-id',
        target_user_id: 'target-id',
        role: 'moderator',
        action: 'role_revoke',
      }),
    );
  });

  it('rejects a stale session before changing roles', async () => {
    const mock = createAdminMock();
    getAdminClient.mockReturnValue(mock.admin);
    const now = 2_000;
    expect(isSessionFresh(now - 901, now)).toBe(false);
    expect(isSessionFresh(now - 900, now)).toBe(true);

    vi.spyOn(Date, 'now').mockReturnValue(now * 1000);
    const response = await DELETE(
      new Request('http://localhost/api/admin/roles', {
        method: 'DELETE',
        headers: { authorization: `Bearer ${tokenWithIssuedAt(now - 901)}` },
        body: JSON.stringify({ userId: 'target-id', role: 'moderator' }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'reauthenticate' });
    expect(mock.signOut).not.toHaveBeenCalled();
    expect(mock.insertAudit).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('applies a successful grant through the same server-side path', async () => {
    const mock = createAdminMock();
    const result = await applyRoleChange(mock.admin as never, 'actor-id', {
      userId: 'target-id',
      role: 'moderator',
      action: 'grant',
    });
    expect(result).toEqual({ ok: true });
  });
});
