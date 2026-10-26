import { describe, expect, it } from 'vitest';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && serviceRoleKey);

describe.skipIf(!configured)('Task 10 deletion worker contract', () => {
  it('exposes the queue and per-step event table', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(url!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const requests = await admin.from('deletion_requests').select('id').limit(0);
    const events = await admin.from('deletion_request_events').select('id').limit(0);
    expect(requests.error).toBeNull();
    expect(events.error).toBeNull();
  });
});
