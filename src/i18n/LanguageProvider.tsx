import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  translations,
  type AppLanguage,
  type TranslationMapKey,
} from './translations';

type TranslationParams = Record<string, string | number>;

interface I18nContextValue {
  language: AppLanguage;
  setLanguage: (nextLanguage: AppLanguage) => void;
  t: (key: string, params?: TranslationParams) => string;
  raw: <T = unknown>(key: string) => T;
  tm: (mapKey: TranslationMapKey, value: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeLanguage = (value: unknown): AppLanguage => {
  if (
    typeof value === 'string' &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  ) {
    return value as AppLanguage;
  }

  return DEFAULT_LANGUAGE;
};

const getStoredLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
};

const getNestedValue = (source: unknown, key: string): unknown => {
  if (!key) {
    return source;
  }

  return key.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[segment];
  }, source);
};

const interpolate = (template: string, params?: TranslationParams): string => {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) {
      return '';
    }

    return String(value);
  });
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => getStoredLanguage());

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(normalizeLanguage(nextLanguage));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const resolveValue = useCallback(
    (key: string): unknown => {
      const localized = getNestedValue(translations[language], key);
      if (localized !== undefined) {
        return localized;
      }

      return getNestedValue(translations[DEFAULT_LANGUAGE], key);
    },
    [language],
  );

  const raw = useCallback(
    <T,>(key: string): T => resolveValue(key) as T,
    [resolveValue],
  );

  const t = useCallback(
    (key: string, params?: TranslationParams): string => {
      const value = resolveValue(key);

      if (typeof value === 'string') {
        return interpolate(value, params);
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }

      return key;
    },
    [resolveValue],
  );

  const tm = useCallback(
    (mapKey: TranslationMapKey, value: string): string => {
      const localizedMap = raw<Record<string, string>>(`maps.${mapKey}`);
      if (localizedMap && typeof localizedMap[value] === 'string') {
        return localizedMap[value];
      }

      const fallbackMap =
        translations[DEFAULT_LANGUAGE].maps[mapKey] as unknown as Record<string, string>;
      if (fallbackMap && typeof fallbackMap[value] === 'string') {
        return fallbackMap[value];
      }

      return value;
    },
    [raw],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      raw,
      tm,
    }),
    [language, raw, setLanguage, t, tm],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider.');
  }

  return context;
};
