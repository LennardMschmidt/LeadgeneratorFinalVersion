import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { ArrowLeft, Check, Mail, Shield, X } from 'lucide-react';
import { useI18n } from '../i18n';
import {
  isSupabaseAuthConfigured,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../lib/supabaseAuth';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import {
  BillingPlan,
  changeBillingPlanInBackend,
  fetchPublicBillingPlansFromBackend,
  mockBillingPaymentInBackend,
} from './dashboard/api';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
}

type AuthView = 'login' | 'register' | 'forgot-password';
type BillingPlanCode = 'STANDARD' | 'PRO' | 'EXPERT';
type RegisterStep = 1 | 2 | 3;

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

const PLAN_VISUALS: Record<
  BillingPlanCode,
  {
    price: string;
    period: string;
    description: string;
    cta: string;
    badge?: string;
    features: string[];
  }
> = {
  STANDARD: {
    price: '$29',
    period: '/per month',
    description: 'Essential tools for solo operators and early projects.',
    cta: 'Choose Standard',
    features: [
      '180 tokens/day included',
      'Google Maps search',
      'Website analysis',
      'Basic lead management',
      'Saved leads',
      'Email support',
    ],
  },
  PRO: {
    price: '$49',
    period: '/per month',
    description: 'Full access for growing teams',
    cta: 'Switch to Pro',
    badge: 'MOST POPULAR',
    features: [
      '380 tokens/day included',
      'LinkedIn + Google Maps search',
      'Advanced website analysis',
      'CSV & CRM export',
      'Saved searches',
      'Lead scoring & tiers',
      'Priority support',
    ],
  },
  EXPERT: {
    price: '$79',
    period: '/per month',
    description: 'Maximum volume and speed for high-output prospecting.',
    cta: 'Upgrade to Expert',
    badge: 'BEST VALUE',
    features: [
      '700 tokens/day included',
      'Highest daily throughput',
      'Priority execution lane',
      'All Pro features',
      'Advanced usage visibility',
      'Fast-track support',
      'API-ready workflow',
    ],
  },
};

