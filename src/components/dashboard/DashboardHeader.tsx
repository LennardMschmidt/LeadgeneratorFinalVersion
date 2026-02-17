import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LanguageSwitcher } from '../LanguageSwitcher';

interface DashboardHeaderProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateBusinessProfile: () => void;
  onNavigateSavedSearches: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  onNavigateHome,
  onNavigateDashboard,
  onNavigateBusinessProfile,
  onNavigateSavedSearches,
  onLogout,
}: DashboardHeaderProps) {
  const { t } = useI18n();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownItemClass =
    'flex w-full cursor-pointer justify-center px-4 py-2.5 text-center text-sm text-gray-200 transition-all duration-150';

  const handleDropdownItemMouseEnter = (event: ReactMouseEvent<HTMLElement>) => {
    event.currentTarget.style.transform = 'scale(1.02)';
    event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
  };

  const handleDropdownItemMouseLeave = (event: ReactMouseEvent<HTMLElement>) => {
    event.currentTarget.style.transform = 'scale(1)';
    event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.025)';
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current) {
        return;
      }

      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-[#0a0a0f]/80 border-b border-white/5">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <button type="button" onClick={onNavigateHome} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold">{t('common.appName')}</span>
        </button>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onNavigateDashboard}
            className="hidden sm:flex px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-200 transition-colors"
          >
            {t('dashboardHeader.dashboard')}
          </button>

          <LanguageSwitcher compact />

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsAccountOpen((current) => !current)}
              aria-expanded={isAccountOpen}
              className="flex items-center gap-3 rounded-xl border px-5 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#e5e7eb',
              }}
            >
              {t('dashboardHeader.account')}
              <ChevronDown
                className="h-4 w-4 transition-transform duration-200"
                style={{ color: '#9ca3af', transform: isAccountOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {isAccountOpen ? (
              <div
                className="absolute right-0 z-50 mt-3 overflow-hidden rounded-xl border border-white/10 shadow-2xl"
                style={{
                  marginTop: '0.9rem',
                  width: '19rem',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(25, 25, 28, 1)',
                  WebkitBackdropFilter: 'blur(26px)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onNavigateDashboard();
                    setIsAccountOpen(false);
                  }}
                  className={`${dropdownItemClass} whitespace-nowrap px-5 py-3 text-base`}
                  onMouseEnter={handleDropdownItemMouseEnter}
                  onMouseLeave={handleDropdownItemMouseLeave}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255, 255, 255, 0.025)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
                  }}
                >
                  {t('dashboardHeader.dashboard')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigateBusinessProfile();
                    setIsAccountOpen(false);
                  }}
                  className={`${dropdownItemClass} whitespace-nowrap px-5 py-3 text-base text-gray-300`}
                  onMouseEnter={handleDropdownItemMouseEnter}
                  onMouseLeave={handleDropdownItemMouseLeave}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255, 255, 255, 0.025)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
                  }}
                >
                  {t('dashboardHeader.businessProfile')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigateSavedSearches();
                    setIsAccountOpen(false);
                  }}
                  className={`${dropdownItemClass} whitespace-nowrap px-5 py-3 text-base text-gray-300`}
                  onMouseEnter={handleDropdownItemMouseEnter}
                  onMouseLeave={handleDropdownItemMouseLeave}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255, 255, 255, 0.025)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
                  }}
                >
                  {t('dashboardHeader.savedSearches')}
                </button>

                <a
                  href="#"
                  className={`${dropdownItemClass} whitespace-nowrap px-5 py-3 text-base text-gray-300`}
                  onMouseEnter={handleDropdownItemMouseEnter}
                  onMouseLeave={handleDropdownItemMouseLeave}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255, 255, 255, 0.025)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
                  }}
                >
                  {t('dashboardHeader.billing')}
                </a>

                <a
                  href="#"
                  className={`${dropdownItemClass} whitespace-nowrap px-5 py-3 text-base text-gray-300`}
                  onMouseEnter={handleDropdownItemMouseEnter}
                  onMouseLeave={handleDropdownItemMouseLeave}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255, 255, 255, 0.025)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
                  }}
                >
                  {t('dashboardHeader.plan')}
                </a>

                <a
                  href="#"
                  className={`${dropdownItemClass} whitespace-nowrap px-5 py-3 text-base text-gray-300`}
                  onMouseEnter={handleDropdownItemMouseEnter}
                  onMouseLeave={handleDropdownItemMouseLeave}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255, 255, 255, 0.025)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
                  }}
                >
                  {t('dashboardHeader.accountSettings')}
                </a>

                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setIsAccountOpen(false);
                  }}
                  className={`${dropdownItemClass} whitespace-nowrap px-5 py-3 text-base text-gray-300`}
                  onMouseEnter={handleDropdownItemMouseEnter}
                  onMouseLeave={handleDropdownItemMouseLeave}
                  style={{ cursor: 'pointer', backgroundColor: 'rgba(255, 255, 255, 0.025)' }}
                >
                  {t('dashboardHeader.logout')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
  );
}
