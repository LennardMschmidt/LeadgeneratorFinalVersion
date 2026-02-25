import { useI18n } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  onLoginClick: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
  const { t } = useI18n();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-[#0a0a0f]/80 border-b border-white/5">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={logoSrc}
            alt="Lead Generator logo"
            className="shrink-0 rounded-lg object-cover"
            style={{ width: '2.5rem', height: '2.5rem' }}
          />
          <span className="text-xl font-semibold">{t('common.appName')}</span>
        </div>

        <div className="hidden md:flex items-center gap-4 lg:gap-8">
          <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">
            {t('header.howItWorks')}
          </a>
          <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
            {t('header.pricing')}
          </a>
          <button
            type="button"
            onClick={onLoginClick}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {t('header.logIn')}
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher compact />
          <button
            type="button"
            onClick={onLoginClick}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-colors"
          >
            {t('header.logIn')}
          </button>
        </div>
      </nav>
    </header>
  );
}
