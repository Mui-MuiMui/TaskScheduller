import en from './en.json';
import ja from './ja.json';

type TranslationKey = keyof typeof en;
type Translations = Record<TranslationKey, string>;

const locales: Record<string, Translations> = {
  en,
  ja,
};

let currentLocale = 'en';

export function setLocale(locale: string): void {
  currentLocale = locale in locales ? locale : 'en';
}

export function getLocale(): string {
  return currentLocale;
}

export function t(key: TranslationKey, ...args: (string | number)[]): string {
  const template = locales[currentLocale]?.[key] ?? locales['en']?.[key] ?? key;
  return template.replace(/\{(\d+)\}/g, (_, index) => String(args[parseInt(index)] ?? ''));
}

// React hook
import { useTaskStore } from '@/stores/taskStore';
import { useEffect, useState } from 'react';

export function useI18n() {
  const locale = useTaskStore((state) => state.locale);
  const [, setForceUpdate] = useState(0);

  useEffect(() => {
    setLocale(locale);
    setForceUpdate((n) => n + 1);
  }, [locale]);

  return { t, locale, setLocale };
}
