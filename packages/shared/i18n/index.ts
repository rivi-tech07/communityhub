import enGB from './en-GB.json';
import gu from './gu.json';

export const LOCALES = ['en-GB', 'gu'] as const;
export type Locale = (typeof LOCALES)[number];
export type I18nKey = keyof typeof enGB;
export type TranslationValues = Record<string, string | number>;
export type Translator = (key: I18nKey, values?: TranslationValues) => string;

export const catalogs = { 'en-GB': enGB, gu } as const;

export function resolveLocale(value: string | null | undefined): Locale {
  return value?.toLowerCase().startsWith('gu') ? 'gu' : 'en-GB';
}

export function createTranslator(locale: Locale): Translator {
  return (key, values = {}) => {
    const value = catalogs[locale][key] ?? catalogs['en-GB'][key];
    return value.replace(/{{(\w+)}}/g, (_, name: string) => String(values[name] ?? ''));
  };
}