const formatCardNumber = (value: string): string =>
  value
    .replace(/\D+/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();

const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D+/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
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

export function LoginModal({ open, onClose, onAuthenticated }: LoginModalProps) {
  const { t } = useI18n();

  const [view, setView] = useState<AuthView>('login');
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<BillingPlanCode | null>('PRO');
  const [availablePlans, setAvailablePlans] = useState<BillingPlan[]>(FALLBACK_PLANS);

  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

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
    if (open) {
      return;
    }

    setView('login');
    setRegisterStep(1);

    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRememberMe(false);

    setSelectedPlan('PRO');
    setAvailablePlans(FALLBACK_PLANS);

    setCardholderName('');
    setCardNumber('');
    setExpiry('');
    setCvc('');

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

  const stepThreeValid =
    cardholderName.trim().length >= 2 &&
    cardNumber.replace(/\s+/g, '').length >= 12 &&
    expiry.trim().length >= 4 &&
    cvc.trim().length >= 3;

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

  const validateStepThree = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (cardholderName.trim().length < 2) {
      nextErrors.cardholderName = 'Please enter the cardholder name.';
    }
    if (cardNumber.replace(/\s+/g, '').length < 12) {
      nextErrors.cardNumber = 'Please enter a valid card number.';
    }
    if (expiry.trim().length < 4) {
      nextErrors.expiry = 'Please enter a valid expiry date.';
    }
    if (cvc.trim().length < 3) {
      nextErrors.cvc = 'Please enter a valid CVC.';
    }

    setInlineErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

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
    setStatusMessage(t('login.googleLoginClicked'));

    const result = await signInWithGoogle('/dashboard', { rememberMe });
    if (!result.ok) {
      setStatusMessage(getAuthFailureMessage(result));
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
      const result = await signInWithEmail(email.trim(), password, { rememberMe });
      if (!result.ok) {
        setStatusMessage(getAuthFailureMessage(result));
        return;
      }

      setStatusMessage(t('login.emailLoginCaptured', { email }));
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

    if (!validateStepThree()) {
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
        rememberMe,
        name: fullName.trim(),
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

        setStatusMessage(REGISTER_SIGNUP_FAILED_MESSAGE);
        return;
      }

      if (result.requiresEmailConfirmation) {
        setEmailConfirmationNotice({ email: email.trim() });
        setStatusMessage(null);
        setInlineErrors({});
        return;
      }

      await changeBillingPlanInBackend(selectedPlan);
      await mockBillingPaymentInBackend({
        cardholderName: cardholderName.trim(),
        cardNumber,
        expiry,
        cvc,
      });

      setStatusMessage("You're all set. Welcome aboard.");
      onAuthenticated?.();
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

    if (registerStep === 2) {
      if (!selectedPlan) {
        setStatusMessage('Please select one plan to continue.');
        return;
      }
      setRegisterStep(3);
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

                      <div className="flex items-center justify-between" style={fieldWrapperStyle}>
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(event) => setRememberMe(event.target.checked)}
                            className="h-4 w-4 rounded border border-white/20 bg-white/5 accent-blue-500"
                            disabled={isSubmitting}
                          />
                          {t('login.rememberMe')}
                        </label>
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

                    {statusMessage ? (
                      <p className="mt-4 rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-xs leading-relaxed text-blue-200">
                        {statusMessage}
                      </p>
                    ) : null}
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

                    {emailConfirmationNotice ? (
                      <div
                        className="absolute inset-0 z-20 flex items-center justify-center p-4 sm:p-6"
                        style={{ background: 'rgba(6, 8, 18, 0.68)', backdropFilter: 'blur(4px)' }}
                      >
                        <div
                          className="relative w-full max-w-xl rounded-2xl border p-6 sm:p-7"
                          style={{
                            background: 'linear-gradient(145deg, rgba(20, 18, 33, 0.92), rgba(15, 23, 42, 0.88))',
                            borderColor: 'rgba(96, 165, 250, 0.45)',
                            boxShadow:
                              '0 0 0 1px rgba(96, 165, 250, 0.35), 0 0 42px rgba(59, 130, 246, 0.28)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={onClose}
                            aria-label={t('login.close')}
                            className="absolute text-gray-300 transition-colors hover:text-white"
                            style={{ right: '1rem', top: '1rem' }}
                          >
                            <X className="h-5 w-5" />
                          </button>
                          <h3 className="mb-2 pr-8 text-2xl font-semibold text-white">You're almost there</h3>
                          <p className="text-sm leading-relaxed text-gray-200">
                            Just confirm your account by clicking the link we sent to{' '}
                            <span className="font-medium text-blue-200">{emailConfirmationNotice.email}</span>.
                          </p>
                          <p className="mt-3 text-sm text-gray-300">After confirming, you can log in right away.</p>
                        </div>
                      </div>
                    ) : null}

                    <div className="mb-6">
                      <h2 className="mb-2 text-2xl text-white">Create your account</h2>
                      <p className="text-gray-400">Get started with Lead Generator</p>
                    </div>

                    <div className="mb-8">
                      <div className="mb-3 flex items-center">
                        {([1, 2, 3] as RegisterStep[]).map((step) => (
                          <div
                            key={step}
                            className="flex items-center"
                            style={{ flex: step < 3 ? 1 : '0 0 auto' }}
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
                                {step === 1 ? 'Account' : step === 2 ? 'Package' : 'Payment'}
                              </span>
                            </div>
                            {step < 3 ? (
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
                                  const visual = PLAN_VISUALS[code];
                                  const isCurrent = selectedPlan === code;
                                  const isPro = code === 'PRO';
                                  const isExpert = code === 'EXPERT';
                                  const planFeatures = [
                                    `${plan.aiTokensPerMonth} AI evaluation tokens/month`,
                                    ...visual.features,
                                  ];
                                  const scaledCardStyle = {
                                    zoom: 0.51,
                                    fontSize: '182%',
                                  };
                                  const selectedBorderColor = isExpert
                                    ? 'rgb(34, 211, 238)'
                                    : isPro
                                      ? 'rgb(96, 165, 250)'
                                      : 'rgb(147, 197, 253)';
                                  const neonGlowGradient = isExpert
                                    ? 'radial-gradient(70% 70% at 50% 50%, rgba(34,211,238,0.62), rgba(16,185,129,0.36) 52%, rgba(34,211,238,0) 100%)'
                                    : isPro
                                      ? 'radial-gradient(70% 70% at 50% 50%, rgba(96,165,250,0.62), rgba(168,85,247,0.36) 52%, rgba(96,165,250,0) 100%)'
                                      : 'radial-gradient(70% 70% at 50% 50%, rgba(147,197,253,0.52), rgba(59,130,246,0.32) 52%, rgba(147,197,253,0) 100%)';
                                  const selectedPulseShadow = isExpert
                                    ? [
                                        '0 0 0 2px rgba(34, 211, 238, 0.95), 0 0 36px rgba(34, 211, 238, 0.55), 0 0 96px rgba(16, 185, 129, 0.33)',
                                        '0 0 0 2px rgba(34, 211, 238, 1), 0 0 58px rgba(34, 211, 238, 0.9), 0 0 118px rgba(16, 185, 129, 0.5)',
                                        '0 0 0 2px rgba(34, 211, 238, 0.95), 0 0 36px rgba(34, 211, 238, 0.55), 0 0 96px rgba(16, 185, 129, 0.33)',
                                      ]
                                    : [
                                        '0 0 0 2px rgba(96, 165, 250, 0.95), 0 0 32px rgba(59, 130, 246, 0.5), 0 0 86px rgba(168, 85, 247, 0.3)',
                                        '0 0 0 2px rgba(96, 165, 250, 1), 0 0 54px rgba(59, 130, 246, 0.82), 0 0 110px rgba(168, 85, 247, 0.48)',
                                        '0 0 0 2px rgba(96, 165, 250, 0.95), 0 0 32px rgba(59, 130, 246, 0.5), 0 0 86px rgba(168, 85, 247, 0.3)',
                                      ];

                                  return (
                                    <motion.div
                                      key={code}
                                      className={`relative overflow-visible rounded-3xl border p-8 transition-all ${
                                        isExpert
                                          ? 'border-2 border-cyan-300 hover:scale-[1.02]'
                                        : isPro
                                            ? 'bg-gradient-to-br from-white/10 to-white/[0.02] border-blue-500/30 shadow-xl shadow-blue-500/10 scale-105'
                                            : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10'
                                      }`}
                                      style={
                                        isExpert
                                          ? {
                                              ...scaledCardStyle,
                                              borderColor: isCurrent ? '#67e8f9' : '#22d3ee',
                                              borderWidth: '2px',
                                              background:
                                                'linear-gradient(135deg, rgba(6, 182, 212, 0.22), rgba(16, 185, 129, 0.18), rgba(163, 230, 53, 0.16))',
                                              boxShadow:
                                                '0 0 0 1px rgba(103, 232, 249, 0.55), 0 0 42px rgba(34, 211, 238, 0.42), inset 0 0 28px rgba(20, 184, 166, 0.12)',
                                            }
                                          : {
                                              ...scaledCardStyle,
                                              ...(isCurrent ? { borderColor: selectedBorderColor } : {}),
                                            }
                                      }
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
                                        {visual.badge ? (
                                          <div className="mb-4">
                                            <span
                                              className={`px-3 py-1 rounded-full text-white text-xs font-medium ${
                                              isExpert
                                                ? 'bg-gradient-to-r from-cyan-300 to-emerald-300 text-black shadow-[0_0_20px_rgba(34,211,238,0.65)]'
                                                : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                            }`}
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
                                            isExpert
                                              ? 'bg-gradient-to-r from-cyan-300 to-emerald-400 hover:from-cyan-400 hover:to-emerald-500 text-black shadow-[0_0_24px_rgba(16,185,129,0.35)]'
                                              : isPro
                                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25'
                                                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                                          } disabled:cursor-not-allowed disabled:opacity-60`}
                                          style={
                                            isExpert
                                              ? {
                                                  border: '1px solid rgba(103, 232, 249, 0.8)',
                                                  background: 'linear-gradient(90deg, rgb(103, 232, 249), rgb(52, 211, 153))',
                                                  color: '#02120d',
                                                  boxShadow: '0 0 24px rgba(16, 185, 129, 0.35)',
                                                }
                                              : undefined
                                          }
                                        >
                                          {isCurrent ? 'Selected' : visual.cta}
                                        </button>

                                        <ul className="space-y-4">
                                          {planFeatures.map((feature) => (
                                            <li key={`${plan.code}-${feature}`} className="flex items-start gap-3">
                                              <div
                                                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                  isExpert ? 'bg-emerald-400/30' : isPro ? 'bg-blue-500/20' : 'bg-white/5'
                                                }`}
                                              >
                                                <Check
                                                  className={`w-3 h-3 ${
                                                    isExpert ? 'text-emerald-200' : isPro ? 'text-blue-400' : 'text-gray-400'
                                                  }`}
                                                />
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

                        {registerStep === 3 ? (
                          <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-0"
                          >
                            <motion.div
                              className="flex items-center rounded-xl"
                              style={{
                                marginBottom: '16px',
                                padding: '12px',
                                gap: '8px',
                                borderRadius: '12px',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                background: 'rgba(16, 185, 129, 0.12)',
                              }}
                              animate={{
                                boxShadow: [
                                  '0 0 0 rgba(16, 185, 129, 0)',
                                  '0 0 16px rgba(16, 185, 129, 0.22)',
                                  '0 0 0 rgba(16, 185, 129, 0)',
                                ],
                              }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              <motion.span
                                style={{ display: 'inline-flex' }}
                                animate={{ scale: [1, 1.06, 1] }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                              >
                                <Shield className="h-5 w-5" style={{ color: 'rgb(52, 211, 153)' }} />
                              </motion.span>
                              <span className="text-sm" style={{ color: 'rgb(110, 231, 183)', lineHeight: '1.35' }}>
                                Secure payment - Your data is encrypted
                              </span>
                            </motion.div>

                            <div style={fieldWrapperStyle}>
                              <label htmlFor="cardholder-name" className="text-gray-300" style={fieldLabelStyle}>
                                Cardholder name
                              </label>
                              <input
                                id="cardholder-name"
                                type="text"
                                value={cardholderName}
                                onChange={(event) => {
                                  setCardholderName(event.target.value);
                                  if (inlineErrors.cardholderName) {
                                    setInlineErrors((current) => ({ ...current, cardholderName: '' }));
                                  }
                                }}
                                placeholder="John Doe"
                                className={inputClassName}
                                style={fieldHeightStyle}
                                required
                              />
                              {inlineErrors.cardholderName ? (
                                <p className="text-xs" style={errorTextStyle}>
                                  {inlineErrors.cardholderName}
                                </p>
                              ) : null}
                            </div>

                            <div style={fieldWrapperStyle}>
                              <label htmlFor="card-number" className="text-gray-300" style={fieldLabelStyle}>
                                Card number
                              </label>
                              <input
                                id="card-number"
                                type="text"
                                value={cardNumber}
                                onChange={(event) => {
                                  setCardNumber(formatCardNumber(event.target.value));
                                  if (inlineErrors.cardNumber) {
                                    setInlineErrors((current) => ({ ...current, cardNumber: '' }));
                                  }
                                }}
                                placeholder="1234 5678 9012 3456"
                                className={inputClassName}
                                style={fieldHeightStyle}
                                required
                              />
                              {inlineErrors.cardNumber ? (
                                <p className="text-xs" style={errorTextStyle}>
                                  {inlineErrors.cardNumber}
                                </p>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-5" style={{ marginBottom: '20px' }}>
                              <div>
                                <label htmlFor="card-expiry" className="text-gray-300" style={fieldLabelStyle}>
                                  Expiry date
                                </label>
                                <input
                                  id="card-expiry"
                                  type="text"
                                  value={expiry}
                                  onChange={(event) => {
                                    setExpiry(formatExpiry(event.target.value));
                                    if (inlineErrors.expiry) {
                                      setInlineErrors((current) => ({ ...current, expiry: '' }));
                                    }
                                  }}
                                  placeholder="MM/YY"
                                  maxLength={5}
                                  className={inputClassName}
                                  style={fieldHeightStyle}
                                  required
                                />
                                {inlineErrors.expiry ? (
                                  <p className="text-xs" style={errorTextStyle}>
                                    {inlineErrors.expiry}
                                  </p>
                                ) : null}
                              </div>

                              <div>
                                <label htmlFor="card-cvc" className="text-gray-300" style={fieldLabelStyle}>
                                  CVC
                                </label>
                                <input
                                  id="card-cvc"
                                  type="text"
                                  value={cvc}
                                  onChange={(event) => {
                                    setCvc(event.target.value.replace(/\D+/g, '').slice(0, 4));
                                    if (inlineErrors.cvc) {
                                      setInlineErrors((current) => ({ ...current, cvc: '' }));
                                    }
                                  }}
                                  placeholder="123"
                                  maxLength={4}
                                  className={inputClassName}
                                  style={fieldHeightStyle}
                                  required
                                />
                                {inlineErrors.cvc ? (
                                  <p className="text-xs" style={errorTextStyle}>
                                    {inlineErrors.cvc}
                                  </p>
                                ) : null}
                              </div>
                            </div>
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
                            (registerStep === 2 && !stepTwoValid) ||
                            (registerStep === 3 && !stepThreeValid)
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
                              : registerStep < 3
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

                    {statusMessage ? (
                      <p className="mt-4 rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-xs leading-relaxed text-blue-200">
                        {statusMessage}
                      </p>
                    ) : null}
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
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
