import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { DemoSection } from './components/DemoSection';
import { ResultsSection } from './components/ResultsSection';
import { ValuePropSection } from './components/ValuePropSection';
import { PersonalLeadGeneratorSection } from './components/PersonalLeadGeneratorSection';
import { PricingSection } from './components/PricingSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { ImpressumPage } from './components/ImpressumPage';
import { DatenschutzPage } from './components/DatenschutzPage';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { LoginModal } from './components/LoginModal';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { StripeReturnPage } from './components/StripeReturnPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { BusinessProfilePage } from './components/dashboard/BusinessProfilePage';
import { SavedSearchesPage } from './components/dashboard/SavedSearchesPage';
import { BillingPage } from './components/dashboard/BillingPage';
import { AccountSettingsPage } from './components/dashboard/AccountSettingsPage';
import {
  BackendApiError,
  createCheckoutSessionInBackend,
  fetchAccountDetailsFromBackend,
} from './components/dashboard/api';
import { clearPendingCheckout, getPendingCheckout } from './lib/pendingCheckout';
import {
  getSupabaseSessionUser,
  restoreSupabaseSession,
  signOutFromSupabase,
} from './lib/supabaseAuth';

type AppRoute =
  | '/'
  | '/dashboard'
  | '/business-profile'
  | '/saved-searches'
  | '/billing'
  | '/billing/success'
  | '/billing/cancel'
  | '/billing/portal-return'
  | '/account-settings'
  | '/reset-password'
  | '/impressum'
  | '/datenschutz'
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

  if (pathname === '/billing/success') {
    return '/billing/success';
  }

  if (pathname === '/billing/cancel') {
    return '/billing/cancel';
  }

  if (pathname === '/billing/portal-return') {
    return '/billing/portal-return';
  }

  if (pathname === '/account-settings') {
    return '/account-settings';
  }

  if (pathname === '/reset-password') {
    return '/reset-password';
  }

  if (pathname === '/impressum') {
    return '/impressum';
  }

  if (pathname === '/datenschutz') {
    return '/datenschutz';
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
  const [authModalInitialView, setAuthModalInitialView] = useState<'login' | 'register'>('login');
  const [isResumingPendingCheckout, setIsResumingPendingCheckout] = useState(false);
  const [hasBillingAccess, setHasBillingAccess] = useState<boolean | null>(null);
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

      if (hasSession && getPendingCheckout()) {
        setIsResumingPendingCheckout(true);
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
    if (isAuthLoading || isAuthenticated) {
      return;
    }

    let isMounted = true;

    const refreshAuthFromStorage = async () => {
      const hasSession = await restoreSupabaseSession();
      if (!isMounted || !hasSession) {
        return;
      }

      if (getPendingCheckout()) {
        setIsResumingPendingCheckout(true);
      }
      setIsAuthenticated(true);
      setIsLoginOpen(false);
    };

    const handleFocus = () => {
      void refreshAuthFromStorage();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshAuthFromStorage();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    const pendingCheckout = getPendingCheckout();
    if (!pendingCheckout) {
      setIsResumingPendingCheckout(false);
      return;
    }

    const sessionUser = getSupabaseSessionUser();
    if (
      sessionUser?.email &&
      sessionUser.email.trim().toLowerCase() !== pendingCheckout.email
    ) {
      clearPendingCheckout();
      setIsResumingPendingCheckout(false);
      return;
    }

    let isMounted = true;
    setIsResumingPendingCheckout(true);
    setIsLoginOpen(false);

    const resumeCheckout = async () => {
      try {
        const checkout = await createCheckoutSessionInBackend(pendingCheckout.plan);
        clearPendingCheckout();
        window.location.assign(checkout.url);
        return;
      } catch (error) {
        clearPendingCheckout();
        if (
          isMounted &&
          error instanceof BackendApiError &&
          error.code === 'SUBSCRIPTION_ALREADY_ACTIVE'
        ) {
          navigate('/dashboard');
        }
      } finally {
        if (isMounted) {
          setIsResumingPendingCheckout(false);
        }
      }
    };

    void resumeCheckout();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      setHasBillingAccess(null);
      return;
    }

    let isMounted = true;

    const loadBillingAccess = async () => {
      try {
        const account = await fetchAccountDetailsFromBackend();
        if (!isMounted) {
          return;
        }

        const status = account.subscriptionStatus.toLowerCase();
        const periodEnd = account.currentPeriodEnd
          ? Date.parse(account.currentPeriodEnd)
          : Number.NaN;
        const hasFuturePeriodEnd = Number.isFinite(periodEnd) && periodEnd > Date.now();
        const canUseApp =
          status === 'active' ||
          status === 'trialing' ||
          status === 'past_due' ||
          (status === 'cancelled' && hasFuturePeriodEnd);
        setHasBillingAccess(canUseApp);
      } catch {
        if (!isMounted) {
          return;
        }
        setHasBillingAccess(null);
      }
    };

    void loadBillingAccess();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isAuthenticated, route]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (isResumingPendingCheckout) {
      return;
    }

    const isPublicRoute =
      route === '/' ||
      route === '/reset-password' ||
      route === '/billing/success' ||
      route === '/billing/cancel' ||
      route === '/billing/portal-return' ||
      route === '/impressum' ||
      route === '/datenschutz';
    const isProtectedRoute = !isPublicRoute;
    if (isProtectedRoute && !isAuthenticated) {
      setIsLoginOpen(true);
      navigate('/');
      return;
    }

    if (route === '__protected_unknown__' && isAuthenticated) {
      navigate('/dashboard');
      return;
    }

    if (
      isAuthenticated &&
      hasBillingAccess === false &&
      route !== '/billing' &&
      route !== '/billing/success' &&
      route !== '/billing/cancel' &&
      route !== '/billing/portal-return'
    ) {
      navigate('/billing');
    }
  }, [route, isAuthenticated, isAuthLoading, hasBillingAccess, isResumingPendingCheckout]);

  const openLoginModal = () => {
    setAuthModalInitialView('login');
    setIsLoginOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalInitialView('register');
    setIsLoginOpen(true);
  };

  const handleAuthenticated = () => {
    if (getPendingCheckout()) {
      setIsResumingPendingCheckout(true);
    }
    setIsAuthenticated(true);
    setIsLoginOpen(false);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await signOutFromSupabase();
    setIsAuthenticated(false);
    setIsResumingPendingCheckout(false);
    setIsLoginOpen(false);
    navigate('/');
  };

  const handleReturnToLoginFromReset = () => {
    navigate('/');
    setIsLoginOpen(true);
  };

  const hasFeatureAccess = hasBillingAccess === true;
  const showDashboard = route === '/dashboard' && isAuthenticated && hasFeatureAccess;
  const showBusinessProfile =
    route === '/business-profile' && isAuthenticated && hasFeatureAccess;
  const showSavedSearches =
    route === '/saved-searches' && isAuthenticated && hasFeatureAccess;
  const showBilling = route === '/billing' && isAuthenticated;
  const showBillingSuccess = route === '/billing/success';
  const showBillingCancel = route === '/billing/cancel';
  const showBillingPortalReturn = route === '/billing/portal-return';
  const showAccountSettings =
    route === '/account-settings' && isAuthenticated && hasFeatureAccess;
  const showResetPassword = route === '/reset-password';
  const showImpressum = route === '/impressum';
  const showDatenschutz = route === '/datenschutz';

  if (isResumingPendingCheckout && isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <div
          className="fixed inset-0"
          style={{
            background:
              'radial-gradient(circle at 18% 12%, rgba(56, 189, 248, 0.18), transparent 45%), radial-gradient(circle at 82% 88%, rgba(139, 92, 246, 0.16), transparent 44%)',
          }}
        />
      </div>
    );
  }

  if (
    isAuthenticated &&
    hasBillingAccess === null &&
    (route === '/dashboard' ||
      route === '/business-profile' ||
      route === '/saved-searches' ||
      route === '/account-settings')
  ) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <div
          className="fixed inset-0"
          style={{
            background:
              'radial-gradient(circle at 18% 12%, rgba(56, 189, 248, 0.18), transparent 45%), radial-gradient(circle at 82% 88%, rgba(139, 92, 246, 0.16), transparent 44%)',
          }}
        />
      </div>
    );
  }

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
          billingAccessStatus={hasBillingAccess}
        />
      ) : showBillingSuccess ? (
        <>
          <Header onLoginClick={openLoginModal} />
          <StripeReturnPage
            variant="success"
            isAuthenticated={isAuthenticated}
            onNavigateHome={() => navigate('/')}
            onNavigateDashboard={() => navigate('/dashboard')}
            onNavigateBilling={() => navigate('/billing')}
            onOpenLogin={openLoginModal}
          />
          <Footer
            onNavigateDatenschutz={() => navigate('/datenschutz')}
            onNavigateImpressum={() => navigate('/impressum')}
          />
        </>
      ) : showBillingCancel ? (
        <>
          <Header onLoginClick={openLoginModal} />
          <StripeReturnPage
            variant="cancel"
            isAuthenticated={isAuthenticated}
            onNavigateHome={() => navigate('/')}
            onNavigateDashboard={() => navigate('/dashboard')}
            onNavigateBilling={() => navigate('/billing')}
            onOpenLogin={openLoginModal}
          />
          <Footer
            onNavigateDatenschutz={() => navigate('/datenschutz')}
            onNavigateImpressum={() => navigate('/impressum')}
          />
        </>
      ) : showBillingPortalReturn ? (
        <>
          <Header onLoginClick={openLoginModal} />
          <StripeReturnPage
            variant="portal"
            isAuthenticated={isAuthenticated}
            onNavigateHome={() => navigate('/')}
            onNavigateDashboard={() => navigate('/dashboard')}
            onNavigateBilling={() => navigate('/billing')}
            onOpenLogin={openLoginModal}
          />
          <Footer
            onNavigateDatenschutz={() => navigate('/datenschutz')}
            onNavigateImpressum={() => navigate('/impressum')}
          />
        </>
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
      ) : showImpressum ? (
        <>
          <Header onLoginClick={openLoginModal} />
          <ImpressumPage />
          <Footer
            onNavigateDatenschutz={() => navigate('/datenschutz')}
            onNavigateImpressum={() => navigate('/impressum')}
          />
        </>
      ) : showDatenschutz ? (
        <>
          <Header onLoginClick={openLoginModal} />
          <DatenschutzPage />
          <Footer
            onNavigateDatenschutz={() => navigate('/datenschutz')}
            onNavigateImpressum={() => navigate('/impressum')}
          />
        </>
      ) : (
        <>
          <Header onLoginClick={openLoginModal} />

          <main className="relative">
            <HeroSection onStartTrial={openRegisterModal} />
            <PersonalLeadGeneratorSection />
            <DemoSection />
            <ResultsSection />
            <ValuePropSection />
            <PricingSection />
            <FAQSection />
          </main>

          <Footer
            onNavigateDatenschutz={() => navigate('/datenschutz')}
            onNavigateImpressum={() => navigate('/impressum')}
          />
        </>
      )}

      <LoginModal
        open={isLoginOpen && !showResetPassword}
        onClose={() => setIsLoginOpen(false)}
        onAuthenticated={handleAuthenticated}
        initialView={authModalInitialView}
      />
      <CookieConsentBanner onOpenDatenschutz={() => navigate('/datenschutz')} />
    </div>
  );
}
