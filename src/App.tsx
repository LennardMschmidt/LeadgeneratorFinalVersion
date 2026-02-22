import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { DemoSection } from './components/DemoSection';
import { ResultsSection } from './components/ResultsSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { ValuePropSection } from './components/ValuePropSection';
import { PricingSection } from './components/PricingSection';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { BusinessProfilePage } from './components/dashboard/BusinessProfilePage';
import { SavedSearchesPage } from './components/dashboard/SavedSearchesPage';
import { BillingPage } from './components/dashboard/BillingPage';
import { AccountSettingsPage } from './components/dashboard/AccountSettingsPage';
import { restoreSupabaseSession, signOutFromSupabase } from './lib/supabaseAuth';

type AppRoute =
  | '/'
  | '/dashboard'
  | '/business-profile'
  | '/saved-searches'
  | '/billing'
  | '/account-settings'
  | '/reset-password'
  | '__protected_unknown__';

const getRouteFromPathname = (pathname: string): AppRoute => {
  if (pathname === '/') {
    return '/';
  }

  if (pathname === '/dashboard') {
    return '/dashboard';
  }

  if (pathname === '/business-profile') {
    return '/business-profile';
  }

  if (pathname === '/saved-searches') {
    return '/saved-searches';
  }

  if (pathname === '/billing') {
    return '/billing';
  }

  if (pathname === '/account-settings') {
    return '/account-settings';
  }

  if (pathname === '/reset-password') {
    return '/reset-password';
  }

  return '__protected_unknown__';
};

const normalizeRecoveryRouteFromHash = (): string => {
  if (typeof window === 'undefined') {
    return '/';
  }

  const pathname = window.location.pathname;
  if (pathname !== '/') {
    return pathname;
  }

  const hashRaw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hashRaw);
  const recoveryType = hashParams.get('type');
  const hasAccessToken = typeof hashParams.get('access_token') === 'string';
  const hasRefreshToken = typeof hashParams.get('refresh_token') === 'string';

  if (recoveryType === 'recovery' && hasAccessToken && hasRefreshToken) {
    window.history.replaceState(
      {},
      '',
      `/reset-password${window.location.search}${window.location.hash}`,
    );
    return '/reset-password';
  }

  return pathname;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [route, setRoute] = useState<AppRoute>(() =>
    getRouteFromPathname(normalizeRecoveryRouteFromHash()),
  );

  useEffect(() => {
    let isMounted = true;

    const loadAuthState = async () => {
      const hasSession = await restoreSupabaseSession();
      if (!isMounted) {
        return;
      }

      setIsAuthenticated(hasSession);
      setIsAuthLoading(false);
    };

    void loadAuthState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromPathname(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (nextRoute: AppRoute) => {
    if (window.location.pathname !== nextRoute) {
      window.history.pushState({}, '', nextRoute);
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const isProtectedRoute = route !== '/' && route !== '/reset-password';
    if (isProtectedRoute && !isAuthenticated) {
      setIsLoginOpen(true);
      navigate('/');
      return;
    }

    if (route === '__protected_unknown__' && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [route, isAuthenticated, isAuthLoading]);

  const openLoginModal = () => {
    setIsLoginOpen(true);
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    setIsLoginOpen(false);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await signOutFromSupabase();
    setIsAuthenticated(false);
    setIsLoginOpen(false);
    navigate('/');
  };

  const handleReturnToLoginFromReset = () => {
    navigate('/');
    setIsLoginOpen(true);
  };

  const showDashboard = route === '/dashboard' && isAuthenticated;
  const showBusinessProfile = route === '/business-profile' && isAuthenticated;
  const showSavedSearches = route === '/saved-searches' && isAuthenticated;
  const showBilling = route === '/billing' && isAuthenticated;
  const showAccountSettings = route === '/account-settings' && isAuthenticated;
  const showResetPassword = route === '/reset-password';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background texture */}
      <div 
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {isAuthLoading ? null : showDashboard ? (
        <DashboardPage
          onNavigateHome={() => navigate('/')}
          onNavigateDashboard={() => navigate('/dashboard')}
          onNavigateBusinessProfile={() => navigate('/business-profile')}
          onNavigateSavedSearches={() => navigate('/saved-searches')}
          onNavigateBilling={() => navigate('/billing')}
          onNavigateAccountSettings={() => navigate('/account-settings')}
          onLogout={() => {
            void handleLogout();
          }}
        />
      ) : showBusinessProfile ? (
        <BusinessProfilePage
          onNavigateHome={() => navigate('/')}
          onNavigateDashboard={() => navigate('/dashboard')}
          onNavigateBusinessProfile={() => navigate('/business-profile')}
          onNavigateSavedSearches={() => navigate('/saved-searches')}
          onNavigateBilling={() => navigate('/billing')}
          onNavigateAccountSettings={() => navigate('/account-settings')}
          onLogout={() => {
            void handleLogout();
          }}
        />
      ) : showSavedSearches ? (
        <SavedSearchesPage
          onNavigateHome={() => navigate('/')}
          onNavigateDashboard={() => navigate('/dashboard')}
          onNavigateBusinessProfile={() => navigate('/business-profile')}
          onNavigateSavedSearches={() => navigate('/saved-searches')}
          onNavigateBilling={() => navigate('/billing')}
          onNavigateAccountSettings={() => navigate('/account-settings')}
          onLogout={() => {
            void handleLogout();
          }}
        />
      ) : showBilling ? (
        <BillingPage
          onNavigateHome={() => navigate('/')}
          onNavigateDashboard={() => navigate('/dashboard')}
          onNavigateBusinessProfile={() => navigate('/business-profile')}
          onNavigateSavedSearches={() => navigate('/saved-searches')}
          onNavigateBilling={() => navigate('/billing')}
          onNavigateAccountSettings={() => navigate('/account-settings')}
          onLogout={() => {
            void handleLogout();
          }}
        />
      ) : showAccountSettings ? (
        <AccountSettingsPage
          onNavigateHome={() => navigate('/')}
          onNavigateDashboard={() => navigate('/dashboard')}
          onNavigateBusinessProfile={() => navigate('/business-profile')}
          onNavigateSavedSearches={() => navigate('/saved-searches')}
          onNavigateBilling={() => navigate('/billing')}
          onNavigateAccountSettings={() => navigate('/account-settings')}
          onLogout={() => {
            void handleLogout();
          }}
        />
      ) : showResetPassword ? (
        <ResetPasswordPage
          onBackHome={() => navigate('/')}
          onBackToLogin={handleReturnToLoginFromReset}
        />
      ) : (
        <>
          <Header onLoginClick={openLoginModal} />

          <main className="relative">
            <HeroSection />
            <DemoSection />
            <ResultsSection />
            <HowItWorksSection />
            <ValuePropSection />
            <PricingSection />
          </main>

          <Footer />
        </>
      )}

      <LoginModal
        open={isLoginOpen && !showResetPassword}
        onClose={() => setIsLoginOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}
