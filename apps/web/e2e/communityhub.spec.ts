import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const user = { email: process.env.E2E_USER_EMAIL, password: process.env.E2E_USER_PASSWORD };
const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };

async function signIn(page: Page, account: typeof user) {
  if (!account.email || !account.password) {
    throw new Error('Seeded E2E credentials are required.');
  }
  await page.goto('/login');
  await page.getByLabel('EMAIL ADDRESS').fill(account.email);
  await page.getByLabel('PASSWORD').fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('unauthenticated visitors are redirected to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('a seeded user can sign in', async ({ page }) => {
  await signIn(page, user);
  await expect(page).toHaveURL(/\/$/);
});

test('non-admin access is denied by the admin API', async ({ page, request }) => {
  await signIn(page, user);
  const cookies = await page.context().cookies();
  const response = await request.get('/api/admin/businesses', {
    headers: { Cookie: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ') },
  });
  expect(response.status()).toBe(403);
});

test('moderation queue renders for an administrator', async ({ page }) => {
  await signIn(page, admin);
  await page.goto('/admin/moderation');
  await expect(page.getByRole('heading', { name: 'Moderation queue' })).toBeVisible();
});

test('admin shell has no serious or critical axe violations', async ({ page }) => {
  await signIn(page, admin);
  await page.goto('/admin/moderation');
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);
});

test('role change shows a step-up prompt when the session is stale', async ({ page }) => {
  await signIn(page, admin);
  await page.goto('/admin/roles');
  await page.route('**/api/admin/roles', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'reauthenticate', error: 'Reauthentication required.' }),
    });
  });
  await page.getByLabel('User ID').fill('00000000-0000-0000-0000-000000000000');
  await page.getByRole('button', { name: 'Save role' }).click();
  await expect(page.getByText('Reauthenticate before changing roles.')).toBeVisible();
});

test('missing-env deployments show the neutral unavailable page', async ({ page }) => {
  test.skip(
    !process.env.E2E_MISSING_ENV_URL,
    'Set E2E_MISSING_ENV_URL to the env-stripped server.',
  );
  await page.goto(`${process.env.E2E_MISSING_ENV_URL}/login`);
  await expect(page.getByRole('heading', { name: 'Unavailable' })).toBeVisible();
  await expect(page.getByText('Development mode')).toHaveCount(0);
});
