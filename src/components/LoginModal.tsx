import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { ArrowLeft, Check, Mail, X } from 'lucide-react';
import { useI18n } from '../i18n';
import {
  isSupabaseAuthConfigured,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../lib/supabaseAuth';
import {
  clearPendingCheckout,
  savePendingCheckout,
} from '../lib/pendingCheckout';
import { toFriendlyErrorMessage } from '../lib/errorMessaging';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { AppAlertToast } from './ui/AppAlertToast';
import {
  BillingPlan,
  createCheckoutSessionInBackend,
  fetchPublicBillingPlansFromBackend,
} from './dashboard/api';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
  initialView?: 'login' | 'register';
}

type AuthView = 'login' | 'register' | 'forgot-password';
type BillingPlanCode = 'STANDARD' | 'PRO' | 'EXPERT';
type RegisterStep = 1 | 2;

const FALLBACK_PLANS: BillingPlan[] = [
  {
    code: 'STANDARD',
    name: 'Standard',
    dailyTokenLimit: 180,
    aiTokensPerMonth: 200,
    tokenCosts: { google_maps_search: 1, linkedin_search: 3, website_analysis: 1 },
  },
  {
    code: 'PRO',
    name: 'Pro',
    dailyTokenLimit: 380,
    aiTokensPerMonth: 500,
    tokenCosts: { google_maps_search: 1, linkedin_search: 3, website_analysis: 1 },
  },
  {
    code: 'EXPERT',
    name: 'Expert',
    dailyTokenLimit: 700,
    aiTokensPerMonth: 1200,
    tokenCosts: { google_maps_search: 1, linkedin_search: 3, website_analysis: 1 },
  },
];

type PlanVisual = {
  price: string;
  period: string;
  description: string;
  cta: string;
  badge?: string;
  features: string[];
};

const PLAN_VISUALS_EN: Record<
  BillingPlanCode,
  PlanVisual
> = {
  STANDARD: {
    price: '€39',
    period: '/per month',
    description: 'Perfect to start local outreach with Google Maps and website checks.',
    cta: 'Choose Standard',
    features: [
      '180 search tokens/day',
      'AI evaluations not included',
      'Google Maps lead search',
      'Website analysis',
      'Save qualified leads and export them',
    ],
  },
  PRO: {
    price: '€59',
    period: '/per month',
    description:
      'Includes AI Website Analysis and direct AI suggestions, plus LinkedIn profile discovery for smarter outreach.',
    cta: 'Switch to Pro',
    badge: 'MOST POPULAR',
    features: [
      '380 search tokens/day',
      '500 AI evaluation tokens/month',
      'Google Maps lead search',
      'LinkedIn profile discovery',
      'Website analysis',
      'AI website summary',
      'AI contact suggestions (email, LinkedIn, phone)',
      'Save qualified leads and export them',
    ],
  },
  EXPERT: {
    price: '€89',
    period: '/per month',
    description: 'Maximum volume with AI Website Analysis and direct AI suggestions at scale.',
    cta: 'Upgrade to Expert',
    badge: 'BEST VALUE',
    features: [
      '700 search tokens/day',
      '1200 AI evaluation tokens/month',
      'Google Maps lead search',
      'LinkedIn profile discovery',
      'Website analysis',
      'AI website summary',
      'AI contact suggestions (email, LinkedIn, phone)',
      'Save qualified leads and export them',
    ],
  },
};

const PLAN_VISUALS_DE: Record<
  BillingPlanCode,
  PlanVisual
> = {
  STANDARD: {
    price: '€39',
    period: '/pro Monat',
    description: 'Perfekt für den Start mit lokaler Akquise über Google Maps und Website-Checks.',
    cta: 'Standard wählen',
    features: [
      '180 Such-Tokens/Tag',
      'Keine KI-Auswertungen enthalten',
      'Google-Maps-Lead-Suche',
      'Website-Analyse',
      'Qualifizierte Leads speichern und exportieren',
    ],
  },
  PRO: {
    price: '€59',
    period: '/pro Monat',
    description:
      'Enthält KI-Website-Analyse und direkte KI-Vorschläge sowie LinkedIn-Profilsuche für smartere Akquise.',
    cta: 'Zu Pro wechseln',
    badge: 'BELIEBTESTER TARIF',
    features: [
      '380 Such-Tokens/Tag',
      '500 KI-Auswertungs-Tokens/Monat',
      'Google-Maps-Lead-Suche',
      'LinkedIn-Profilsuche',
      'Website-Analyse',
      'KI-Website-Zusammenfassung',
      'KI-Kontaktvorschläge (E-Mail, LinkedIn, Telefon)',
      'Qualifizierte Leads speichern und exportieren',
    ],
  },
  EXPERT: {
    price: '€89',
    period: '/pro Monat',
    description: 'Maximales Volumen mit KI-Website-Analyse und direkten KI-Vorschlägen im großen Maßstab.',
    cta: 'Auf Expert upgraden',
    badge: 'BESTER WERT',
    features: [
      '700 Such-Tokens/Tag',
      '1200 KI-Auswertungs-Tokens/Monat',
      'Google-Maps-Lead-Suche',
      'LinkedIn-Profilsuche',
      'Website-Analyse',
      'KI-Website-Zusammenfassung',
      'KI-Kontaktvorschläge (E-Mail, LinkedIn, Telefon)',
      'Qualifizierte Leads speichern und exportieren',
    ],
  },
};

