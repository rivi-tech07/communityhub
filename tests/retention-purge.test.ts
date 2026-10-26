import { describe, expect, it, vi } from 'vitest';
import { purgeSoftDeleted } from '../scripts/purge-soft-deleted.mjs';
import { purgeSampleData } from '../scripts/purge-sample-data.mjs';

describe('retention purge safeguards', () => {
  it('reports soft-deleted content without changing rows by default', async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'posts')
          return {
            select: () => ({
              lt: vi.fn().mockResolvedValue({ data: [{ id: 'post-1' }], error: null }),
            }),
          };
        if (table === 'comments')
          return { select: () => ({ lt: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
        if (table === 'post_media')
          return {
            select: () => ({
              in: vi.fn().mockResolvedValue({ data: [{ id: 'media-1' }], error: null }),
            }),
          };
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    const result = await purgeSoftDeleted(admin, { days: 90 });
    expect(result).toMatchObject({ dry_run: true, counts: { posts: 1, comments: 0, media: 1 } });
    expect(admin.from).toHaveBeenCalledTimes(3);
  });

  it('refuses sample purge in production without the explicit force flag', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(purgeSampleData({ from: vi.fn() }, { apply: true })).rejects.toThrow(
        'force-sample-purge',
      );
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
});
