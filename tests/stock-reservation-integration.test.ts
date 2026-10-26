import { describe, expect, it } from 'vitest';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && serviceRoleKey);

describe.skipIf(!configured)('Task 9 stock reservation contract', () => {
  it('exposes the service-only reservation table and reconciliation view', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(url!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const reservations = await admin.from('stock_reservations').select('id').limit(0);
    const reconciliation = await admin.from('stock_reconciliation').select('product_id').limit(0);
    expect(reservations.error).toBeNull();
    expect(reconciliation.error).toBeNull();
  });
});