const getPasswordStrength = (value: string): { label: string; color: string; width: string } => {
  if (!value) {
    return { label: '', color: '', width: '0%' };
  }

  let strength = 0;
  if (value.length >= 8) strength++;
  if (value.length >= 12) strength++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength++;
  if (/\d/.test(value)) strength++;
  if (/[^a-zA-Z0-9]/.test(value)) strength++;

  if (strength <= 1) {
    return { label: 'Weak', color: 'rgb(244, 63, 94)', width: '25%' };
  }
  if (strength === 2) {
    return { label: 'Okay', color: 'rgb(251, 146, 60)', width: '50%' };
  }
  if (strength === 3) {
    return { label: 'Strong', color: 'rgb(59, 130, 246)', width: '75%' };
  }
  return { label: 'Very strong', color: 'rgb(16, 185, 129)', width: '100%' };
};

const EMAIL_REGEX = /.+@.+\..+/;
const REGISTER_SIGNUP_RETRY_MESSAGE =
  'Could not create account with these details. Please review and try again.';
const REGISTER_SIGNUP_FAILED_MESSAGE =
  'Could not create account right now. Please check your details and try again.';

const isExistingAccountError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('user already') ||
    normalized.includes('email already')
  );
};

const getAuthFailureMessage = (result: unknown): string => {
  if (
    result &&
    typeof result === 'object' &&
    'message' in result &&
    typeof (result as { message?: unknown }).message === 'string' &&
    (result as { message: string }).message.trim().length > 0
  ) {
    return (result as { message: string }).message;
  }
  return 'Authentication failed. Please try again.';
};

