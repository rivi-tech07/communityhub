import { describe, expect, it, vi } from 'vitest';
import { processDeletionRequest } from '../scripts/process-deletions.mjs';

describe('account deletion worker', () => {
  it('treats a completed request as an idempotent no-op', async () => {
    const admin = {
      auth: { admin: { signOut: vi.fn(), deleteUser: vi.fn() } },
      from: vi.fn(),
    };
    const result = await processDeletionRequest(admin, {
      id: 'request-id',
      user_id: 'user-id',
      status: 'completed',
    });
    expect(result).toEqual({ status: 'completed', noop: true });
    expect(admin.auth.admin.signOut).not.toHaveBeenCalled();
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(admin.from).not.toHaveBeenCalled();
  });

  it('marks a mid-way failure and leaves the request retryable', async () => {
    const updateRequest = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const admin = {
      auth: { admin: { signOut: vi.fn().mockResolvedValue({ error: null }), deleteUser: vi.fn() } },
      from: vi.fn((table: string) => {
        if (table === 'profiles')
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: new Error('profile store unavailable') }),
            }),
          };
        if (table === 'deletion_requests') return { update: updateRequest };
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
    const result = await processDeletionRequest(admin, {
      id: 'request-id',
      user_id: 'user-id',
      status: 'processing',
    });
    expect(result.status).toBe('failed');
    expect(updateRequest).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', last_error: 'profile store unavailable' }),
    );
  });
});
