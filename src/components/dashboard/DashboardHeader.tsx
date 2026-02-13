import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';

interface DashboardHeaderProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onLogout: () => void;
}

export function DashboardHeader({ onNavigateHome, onNavigateDashboard, onLogout }: DashboardHeaderProps) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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
          <span className="text-xl font-semibold">LeadSignal</span>
        </button>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onNavigateDashboard}
            className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-200 transition-colors"
          >
            Dashboard
          </button>

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsAccountOpen((current) => !current)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-200 transition-colors"
            >
              Account
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {isAccountOpen ? (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#10111a] shadow-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    onNavigateDashboard();
                    setIsAccountOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                >
                  Dashboard
                </button>
                <a href="#" className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                  Business Profile
                </a>
                <a href="#" className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                  Saved Searches
                </a>
                <a href="#" className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                  Billing
                </a>
                <a href="#" className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                  Plan
                </a>
                <a href="#" className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                  Account Settings
                </a>
                <div className="h-px bg-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setIsAccountOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
  );
}
