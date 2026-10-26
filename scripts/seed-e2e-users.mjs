import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey)
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const suffix = `${Date.now()}@example.test`;
const accounts = [
  { name: 'E2E_USER', email: `e2e-user-${suffix}`, password: 'e2e-user-password-123' },
  { name: 'E2E_ADMIN', email: `e2e-admin-${suffix}`, password: 'e2e-admin-password-123' },
];
const created = {};

for (const account of accounts) {
  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error(`Unable to create ${account.name}.`);
  created[account.name] = { ...account, id: data.user.id };
}

const { error: roleError } = await admin.from('user_roles').upsert({
  user_id: created.E2E_ADMIN.id,
  role: 'administrator',
});
if (roleError) throw roleError;

for (const name of ['E2E_USER', 'E2E_ADMIN']) {
  const account = created[name];
  console.log(`${name}_EMAIL=${account.email}`);
  console.log(`${name}_PASSWORD=${account.password}`);
}