export function LoginModal({
  open,
  onClose,
  onAuthenticated,
  initialView = 'login',
}: LoginModalProps) {
  const { t, language } = useI18n();

  const [view, setView] = useState<AuthView>('login');
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [selectedPlan, setSelectedPlan] = useState<BillingPlanCode | null>('PRO');
  const [availablePlans, setAvailablePlans] = useState<BillingPlan[]>(FALLBACK_PLANS);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailConfirmationNotice, setEmailConfirmationNotice] = useState<{ email: string } | null>(null);

  const clearExistingAccountInlineError = () => {
    setInlineErrors((current) => {
      if (current.confirmPassword !== REGISTER_SIGNUP_RETRY_MESSAGE) {
        return current;
      }

      const { confirmPassword: _unused, ...rest } = current;
      return rest;
    });
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    setView(initialView);
    setRegisterStep(1);
    setStatusMessage(null);
    setInlineErrors({});
    setEmailConfirmationNotice(null);

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
  }, [open, onClose, initialView]);

  useEffect(() => {
    if (open) {
      return;
    }

    setView('login');
    setRegisterStep(1);

    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');

    setSelectedPlan('PRO');
    setAvailablePlans(FALLBACK_PLANS);

    setStatusMessage(null);
    setInlineErrors({});
    setIsSubmitting(false);
    setEmailConfirmationNotice(null);
  }, [open]);

  useEffect(() => {
    if (!open || view !== 'register') {
      return;
    }

    let cancelled = false;

    const loadPlans = async () => {
      try {
        const plans = await fetchPublicBillingPlansFromBackend();
        if (!cancelled && plans.length > 0) {
          setAvailablePlans(plans);
        }
      } catch {
        if (!cancelled) {
          setAvailablePlans(FALLBACK_PLANS);
        }
      }
    };

    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, [open, view]);

  const orderedPlans = useMemo(() => {
    const order: BillingPlanCode[] = ['STANDARD', 'PRO', 'EXPERT'];
    return [...availablePlans].sort(
      (a, b) => order.indexOf(a.code as BillingPlanCode) - order.indexOf(b.code as BillingPlanCode),
    );
  }, [availablePlans]);

  const localizedPlanVisuals = useMemo<Record<BillingPlanCode, PlanVisual>>(
    () => (language === 'de' ? PLAN_VISUALS_DE : PLAN_VISUALS_EN),
    [language],
  );

  useEffect(() => {
    const codes = orderedPlans.map((plan) => plan.code as BillingPlanCode);
    if (codes.length === 0) {
      return;
    }

    if (selectedPlan !== null && !codes.includes(selectedPlan)) {
      setSelectedPlan(codes.includes('PRO') ? 'PRO' : codes[0]);
    }
  }, [orderedPlans, selectedPlan]);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const stepOneBlockingMessage = useMemo(() => {
    if (fullName.trim().length < 2) {
      return 'Please enter your name.';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (password.length === 0) {
      return 'Please enter a password.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (passwordStrength.label === 'Weak') {
      return 'Password is too weak. Use uppercase, number, or symbol.';
    }
    if (confirmPassword.length === 0) {
      return 'Please confirm your password.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }

    return null;
  }, [confirmPassword, email, fullName, password, passwordStrength.label]);

  const hasExistingAccountInlineError =
    inlineErrors.confirmPassword === REGISTER_SIGNUP_RETRY_MESSAGE;

  const stepOneValid = stepOneBlockingMessage === null && !hasExistingAccountInlineError;

  const stepTwoValid = selectedPlan !== null;

  const validateStepOne = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (fullName.trim().length < 2) {
      nextErrors.fullName = 'Please enter your name.';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (password.length === 0) {
      nextErrors.password = 'Please enter a password.';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    } else if (passwordStrength.label === 'Weak') {
      nextErrors.password = 'Password is too weak. Use uppercase, number, or symbol.';
    }
    if (confirmPassword.length === 0) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setInlineErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const stepOneDisabledMessage = useMemo(() => {
    if (registerStep !== 1) {
      return null;
    }

    if (hasExistingAccountInlineError) {
      return inlineErrors.confirmPassword;
    }

    if (stepOneValid) {
      return null;
    }

    return (
      inlineErrors.confirmPassword ||
      inlineErrors.password ||
      inlineErrors.email ||
      inlineErrors.fullName ||
      stepOneBlockingMessage
    );
  }, [hasExistingAccountInlineError, inlineErrors, registerStep, stepOneBlockingMessage, stepOneValid]);

  const handleGoogleLogin = async () => {
    if (isSubmitting) {
      return;
    }

    if (!isSupabaseAuthConfigured()) {
      setStatusMessage(t('login.authNotConfigured'));
      return;
    }

    if (view !== 'login') {
      setStatusMessage('Use email signup to complete onboarding and subscription setup.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const result = await signInWithGoogle('/dashboard');
    if (!result.ok) {
      setStatusMessage(toFriendlyErrorMessage(getAuthFailureMessage(result)));
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }

    if (!isSupabaseAuthConfigured()) {
      setStatusMessage(t('login.authNotConfigured'));
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const result = await signInWithEmail(email.trim(), password);
      if (!result.ok) {
        setStatusMessage(toFriendlyErrorMessage(getAuthFailureMessage(result)));
        return;
      }

      onAuthenticated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeRegistration = async () => {
    if (!selectedPlan) {
      setStatusMessage('Please choose a plan before you continue.');
      return;
    }

    if (!isSupabaseAuthConfigured()) {
      setStatusMessage(t('login.authNotConfigured'));
      return;
    }

    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const result = await signUpWithEmail(email.trim(), password, {
        name: fullName.trim(),
        redirectPath: '/dashboard',
      });

      if (!result.ok) {
        const failureMessage = getAuthFailureMessage(result);

        if (isExistingAccountError(failureMessage)) {
          setRegisterStep(1);
          setStatusMessage(null);
          setInlineErrors((current) => ({
            ...current,
            confirmPassword: REGISTER_SIGNUP_RETRY_MESSAGE,
          }));
          return;
        }

        setStatusMessage(
          toFriendlyErrorMessage(failureMessage, REGISTER_SIGNUP_FAILED_MESSAGE),
        );
        return;
      }

      if (result.requiresEmailConfirmation) {
        savePendingCheckout({
          plan: selectedPlan,
          email: email.trim(),
        });
        setEmailConfirmationNotice({ email: email.trim() });
        setStatusMessage(null);
        setInlineErrors({});
        return;
      }

      clearPendingCheckout();
      const checkout = await createCheckoutSessionInBackend(selectedPlan);
      window.location.assign(checkout.url);
    } catch (error) {
      if (error instanceof Error) {
        setStatusMessage(toFriendlyErrorMessage(error.message));
      } else {
        setStatusMessage(toFriendlyErrorMessage(t('login.checkoutFailed')));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterContinue = async () => {
    if (isSubmitting) {
      return;
    }

    setStatusMessage(null);

    if (registerStep === 1) {
      if (!validateStepOne()) {
        return;
      }
      setRegisterStep(2);
      setInlineErrors({});
      return;
    }

    await completeRegistration();
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (view === 'login') {
      await handleLogin();
      return;
    }

    await handleRegisterContinue();
  };

  const inputClassName =
    'w-full rounded-xl border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/35 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
  const fieldHeightStyle = { height: 'calc(var(--spacing) * 11)' };
  const fieldWrapperStyle = { marginBottom: '20px' };
  const fieldLabelStyle = { display: 'block', marginBottom: '8px' };
  const errorTextStyle = { color: 'rgb(251, 113, 133)' };
  const gradientTextLinkStyle = {
    backgroundImage: 'linear-gradient(90deg, #ffffff 0%, #a855f7 100%)',
    backgroundClip: 'text' as const,
    WebkitBackgroundClip: 'text' as const,
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0"
            onClick={() => {
              if (view === 'forgot-password') {
                return;
              }
              onClose();
            }}
            style={{
              zIndex: 9998,
              background: 'rgba(2, 6, 23, 0.72)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          />

          <div
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: 9999, pointerEvents: 'none' }}
          >
            <AnimatePresence mode="wait">
              {view === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(event) => event.stopPropagation()}
                  className="relative w-full max-w-md"
                  style={{ pointerEvents: 'auto' }}
                >
                  <div
                    className="absolute -left-20 -top-20 h-40 w-40 rounded-full opacity-20 blur-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgb(59, 130, 246), transparent)' }}
                  />
                  <div
                    className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full opacity-20 blur-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgb(34, 211, 238), transparent)' }}
                  />

                  <div
                    className="auth-modal-scroll relative rounded-3xl border p-8"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      maxHeight: '92vh',
                      overflowY: 'auto',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={t('login.close')}
                      className="absolute z-10 text-gray-400 transition-colors hover:text-white"
                      style={{ right: '1.25rem', top: '1.25rem' }}
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <div className="mb-8">
                      <h2 className="mb-2 text-2xl text-white">Welcome back</h2>
                      <p className="text-gray-400">Sign in to your account</p>
                    </div>

                    <form onSubmit={handleFormSubmit}>
                      <div style={fieldWrapperStyle}>
                        <label htmlFor="auth-email" className="text-gray-300" style={fieldLabelStyle}>
                          {t('login.email')}
                        </label>
                        <input
                          id="auth-email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder={t('login.emailPlaceholder')}
                          className={inputClassName}
                          style={fieldHeightStyle}
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <div style={fieldWrapperStyle}>
                        <label htmlFor="auth-password" className="text-gray-300" style={fieldLabelStyle}>
                          {t('login.password')}
                        </label>
                        <input
                          id="auth-password"
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder={t('login.loginPasswordPlaceholder')}
                          className={inputClassName}
                          style={fieldHeightStyle}
                          required
                          minLength={8}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="flex items-center justify-end" style={fieldWrapperStyle}>
                        <button
                          type="button"
                          onClick={() => {
                            setView('forgot-password');
                            setStatusMessage(null);
                            setInlineErrors({});
                          }}
                          disabled={isSubmitting}
                          className="text-sm transition-opacity hover:opacity-85"
                          style={gradientTextLinkStyle}
                        >
                          {t('login.forgotPassword')}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !email.trim() || !password}
                        className="w-full rounded-xl transition disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                          ...fieldHeightStyle,
                          marginBottom: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          color: '#ffffff',
                          fontWeight: 500,
                          background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(168, 85, 247))',
                        }}
                      >
                        <Mail className="h-4 w-4" />
                        <span>{isSubmitting ? t('login.authenticating') : t('login.loginWithEmail') || 'Log in with Email'}</span>
                      </button>

                      {/* Google login is intentionally disabled for now.
                      <div className="relative" style={fieldWrapperStyle}>
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-[rgba(255,255,255,0.03)] px-2 text-gray-500">OR</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          void handleGoogleLogin();
                        }}
                        disabled={isSubmitting}
                        className="h-12 w-full rounded-xl border border-white/15 bg-[rgba(255,255,255,0.03)] text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="inline-flex items-center justify-center">
                          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          {t('login.continueWithGoogle')}
                        </span>
                      </button>
                      */}
                    </form>

                    <div className="mt-6 text-center">
                      <span className="text-sm text-gray-400">No account yet? </span>
                      <button
                        type="button"
                        onClick={() => {
                          setView('register');
                          setRegisterStep(1);
                          setStatusMessage(null);
                          setInlineErrors({});
                        }}
                        disabled={isSubmitting}
                        className="text-sm transition-opacity hover:opacity-85 disabled:opacity-60"
                        style={gradientTextLinkStyle}
                      >
                        Register
                      </button>
                    </div>

                  </div>
                </motion.div>
              ) : view === 'register' ? (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(event) => event.stopPropagation()}
                  className="relative w-full"
                  style={{
                    pointerEvents: 'auto',
                    height: 'min(92vh, 860px)',
                    maxWidth: '1000px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                >
                  <div
                    className="absolute -left-24 -top-24 h-48 w-48 rounded-full opacity-20 blur-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgb(59, 130, 246), transparent)' }}
                  />
                  <div
                    className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full opacity-20 blur-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgb(34, 211, 238), transparent)' }}
                  />

                  <div
                    className="auth-modal-scroll relative rounded-3xl border p-6 sm:p-8"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      height: '100%',
                      overflowY: 'auto',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={t('login.close')}
                      className="absolute z-10 text-gray-400 transition-colors hover:text-white"
                      style={{ right: '1.25rem', top: '1.25rem' }}
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <div className="mb-6">
                      <h2 className="mb-2 text-2xl text-white">Create your account</h2>
                      <p className="text-gray-400">Get started with Lead Generator</p>
                    </div>

                    <div className="mb-8">
                      <div className="mb-3 flex items-center">
                        {([1, 2] as RegisterStep[]).map((step) => (
                          <div
                            key={step}
                            className="flex items-center"
                            style={{ flex: step < 2 ? 1 : '0 0 auto' }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                                  registerStep >= step ? 'text-white' : 'text-gray-500'
                                }`}
                                style={{
                                  background:
                                    registerStep >= step
                                      ? 'linear-gradient(135deg, rgb(59, 130, 246), rgb(168, 85, 247))'
                                      : 'rgba(255, 255, 255, 0.05)',
                                  border: registerStep >= step ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                                }}
                              >
                                {registerStep > step ? <Check className="h-4 w-4" /> : <span className="text-sm">{step}</span>}
                              </div>
                              <span
                                className={`hidden text-sm sm:inline ${
                                  registerStep >= step ? 'text-gray-300' : 'text-gray-500'
                                }`}
                              >
                                {step === 1 ? 'Account' : 'Plan'}
                              </span>
                            </div>
                            {step < 2 ? (
                              <div
                                style={{
                                  flex: 1,
                                  height: '2px',
                                  marginLeft: '0.5rem',
                                  marginRight: '0.5rem',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  borderRadius: '999px',
                                  overflow: 'hidden',
                                }}
                              >
                                <motion.div
                                  initial={{ width: '0%' }}
                                  animate={{ width: registerStep > step ? '100%' : '0%' }}
                                  transition={{ duration: 0.3 }}
                                  style={{
                                    height: '100%',
                                    display: 'block',
                                    background:
                                      'linear-gradient(90deg, rgb(59, 130, 246), rgb(34, 211, 238), rgb(16, 185, 129))',
                                  }}
                                />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleFormSubmit}>
                      <AnimatePresence mode="wait" initial={false}>
                        {registerStep === 1 ? (
                          <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-0"
                          >
                            <div style={fieldWrapperStyle}>
                              <label htmlFor="register-name" className="text-gray-300" style={fieldLabelStyle}>
                                Name
                              </label>
                              <input
                                id="register-name"
                                type="text"
                                value={fullName}
                                onChange={(event) => {
                                  clearExistingAccountInlineError();
                                  setFullName(event.target.value);
                                  if (inlineErrors.fullName) {
                                    setInlineErrors((current) => ({ ...current, fullName: '' }));
                                  }
                                }}
                                placeholder="John Doe"
                                className={inputClassName}
                                style={fieldHeightStyle}
                                required
                              />
                              {inlineErrors.fullName ? (
                                <p className="text-xs" style={errorTextStyle}>
                                  {inlineErrors.fullName}
                                </p>
                              ) : null}
                            </div>

                            <div style={fieldWrapperStyle}>
                              <label htmlFor="register-email" className="text-gray-300" style={fieldLabelStyle}>
                                {t('login.email')}
                              </label>
                              <input
                                id="register-email"
                                type="email"
                                value={email}
                                onChange={(event) => {
                                  clearExistingAccountInlineError();
                                  setEmail(event.target.value);
                                  if (inlineErrors.email) {
                                    setInlineErrors((current) => ({ ...current, email: '' }));
                                  }
                                }}
                                placeholder={t('login.emailPlaceholder')}
                                className={inputClassName}
                                style={fieldHeightStyle}
                                required
                              />
                              {inlineErrors.email ? (
                                <p className="text-xs" style={errorTextStyle}>
                                  {inlineErrors.email}
                                </p>
                              ) : null}
                            </div>

                            <div style={fieldWrapperStyle}>
                              <label htmlFor="register-password" className="text-gray-300" style={fieldLabelStyle}>
                                {t('login.password')}
                              </label>
                              <input
                                id="register-password"
                                type="password"
                                value={password}
                                onChange={(event) => {
                                  clearExistingAccountInlineError();
                                  setPassword(event.target.value);
                                  if (inlineErrors.password) {
                                    setInlineErrors((current) => ({ ...current, password: '' }));
                                  }
                                }}
                                placeholder={t('login.registerPasswordPlaceholder')}
                                className={inputClassName}
                                style={fieldHeightStyle}
                                required
                                minLength={8}
                              />
                              {password ? (
                                <div style={{ marginTop: '6px' }}>
                                  <div
                                    style={{
                                      height: '6px',
                                      overflow: 'hidden',
                                      borderRadius: '999px',
                                      background: 'rgba(255, 255, 255, 0.1)',
                                    }}
                                  >
                                    <motion.div
                                      initial={{ width: '0%' }}
                                      animate={{ width: passwordStrength.width }}
                                      transition={{ duration: 0.3 }}
                                      style={{
                                        height: '100%',
                                        display: 'block',
                                        background: passwordStrength.color,
                                      }}
                                    />
                                  </div>
                                  <p className="text-xs" style={{ color: passwordStrength.color, marginTop: '6px' }}>
                                    {passwordStrength.label}
                                  </p>
                                </div>
                              ) : null}
                              {inlineErrors.password ? (
                                <p className="text-xs" style={errorTextStyle}>
                                  {inlineErrors.password}
                                </p>
                              ) : null}
                            </div>

                            <div style={fieldWrapperStyle}>
                              <label htmlFor="register-confirm-password" className="text-gray-300" style={fieldLabelStyle}>
                                Confirm password
                              </label>
                              <input
                                id="register-confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => {
                                  clearExistingAccountInlineError();
                                  setConfirmPassword(event.target.value);
                                  if (inlineErrors.confirmPassword) {
                                    setInlineErrors((current) => ({ ...current, confirmPassword: '' }));
                                  }
                                }}
                                placeholder="••••••••"
                                className={inputClassName}
                                style={
                                  confirmPassword && password !== confirmPassword
                                    ? { ...fieldHeightStyle, borderColor: 'rgba(244, 63, 94, 0.5)' }
                                    : fieldHeightStyle
                                }
                                required
                              />
                              {stepOneDisabledMessage ? (
                                <p className="text-xs" style={errorTextStyle}>
                                  {stepOneDisabledMessage}
                                </p>
                              ) : null}
                            </div>
                          </motion.div>
                        ) : null}

                        {registerStep === 2 ? (
                          <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                            style={{ marginBottom: '40px' }}
                          >
                            <p className="mb-4 text-gray-300">Choose the plan that fits your needs</p>
                            <LayoutGroup id="register-plan-selection">
                              <div className="grid gap-6 md:grid-cols-3">
                                {orderedPlans.map((plan) => {
                                  const code = plan.code as BillingPlanCode;
                                  const visual = localizedPlanVisuals[code];
                                  const isCurrent = selectedPlan === code;
                                  const isPro = code === 'PRO';
                                  const isExpert = code === 'EXPERT';
                                  const showPlanBadge = Boolean(visual.badge) && !isExpert;
                                  const planFeatures = visual.features;
                                  const scaledCardStyle = {
                                    zoom: 0.51,
                                    fontSize: '182%',
                                  };
                                  const selectedBorderColor = isPro
                                    ? 'rgb(96, 165, 250)'
                                    : 'rgb(147, 197, 253)';
                                  const neonGlowGradient = isPro
                                    ? 'radial-gradient(70% 70% at 50% 50%, rgba(96,165,250,0.62), rgba(168,85,247,0.36) 52%, rgba(96,165,250,0) 100%)'
                                    : 'radial-gradient(70% 70% at 50% 50%, rgba(147,197,253,0.52), rgba(59,130,246,0.32) 52%, rgba(147,197,253,0) 100%)';
                                  const selectedPulseShadow = isPro
                                    ? [
                                        '0 0 0 2px rgba(96, 165, 250, 0.95), 0 0 32px rgba(59, 130, 246, 0.5), 0 0 86px rgba(168, 85, 247, 0.3)',
                                        '0 0 0 2px rgba(96, 165, 250, 1), 0 0 54px rgba(59, 130, 246, 0.82), 0 0 110px rgba(168, 85, 247, 0.48)',
                                        '0 0 0 2px rgba(96, 165, 250, 0.95), 0 0 32px rgba(59, 130, 246, 0.5), 0 0 86px rgba(168, 85, 247, 0.3)',
                                      ]
                                    : [
                                        '0 0 0 2px rgba(147, 197, 253, 0.9), 0 0 30px rgba(59, 130, 246, 0.42), 0 0 72px rgba(59, 130, 246, 0.2)',
                                        '0 0 0 2px rgba(147, 197, 253, 1), 0 0 48px rgba(59, 130, 246, 0.7), 0 0 92px rgba(59, 130, 246, 0.3)',
                                        '0 0 0 2px rgba(147, 197, 253, 0.9), 0 0 30px rgba(59, 130, 246, 0.42), 0 0 72px rgba(59, 130, 246, 0.2)',
                                      ];

                                  return (
                                    <motion.div
                                      key={code}
                                      className={`relative overflow-visible rounded-3xl border p-8 transition-all ${
                                        isPro
                                            ? 'bg-gradient-to-br from-white/10 to-white/[0.02] border-blue-500/30 shadow-xl shadow-blue-500/10 scale-105'
                                            : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10'
                                      }`}
                                      style={{
                                        ...scaledCardStyle,
                                        ...(isCurrent ? { borderColor: selectedBorderColor } : {}),
                                      }}
                                      animate={isCurrent ? { boxShadow: selectedPulseShadow } : undefined}
                                      transition={isCurrent ? { duration: 1.35, repeat: Infinity, ease: 'easeInOut' } : undefined}
                                    >
                                      {isCurrent ? (
                                        <>
                                          <motion.div
                                            layoutId="selected-plan-neon-glow"
                                            className="pointer-events-none absolute"
                                            style={{
                                              top: '-18px',
                                              right: '-18px',
                                              bottom: '-18px',
                                              left: '-18px',
                                              borderRadius: '2rem',
                                              zIndex: 0,
                                              background: neonGlowGradient,
                                              filter: 'blur(18px)',
                                            }}
                                            animate={{ opacity: [0.72, 1, 0.72], scale: [0.98, 1.02, 0.98] }}
                                            transition={{
                                              opacity: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
                                              scale: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
                                            }}
                                          />
                                        </>
                                      ) : null}

                                      <div style={{ position: 'relative', zIndex: 2 }}>
                                        {showPlanBadge ? (
                                          <div className="mb-4">
                                            <span
                                              className="px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600"
                                              style={{ fontSize: '1.365rem' }}
                                            >
                                              {visual.badge}
                                            </span>
                                          </div>
                                        ) : null}

                                        <h3 className="text-2xl font-bold mb-2 text-white" style={{ fontSize: '2.73rem' }}>
                                          {plan.name}
                                        </h3>
                                        <div className="flex items-baseline gap-2 mb-4">
                                          <span className="text-5xl font-bold text-white" style={{ fontSize: '5.46rem' }}>
                                            {visual.price}
                                          </span>
                                          <span className="text-gray-400">{visual.period}</span>
                                        </div>
                                        <p className="text-gray-400 mb-8">{visual.description}</p>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedPlan((current) => (current === code ? null : code));
                                            setStatusMessage(null);
                                          }}
                                          className={`w-full px-6 py-3 rounded-xl font-medium transition-all mb-8 ${
                                            isPro
                                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25'
                                                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                                          } disabled:cursor-not-allowed disabled:opacity-60`}
                                        >
                                          {isCurrent ? 'Selected' : visual.cta}
                                        </button>

                                        <ul className="space-y-4">
                                          {planFeatures.map((feature) => (
                                            <li key={`${plan.code}-${feature}`} className="flex items-start gap-3">
                                              <div
                                                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                  isPro ? 'bg-blue-500/20' : 'bg-white/5'
                                                }`}
                                              >
                                                <Check className={`w-3 h-3 ${isPro ? 'text-blue-400' : 'text-gray-400'}`} />
                                              </div>
                                              <span className="text-gray-300">{feature}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </LayoutGroup>
                          </motion.div>
                        ) : null}

                      </AnimatePresence>

                      <div
                        className="mt-8"
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={onClose}
                          className="h-11 rounded-xl px-6 text-gray-300 transition hover:bg-white/5 hover:text-white"
                        >
                          Cancel
                        </button>

                        {registerStep > 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRegisterStep((current) => (current - 1) as RegisterStep);
                              setStatusMessage(null);
                              setInlineErrors({});
                            }}
                            className="h-11 rounded-xl px-6 text-gray-300 transition hover:bg-white/5 hover:text-white"
                          >
                            <span className="inline-flex items-center">
                              <ArrowLeft className="mr-2 h-4 w-4" />
                              Back
                            </span>
                          </button>
                        ) : null}

                        <div style={{ flex: 1, minWidth: '20px' }} />

                        <button
                          type="submit"
                          disabled={
                            isSubmitting ||
                            (registerStep === 1 && !stepOneValid) ||
                            (registerStep === 2 && !stepTwoValid)
                          }
                          className="whitespace-nowrap rounded-xl px-6 sm:px-8 transition disabled:cursor-not-allowed disabled:opacity-50"
                          style={{
                            ...fieldHeightStyle,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: 'auto',
                            color: '#ffffff',
                            fontWeight: 500,
                            background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(168, 85, 247))',
                          }}
                        >
                          <span>
                            {isSubmitting
                              ? t('login.authenticating')
                              : registerStep < 2
                                ? 'Continue'
                                : 'Start my subscription'}
                          </span>
                        </button>
                      </div>
                    </form>

                    <div className="mt-6 text-center">
                      <span className="text-sm text-gray-400">Already have an account? </span>
                      <button
                        type="button"
                        onClick={() => {
                          setView('login');
                          setRegisterStep(1);
                          setStatusMessage(null);
                          setInlineErrors({});
                        }}
                        disabled={isSubmitting}
                        className="text-sm transition-opacity hover:opacity-85 disabled:opacity-60"
                        style={gradientTextLinkStyle}
                      >
                        Log in
                      </button>
                    </div>

                  </div>
                </motion.div>
              ) : (
                <div
                  key="forgot-password"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  style={{ pointerEvents: 'auto' }}
                >
                  <ForgotPasswordModal
                    onClose={onClose}
                    onBack={() => {
                      setView('login');
                      setStatusMessage(null);
                      setInlineErrors({});
                    }}
                    defaultEmail={email}
                    onEmailChange={(nextEmail) => {
                      setEmail(nextEmail);
                    }}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {emailConfirmationNotice ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
                onClick={onClose}
                style={{
                  zIndex: 10001,
                  pointerEvents: 'auto',
                  background: 'rgba(2, 8, 25, 0.8)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  aria-hidden="true"
                  className="absolute rounded-full"
                  style={{
                    width: 520,
                    height: 520,
                    top: '-180px',
                    right: '-140px',
                    background:
                      'radial-gradient(circle, rgba(56, 189, 248, 0.32) 0%, rgba(56, 189, 248, 0) 70%)',
                    filter: 'blur(6px)',
                  }}
                  animate={{ opacity: [0.46, 0.8, 0.46], scale: [0.94, 1.06, 0.94] }}
                  transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
                />

                <motion.div
                  aria-hidden="true"
                  className="absolute rounded-full"
                  style={{
                    width: 460,
                    height: 460,
                    bottom: '-170px',
                    left: '-120px',
                    background:
                      'radial-gradient(circle, rgba(139, 92, 246, 0.26) 0%, rgba(139, 92, 246, 0) 72%)',
                    filter: 'blur(10px)',
                  }}
                  animate={{ opacity: [0.42, 0.7, 0.42], scale: [1.03, 0.94, 1.03] }}
                  transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
                />

                <motion.div
                  initial={{ opacity: 0, y: 22, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 14, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(event) => event.stopPropagation()}
                  className="relative w-full overflow-hidden rounded-3xl border p-6 sm:p-8"
                  style={{
                    maxWidth: '780px',
                    borderColor: 'rgba(96, 165, 250, 0.45)',
                    background:
                      'linear-gradient(152deg, rgba(17, 24, 39, 0.95), rgba(13, 20, 44, 0.94) 58%, rgba(22, 28, 56, 0.95) 100%)',
                    boxShadow:
                      '0 0 0 1px rgba(96, 165, 250, 0.35), 0 24px 70px rgba(2, 6, 23, 0.62), 0 0 60px rgba(59, 130, 246, 0.22)',
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(120deg, rgba(56, 189, 248, 0.1), rgba(139, 92, 246, 0.06) 45%, rgba(56, 189, 248, 0.12) 100%)',
                      pointerEvents: 'none',
                    }}
                  />

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('login.close')}
                    className="absolute transition-colors hover:text-white"
                    style={{
                      right: '1rem',
                      top: '1rem',
                      zIndex: 2,
                      color: 'rgba(203, 213, 225, 0.88)',
                    }}
                  >
                    <X className="h-6 w-6" />
                  </button>

                  <div
                    className="relative"
                    style={{ zIndex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 9999,
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        background:
                          'linear-gradient(135deg, rgba(30, 64, 175, 0.4), rgba(139, 92, 246, 0.24))',
                        color: 'rgb(226, 232, 240)',
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: 0.2,
                        padding: '7px 14px',
                        width: 'fit-content',
                      }}
                    >
                      Account confirmation needed
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 16 }}>
                      <motion.div
                        aria-hidden="true"
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 18,
                          border: '1px solid rgba(147, 197, 253, 0.42)',
                          display: 'grid',
                          placeItems: 'center',
                          background:
                            'linear-gradient(135deg, rgba(56, 189, 248, 0.95), rgba(139, 92, 246, 0.85))',
                          color: 'white',
                          boxShadow:
                            '0 10px 28px rgba(56, 189, 248, 0.33), 0 8px 24px rgba(139, 92, 246, 0.24)',
                        }}
                        animate={{
                          boxShadow: [
                            '0 10px 28px rgba(56, 189, 248, 0.33), 0 8px 24px rgba(139, 92, 246, 0.24)',
                            '0 14px 36px rgba(56, 189, 248, 0.5), 0 12px 32px rgba(139, 92, 246, 0.32)',
                            '0 10px 28px rgba(56, 189, 248, 0.33), 0 8px 24px rgba(139, 92, 246, 0.24)',
                          ],
                          scale: [1, 1.035, 1],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Mail className="h-7 w-7" />
                      </motion.div>

                      <div>
                        <h3
                          style={{
                            margin: 0,
                            marginBottom: 10,
                            color: 'rgb(248, 250, 252)',
                            fontSize: 'clamp(2rem, 3vw, 2.7rem)',
                            lineHeight: 1.08,
                            letterSpacing: '-0.02em',
                            fontWeight: 700,
                          }}
                        >
                          You&apos;re almost there
                        </h3>
                        <p
                          style={{
                            margin: 0,
                            color: 'rgba(226, 232, 240, 0.94)',
                            fontSize: 17,
                            lineHeight: 1.55,
                          }}
                        >
                          Just confirm your account by clicking the link we sent to{' '}
                          <span style={{ color: 'rgba(147, 197, 253, 0.98)', fontWeight: 500 }}>
                            {emailConfirmationNotice.email}
                          </span>
                          .
                        </p>
                        <p
                          style={{
                            marginTop: 8,
                            marginBottom: 0,
                            color: 'rgba(203, 213, 225, 0.9)',
                            fontSize: 16,
                            lineHeight: 1.55,
                          }}
                        >
                          After confirming, you can log in right away.
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gap: 10,
                        padding: '14px 14px',
                        borderRadius: 14,
                        border: '1px solid rgba(148, 163, 184, 0.23)',
                        background: 'rgba(15, 23, 42, 0.5)',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '24px 1fr',
                          gap: 10,
                          alignItems: 'start',
                          color: 'rgba(203, 213, 225, 0.95)',
                          fontSize: 14,
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 9999,
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'white',
                            background:
                              'linear-gradient(135deg, rgba(56, 189, 248, 0.95), rgba(139, 92, 246, 0.82))',
                          }}
                        >
                          1
                        </span>
                        Check your inbox and click the verification link.
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '24px 1fr',
                          gap: 10,
                          alignItems: 'start',
                          color: 'rgba(203, 213, 225, 0.95)',
                          fontSize: 14,
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 9999,
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'white',
                            background:
                              'linear-gradient(135deg, rgba(56, 189, 248, 0.95), rgba(139, 92, 246, 0.82))',
                          }}
                        >
                          2
                        </span>
                        Then log in to continue with your subscription setup.
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AppAlertToast
            message={statusMessage}
            onClose={() => setStatusMessage(null)}
            variant="error"
          />
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
