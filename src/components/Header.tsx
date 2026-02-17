import { Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  onLoginClick: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-[#0a0a0f]/80 border-b border-white/5">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
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
          <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-medium transition-all shadow-lg shadow-blue-500/20">
            {t('header.tryFree')}
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
