import { describe, expect, it, vi } from 'vitest';
import { exportUserData } from '../scripts/export-user-data.mjs';

function query(data: unknown[]) {
  return { select: () => ({ eq: () => Promise.resolve({ data, error: null }) }) };
}

describe('user data export', () => {
  it('exports requested records and does not delete or modify data', async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'profiles')
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'user-1' }, error: null }),
              }),
            }),
          };
        if (table === 'order_items')
          return {
            select: () => ({
              in: () => Promise.resolve({ data: [{ id: 'item-1' }], error: null }),
            }),
          };
        return query([{ id: `${table}-1` }]);
      }),
    };
    const result = await exportUserData(admin, 'user-1');
    expect(result.profile).toEqual({ id: 'user-1' });
    expect(result.posts).toHaveLength(1);
    expect(result.uploads_manifest.cvs).toHaveLength(1);
    expect(admin.from).not.toHaveBeenCalledWith('deletion_requests');
  });
});
