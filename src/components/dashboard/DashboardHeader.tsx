import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LanguageSwitcher } from '../LanguageSwitcher';

interface DashboardHeaderProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateBusinessProfile: () => void;
  onNavigateSavedSearches: () => void;
  onNavigateBilling: () => void;
  onNavigateAccountSettings: () => void;
  onLogout: () => void;
  hideAccountMenu?: boolean;
  hideDashboardButton?: boolean;
}

export function DashboardHeader({
  onNavigateHome,
  onNavigateDashboard,
  onNavigateBusinessProfile,
  onNavigateSavedSearches,
  onNavigateBilling,
  onNavigateAccountSettings,
  onLogout,
  hideAccountMenu = false,
  hideDashboardButton = false,
}: DashboardHeaderProps) {
  const { t } = useI18n();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
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
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4">
        <button type="button" onClick={onNavigateHome} className="flex min-w-0 items-center gap-2">
          <img
            src={logoSrc}
            alt="Lead Generator logo"
            className="shrink-0 rounded-lg object-cover"
            style={{ width: '2.5rem', height: '2.5rem' }}
          />
          <span className="max-w-[150px] truncate text-base font-semibold sm:max-w-none sm:text-xl">
            {t('common.appName')}
          </span>
        </button>

        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
          {!hideDashboardButton ? (
            <button
              type="button"
              onClick={onNavigateDashboard}
              className="hidden sm:flex px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-200 transition-colors"
            >
              {t('dashboardHeader.dashboard')}
            </button>
          ) : null}

          <LanguageSwitcher compact />

          {!hideAccountMenu ? (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAccountOpen((current) => !current)}
                aria-expanded={isAccountOpen}
                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:gap-3 sm:px-5 sm:py-3 sm:text-base"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#e5e7eb',
                }}
              >
                {t('dashboardHeader.account')}
                <ChevronDown
                  className="h-4 w-4 transition-transform duration-200"
                  style={{
                    color: '#9ca3af',
                    transform: isAccountOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {isAccountOpen ? (
                <div
                  className="absolute right-0 z-50 mt-3 overflow-hidden rounded-xl border border-white/10 shadow-2xl"
                  style={{
                    marginTop: '0.9rem',
                    width: 'min(19rem, calc(100vw - 1rem))',
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

                  <button
                    type="button"
                    onClick={() => {
                      onNavigateBilling();
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
                    {t('dashboardHeader.billing')}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onNavigateAccountSettings();
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
                    {t('dashboardHeader.accountSettings')}
                  </button>

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
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:gap-3 sm:px-5 sm:py-3 sm:text-base"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#e5e7eb',
              }}
            >
              {t('dashboardHeader.logout')}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
