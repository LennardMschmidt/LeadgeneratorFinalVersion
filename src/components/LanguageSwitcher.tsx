import { DashboardSelect } from './dashboard/DashboardSelect';
import { SUPPORTED_LANGUAGES, useI18n, type AppLanguage } from '../i18n';

interface LanguageSwitcherProps {
  compact?: boolean;
}

const labelForLanguage = (language: AppLanguage): string => {
  if (language === 'de') {
    return 'DE';
  }

  return 'EN';
};

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useI18n();

  return (
    <DashboardSelect
      id="language-select"
      value={language}
      onValueChange={(nextLanguage) => setLanguage(nextLanguage as AppLanguage)}
      options={SUPPORTED_LANGUAGES.map((supportedLanguage) => ({
        value: supportedLanguage,
        label: labelForLanguage(supportedLanguage),
      }))}
      size={compact ? 'compact' : 'default'}
      triggerClassName="w-[96px] min-w-[96px] px-3 py-2 text-sm font-semibold uppercase"
      contentClassName="mt-5 w-[96px] min-w-[96px]"
      contentStyleOverride={{
        borderColor: 'rgba(255, 255, 255, 0.2)',
        backgroundColor: 'rgb(25, 25, 28)',
        zIndex: 9999,
      }}
      placeholder={t('common.language')}
    />
  );
}
