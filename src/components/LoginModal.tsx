import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
}

export function LoginModal({ open, onClose, onAuthenticated }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setMode('login');
      setEmail('');
      setPassword('');
      setStatusMessage(null);
    }
  }, [open]);

  const handleGoogleAuth = () => {
    if (mode === 'login') {
      setStatusMessage('Google login clicked. Connect this button to your OAuth flow when your backend is ready.');
      onAuthenticated?.();
      return;
    }

    setStatusMessage('Google register clicked. Connect this button to your OAuth flow when your backend is ready.');
    onAuthenticated?.();
  };

  const handleEmailAuth = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === 'login') {
      setStatusMessage(`Email login captured for ${email}. Connect this form to your auth endpoint next.`);
      onAuthenticated?.();
      return;
    }

    setStatusMessage(`Email registration captured for ${email}. Connect this form to your signup endpoint next.`);
    onAuthenticated?.();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close login form"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-[#0f1220]/90 backdrop-blur-lg p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-8"
      >
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-blue-500/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium tracking-wide text-gray-200">
            {mode === 'login' ? 'Lead Generator Login' : 'Lead Generator Register'}
          </span>
        </div>

        <div className="relative space-y-5">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {mode === 'login'
                ? 'Sign in to continue finding your next best leads.'
                : 'Register to start finding your next best leads.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <span className="inline-flex items-center gap-3">
              {mode === 'login' ? 'Continue with Google' : 'Register with Google'}
            </span>
          </button>

          <div className="relative">
            <div className="h-px bg-white/10" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f1220] px-2 text-xs uppercase tracking-widest text-gray-500">
              Or
            </span>
          </div>

          <form className="space-y-4" onSubmit={handleEmailAuth}>
            <div className="space-y-2">
              <label htmlFor="auth-email" className="text-sm text-gray-300">
                Email
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="auth-password" className="text-sm text-gray-300">
                Password
              </label>
              <input
                id="auth-password"
                name="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {mode === 'login' ? (
              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 text-gray-400">
                  <input type="checkbox" className="h-4 w-4 rounded border border-white/20 bg-white/5" />
                  Remember me
                </label>
                <a href="#" className="text-blue-300 hover:text-blue-200 transition-colors">
                  Forgot password?
                </a>
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-600 hover:to-purple-700"
            >
              {mode === 'login' ? 'Log in with Email' : 'Register with Email'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode((currentMode) => (currentMode === 'login' ? 'register' : 'login'));
              setStatusMessage(null);
            }}
            className="w-full text-sm text-gray-300 hover:text-white transition-colors"
          >
            {mode === 'login' ? 'No account yet? Register' : 'Already have an account? Log in'}
          </button>

          {statusMessage ? (
            <p className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-xs leading-relaxed text-blue-200">
              {statusMessage}
            </p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
