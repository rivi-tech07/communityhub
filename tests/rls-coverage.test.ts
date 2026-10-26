import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && serviceRoleKey);

if (!enabled) {
  console.info(
    'Skipping RLS coverage integration test: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to a disposable Supabase project.',
  );
}

(enabled ? describe : describe.skip)('CommunityHub RLS coverage', () => {
  it('has RLS enabled on every non-allowlisted public table', async () => {
    const admin = createClient(url!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc('check_public_rls_coverage');
    expect(error).toBeNull();
    expect(data).toMatchObject({ missing_rls: [] });
  });
});
