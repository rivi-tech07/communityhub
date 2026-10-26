import { describe, expect, it } from 'vitest';
import { MAX_PAGE_SIZE, pageParams } from '../apps/web/lib/pagination';

describe('cursor pagination contract', () => {
  it('accepts the default and maximum page sizes', () => {
    expect(pageParams('https://example.test/api/feed')).toMatchObject({ limit: 20 });
    expect(pageParams(`https://example.test/api/feed?limit=${MAX_PAGE_SIZE}`)).toMatchObject({
      limit: MAX_PAGE_SIZE,
    });
  });

  it('rejects oversized, zero, fractional, and non-numeric limits', () => {
    for (const value of ['51', '0', '1.5', 'many']) {
      expect(pageParams(`https://example.test/api/feed?limit=${value}`)).toEqual({
        error: `limit must be an integer between 1 and ${MAX_PAGE_SIZE}.`,
      });
    }
  });
});
