import { useI18n } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  onLoginClick: () => void;
  onDashboardClick?: () => void;
  showDashboardShortcut?: boolean;
}

export function Header({
  onLoginClick,
  onDashboardClick,
  showDashboardShortcut = false,
}: HeaderProps) {
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
          {showDashboardShortcut && onDashboardClick ? (
            <button
              type="button"
              onClick={onDashboardClick}
              className="inline-flex items-center rounded-lg border border-blue-300/35 bg-gradient-to-r from-blue-500/80 to-purple-600/80 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-purple-600 hover:shadow-blue-500/35"
            >
              {t('header.dashboard')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onLoginClick}
            className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            {t('header.logIn')}
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {showDashboardShortcut && onDashboardClick ? (
            <button
              type="button"
              onClick={onDashboardClick}
              className="px-4 py-2 rounded-lg border border-blue-300/35 bg-gradient-to-r from-blue-500/80 to-purple-600/80 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-purple-600 hover:shadow-blue-500/35"
            >
              {t('header.dashboard')}
            </button>
          ) : null}
          <LanguageSwitcher compact />
          <button
            type="button"
            onClick={onLoginClick}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-200 transition-colors hover:border-white/20 hover:text-white"
          >
            {t('header.logIn')}
          </button>
        </div>
      </nav>
    </header>
  );
}
