import { describe, expect, it } from 'vitest';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && serviceRoleKey);

describe.skipIf(!configured)('Task 12 retention run audit', () => {
  it('exposes service-only retention run auditing', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(url!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await admin.from('retention_runs').select('id,job,mode,status').limit(0);
    expect(result.error).toBeNull();
  });
});
