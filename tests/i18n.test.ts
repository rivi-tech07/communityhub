import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogs, createTranslator, LOCALES, resolveLocale } from '../packages/shared/i18n';

describe('shared i18n catalogs', () => {
  it('keeps every translation key present in both locales', () => {
    const englishKeys = Object.keys(catalogs['en-GB']).sort();
    const gujaratiKeys = Object.keys(catalogs.gu).sort();

    expect(gujaratiKeys).toEqual(englishKeys);
    for (const locale of LOCALES) {
      for (const key of englishKeys) {
        expect(catalogs[locale][key as keyof (typeof catalogs)['en-GB']]).not.toBe('');
      }
    }
  });

  it('resolves profile language and supports an explicit translator override', () => {
    expect(resolveLocale('gu-IN')).toBe('gu');
    expect(resolveLocale('en-GB')).toBe('en-GB');
    expect(createTranslator('gu')('home.homeTab')).toBe(catalogs.gu['home.homeTab']);
  });

  it('does not retain migrated auth and home-shell copy in the mobile screen', () => {
    const source = readFileSync(resolve(process.cwd(), 'apps/mobile/App.tsx'), 'utf8');
    const migratedCopy = [
      "'Join your community'",
      "'Welcome back'",
      "'Use a verified identity to keep the community safe.'",
      "'Phone / SMS'",
      "'Your local community'",
      "'Local marketplace'",
      "'Opportunities nearby'",
      "'Share with your community'",
      "'Your account'",
      "'Save profile'",
      "'Delete account'",
    ];

    for (const literal of migratedCopy) expect(source).not.toContain(literal);
  });
});
