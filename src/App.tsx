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
import { DashboardPage } from './components/dashboard/DashboardPage';
import { BusinessProfilePage } from './components/dashboard/BusinessProfilePage';
import { SavedSearchesPage } from './components/dashboard/SavedSearchesPage';
import { restoreSupabaseSession, signOutFromSupabase } from './lib/supabaseAuth';

type AppRoute = '/' | '/dashboard' | '/business-profile' | '/saved-searches' | '__protected_unknown__';

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

  return '__protected_unknown__';
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPathname(window.location.pathname));

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

    const isProtectedRoute = route !== '/';
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

  const showDashboard = route === '/dashboard' && isAuthenticated;
  const showBusinessProfile = route === '/business-profile' && isAuthenticated;
  const showSavedSearches = route === '/saved-searches' && isAuthenticated;

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
          onLogout={() => {
            void handleLogout();
          }}
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

      <LoginModal open={isLoginOpen} onClose={() => setIsLoginOpen(false)} onAuthenticated={handleAuthenticated} />
    </div>
  );
}
