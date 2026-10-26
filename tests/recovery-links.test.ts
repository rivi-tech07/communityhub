import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appConfig = JSON.parse(readFileSync('apps/mobile/app.json', 'utf8')) as {
  expo: {
    scheme: string;
    ios: { associatedDomains: string[] };
    android: {
      intentFilters: Array<{ autoVerify?: boolean; data?: Array<{ pathPrefix?: string }> }>;
    };
  };
};

describe('password recovery links', () => {
  it('claims the reset-password path on both mobile platforms', () => {
    expect(appConfig.expo.scheme).toBe('communityhub');
    expect(appConfig.expo.ios.associatedDomains).toContain(
      'applinks:communityhub-lyart.vercel.app',
    );
    expect(
      appConfig.expo.android.intentFilters.some(
        (filter) =>
          filter.autoVerify && filter.data?.some((entry) => entry.pathPrefix === '/reset-password'),
      ),
    ).toBe(true);
  });

  it('keeps the web fallback metadata and reset page present', () => {
    const apple = JSON.parse(
      readFileSync('apps/web/public/.well-known/apple-app-site-association', 'utf8'),
    ) as { applinks?: { details?: unknown[] } };
    const android = JSON.parse(
      readFileSync('apps/web/public/.well-known/assetlinks.json', 'utf8'),
    ) as Array<{ target?: { package_name?: string } }>;

    expect(apple.applinks?.details).toHaveLength(1);
    expect(android[0]?.target?.package_name).toBe('com.communityhub.app');
    expect(readFileSync('apps/web/app/reset-password/page.tsx', 'utf8')).toContain(
      'Password updated',
    );
  });
});
