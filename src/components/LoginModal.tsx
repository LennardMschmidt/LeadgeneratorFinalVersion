import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CreditCard, Lock, Sparkles, UserRound, WalletCards, Layers, X } from 'lucide-react';
import { useI18n } from '../i18n';
import {
  isSupabaseAuthConfigured,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../lib/supabaseAuth';
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

type BillingPlanCode = 'STANDARD' | 'PRO' | 'EXPERT';
type RegisterStep = 1 | 2 | 3;

const FALLBACK_PLANS: BillingPlan[] = [
  {
    code: 'STANDARD',
    name: 'Standard',
    dailyTokenLimit: 180,
    tokenCosts: { google_maps_search: 1, linkedin_search: 3, website_analysis: 1 },
  },
  {
    code: 'PRO',
    name: 'Pro',
    dailyTokenLimit: 380,
    tokenCosts: { google_maps_search: 1, linkedin_search: 3, website_analysis: 1 },
  },
  {
    code: 'EXPERT',
    name: 'Expert',
    dailyTokenLimit: 700,
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
    highlighted: boolean;
    badge?: string;
    features: string[];
  }
> = {
  STANDARD: {
    price: '$29',
    period: 'per month',
    description: 'Essential tools for solo operators and early projects.',
    cta: 'Choose Standard',
    highlighted: false,
    features: [
      '180 tokens per day',
      'Google Maps search',
      'Website analysis',
      'Saved leads',
      'Basic lead management',
      'Email support',
    ],
  },
  PRO: {
    price: '$49',
    period: 'per month',
    description: 'Full access for growing teams.',
    cta: 'Choose Pro',
    highlighted: true,
    badge: 'MOST POPULAR',
    features: [
      '380 tokens per day',
      'LinkedIn + Google Maps search',
      'CSV & CRM export',
      'Saved searches',
      'Lead scoring & tiers',
      'Priority support',
    ],
  },
  EXPERT: {
    price: '$79',
    period: 'per month',
    description: 'Maximum volume and speed for high-output prospecting.',
    cta: 'Choose Expert',
    highlighted: false,
    badge: 'BEST VALUE',
    features: [
      '700 tokens per day',
      'Highest daily throughput',
      'All Pro features',
      'Advanced usage visibility',
      'Fast-track support',
      'API-ready workflow',
    ],
  },
};

const cardBrandFromNumber = (value: string): 'visa' | 'mastercard' | 'amex' | 'unknown' => {
  const digits = value.replace(/\s+/g, '');
  if (digits.startsWith('4')) {
    return 'visa';
  }
  if (/^(5[1-5]|2[2-7])/.test(digits)) {
    return 'mastercard';
  }
  if (/^(34|37)/.test(digits)) {
    return 'amex';
  }
  return 'unknown';
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

const passwordStrength = (value: string): 0 | 1 | 2 | 3 | 4 => {
  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (value.length >= 8) score = (score + 1) as 0 | 1 | 2 | 3 | 4;
  if (/[A-Z]/.test(value)) score = (score + 1) as 0 | 1 | 2 | 3 | 4;
  if (/[0-9]/.test(value)) score = (score + 1) as 0 | 1 | 2 | 3 | 4;
  if (/[^A-Za-z0-9]/.test(value)) score = (score + 1) as 0 | 1 | 2 | 3 | 4;
  return score;
};

export function LoginModal({ open, onClose, onAuthenticated }: LoginModalProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [rememberMe, setRememberMe] = useState(false);
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanCode | null>(null);
  const [availablePlans, setAvailablePlans] = useState<BillingPlan[]>(FALLBACK_PLANS);

  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setRegisterStep(1);
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setRememberMe(false);
      setSelectedPlan(null);
      setAvailablePlans(FALLBACK_PLANS);
      setCardholderName('');
      setCardNumber('');
      setExpiry('');
      setCvc('');
      setStatusMessage(null);
      setInlineErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (!open || mode !== 'register') {
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
  }, [open, mode]);

  const orderedPlans = useMemo(() => {
    const order: BillingPlanCode[] = ['STANDARD', 'PRO', 'EXPERT'];
    return [...availablePlans].sort(
      (a, b) => order.indexOf(a.code as BillingPlanCode) - order.indexOf(b.code as BillingPlanCode),
    );
  }, [availablePlans]);

  const progress = useMemo(() => ((registerStep - 1) / 2) * 100, [registerStep]);
  const strength = useMemo(() => passwordStrength(password), [password]);
  const cardBrand = useMemo(() => cardBrandFromNumber(cardNumber), [cardNumber]);
  const registerSteps = useMemo(
    () => [
      { step: 1, label: 'Account', icon: UserRound },
      { step: 2, label: 'Plan', icon: Layers },
      { step: 3, label: 'Payment', icon: WalletCards },
    ],
    [],
  );

  const stepOneValid =
    fullName.trim().length >= 2 &&
    /.+@.+\..+/.test(email.trim()) &&
    password.length >= 8 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

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
    if (!/.+@.+\..+/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setInlineErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

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

  const handleGoogleAuth = async () => {
    if (isSubmitting) {
      return;
    }

    if (!isSupabaseAuthConfigured()) {
      setStatusMessage(t('login.authNotConfigured'));
      return;
    }

    if (mode === 'register') {
      setStatusMessage('Use email signup to complete onboarding and subscription setup.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(t('login.googleLoginClicked'));

    const result = await signInWithGoogle('/dashboard', { rememberMe });
    if (!result.ok) {
      setStatusMessage(result.message);
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
        setStatusMessage(result.message);
        return;
      }

      if (result.requiresEmailConfirmation) {
        setStatusMessage(
          `Your account was created for ${email}. Please confirm your email, then sign in to activate your subscription.`,
        );
        setMode('login');
        setRegisterStep(1);
        setPassword('');
        setConfirmPassword('');
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

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'register') {
      await handleRegisterContinue();
      return;
    }

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
        setStatusMessage(result.message);
        return;
      }

      setStatusMessage(t('login.emailLoginCaptured', { email }));
      onAuthenticated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  const strengthLabel =
    strength <= 1 ? 'Weak' : strength === 2 ? 'Okay' : strength === 3 ? 'Strong' : 'Very strong';

  return createPortal(
    <>
      <div
        role="button"
        aria-label={t('login.closeLoginForm')}
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClose();
          }
        }}
        className="fixed inset-0 z-[119] bg-black/70 backdrop-blur-[14px]"
      />

      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25 }}
          className={`relative overflow-hidden rounded-3xl border shadow-[0_24px_80px_rgba(0,0,0,0.65)] ${
            mode === 'register'
              ? 'w-full max-w-5xl border-white/15 bg-[#0f1220]/95 p-6 sm:p-8'
              : 'w-[94vw] sm:w-[88vw] lg:w-[70vw] lg:h-[70vh] lg:max-h-[760px] lg:max-w-[980px] border-white/25 bg-[#0b0f1d]/98 p-5 sm:p-6'
          }`}
        >
          <div className="absolute -top-20 -right-20 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          <button
            type="button"
            aria-label={t('login.close')}
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full p-1.5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className={`mb-6 flex items-center gap-2 ${mode === 'login' ? 'lg:mb-5' : ''}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium tracking-wide text-gray-200">
              {mode === 'login' ? t('login.loginTitle') : 'Onboarding'}
            </span>
          </div>

          <div className={`space-y-6 ${mode === 'login' ? 'lg:h-[calc(100%-3.5rem)] lg:overflow-y-auto lg:pr-1' : ''}`}>
          <div>
            <h2 className="text-3xl font-semibold text-white">
              {mode === 'login' ? t('login.welcomeBack') : 'Create your account'}
            </h2>
            <p className="mt-2 text-base text-gray-400">
              {mode === 'login'
                ? t('login.loginSubtitle')
                : "You're just a few steps away from finding your next customers."}
            </p>
          </div>

          {mode === 'register' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
                  {registerSteps.map((item) => {
                    const isDone = registerStep > item.step;
                    const isActive = registerStep === item.step;
                    const Icon = item.icon;
                    return (
                      <div key={item.step} className="flex items-center justify-center gap-2 text-gray-300">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                            isDone
                              ? 'bg-emerald-500 text-white'
                              : isActive
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                        </span>
                        <span className={isActive ? 'text-white' : 'text-gray-400'}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
            <div className="space-y-4 lg:col-span-1">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                {mode === 'register' ? 'Continue with Google (Login only)' : t('login.continueWithGoogle')}
              </button>

              <div className="relative h-5">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f1220] px-2 text-xs uppercase tracking-widest text-gray-500">
                  {t('common.or')}
                </span>
              </div>
            </div>

            <div className="hidden h-full w-px bg-white/10 lg:block" />

            <form className="space-y-4 lg:col-span-1" onSubmit={handleEmailAuth}>
              <AnimatePresence mode="wait" initial={false}>
                {mode === 'login' ? (
                  <motion.div
                    key="login-step"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label htmlFor="auth-email" className="text-sm text-gray-300">
                        {t('login.email')}
                      </label>
                      <input
                        id="auth-email"
                        name="email"
                        type="email"
                        required
                        disabled={isSubmitting}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder={t('login.emailPlaceholder')}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="auth-password" className="text-sm text-gray-300">
                        {t('login.password')}
                      </label>
                      <input
                        id="auth-password"
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        disabled={isSubmitting}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={t('login.loginPasswordPlaceholder')}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <label className="inline-flex items-center gap-2 text-gray-400">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(event) => setRememberMe(event.target.checked)}
                          disabled={isSubmitting}
                          className="h-4 w-4 rounded border border-white/20 bg-white/5"
                        />
                        {t('login.rememberMe')}
                      </label>
                      <a href="#" className="text-blue-300 hover:text-blue-200 transition-colors">
                        {t('login.forgotPassword')}
                      </a>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`register-step-${registerStep}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-4"
                  >
                    {registerStep === 1 ? (
                      <>
                        <p className="text-sm text-gray-400">You're almost ready. Choose a strong password to keep your account secure.</p>

                        <div className="space-y-2">
                          <label className="text-sm text-gray-300">Name</label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(event) => {
                              setFullName(event.target.value);
                              if (inlineErrors.fullName) {
                                setInlineErrors((current) => ({ ...current, fullName: '' }));
                              }
                            }}
                            placeholder="Your full name"
                            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
                          />
                          {inlineErrors.fullName ? <p className="text-xs text-rose-300">{inlineErrors.fullName}</p> : null}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm text-gray-300">Email</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(event) => {
                              setEmail(event.target.value);
                              if (inlineErrors.email) {
                                setInlineErrors((current) => ({ ...current, email: '' }));
                              }
                            }}
                            placeholder={t('login.emailPlaceholder')}
                            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
                          />
                          {inlineErrors.email ? <p className="text-xs text-rose-300">{inlineErrors.email}</p> : null}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm text-gray-300">Password</label>
                          <input
                            type="password"
                            value={password}
                            onChange={(event) => {
                              setPassword(event.target.value);
                              if (inlineErrors.password) {
                                setInlineErrors((current) => ({ ...current, password: '' }));
                              }
                            }}
                            placeholder={t('login.registerPasswordPlaceholder')}
                            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
                          />
                          <div className="space-y-1">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400"
                                animate={{ width: `${(strength / 4) * 100}%` }}
                                transition={{ duration: 0.2 }}
                              />
                            </div>
                            <p className="text-xs text-gray-400">Password strength: {strengthLabel}</p>
                          </div>
                          {inlineErrors.password ? <p className="text-xs text-rose-300">{inlineErrors.password}</p> : null}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm text-gray-300">Confirm password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => {
                              setConfirmPassword(event.target.value);
                              if (inlineErrors.confirmPassword) {
                                setInlineErrors((current) => ({ ...current, confirmPassword: '' }));
                              }
                            }}
                            placeholder="Repeat your password"
                            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
                          />
                          {inlineErrors.confirmPassword ? (
                            <p className="text-xs text-rose-300">{inlineErrors.confirmPassword}</p>
                          ) : null}
                        </div>
                      </>
                    ) : null}

                    {registerStep === 2 ? (
                      <>
                        <div>
                          <h3 className="text-xl font-semibold text-white">Choose the plan that fits you best</h3>
                          <p className="mt-2 text-sm text-gray-400">You can change your plan anytime.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          {orderedPlans.map((plan) => {
                            const code = plan.code as BillingPlanCode;
                            const visual = PLAN_VISUALS[code];
                            const isSelected = selectedPlan === code;
                            const isExpert = code === 'EXPERT';

                            return (
                              <button
                                key={code}
                                type="button"
                                onClick={() => setSelectedPlan(code)}
                                className={`text-left rounded-3xl p-8 border transition-all ${
                                  isExpert
                                    ? 'border-2 border-cyan-300 bg-gradient-to-br from-cyan-500/20 via-emerald-500/15 to-lime-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.5),0_0_30px_rgba(34,211,238,0.38)]'
                                    : visual.highlighted
                                    ? 'bg-gradient-to-br from-white/10 to-white/[0.02] border-blue-500/30 shadow-xl shadow-blue-500/10 scale-105'
                                    : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10'
                                } ${isSelected ? 'ring-2 ring-blue-400/70' : ''}`}
                              >
                                {visual.badge ? (
                                  <div className="mb-4">
                                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-medium">
                                      {visual.badge}
                                    </span>
                                  </div>
                                ) : null}

                                <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                                <div className="flex items-baseline gap-2 mb-4">
                                  <span className="text-5xl font-bold text-white">{visual.price}</span>
                                  <span className="text-gray-400">/{visual.period}</span>
                                </div>
                                <p className="text-gray-400 mb-8">{visual.description}</p>

                                <div
                                  className={`w-full px-6 py-3 rounded-xl font-medium transition-all mb-8 text-center ${
                                    isSelected
                                      ? 'bg-white/15 text-white border border-white/20'
                                      : visual.highlighted
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                                        : isExpert
                                          ? 'bg-gradient-to-r from-cyan-300 via-emerald-300 to-lime-200 text-black shadow-[0_0_22px_rgba(34,211,238,0.55)]'
                                          : 'bg-white/5 text-white border border-white/10'
                                  }`}
                                >
                                  {isSelected ? 'Selected' : visual.cta}
                                </div>

                                <ul className="space-y-3">
                                  {visual.features.map((feature) => (
                                    <li key={`${code}-${feature}`} className="flex items-start gap-3">
                                      <div
                                        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                          visual.highlighted ? 'bg-blue-500/20' : 'bg-white/5'
                                        }`}
                                      >
                                        <Check className={`w-3 h-3 ${visual.highlighted ? 'text-blue-400' : 'text-gray-400'}`} />
                                      </div>
                                      <span className="text-gray-300 text-sm">{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </button>
                            );
                          })}
                        </div>

                        <p className="text-sm text-gray-400">No long-term commitment. Cancel anytime.</p>
                      </>
                    ) : null}

                    {registerStep === 3 ? (
                      <>
                        <div>
                          <h3 className="text-xl font-semibold text-white">Secure your subscription</h3>
                          <p className="mt-2 text-sm text-gray-400">Your payment is securely processed.</p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                            <Lock className="h-3.5 w-3.5" /> Secure payment
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-sm text-gray-300">Cardholder name</label>
                              <input
                                type="text"
                                value={cardholderName}
                                onChange={(event) => {
                                  setCardholderName(event.target.value);
                                  if (inlineErrors.cardholderName) {
                                    setInlineErrors((current) => ({ ...current, cardholderName: '' }));
                                  }
                                }}
                                placeholder="Name on card"
                                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
                              />
                              {inlineErrors.cardholderName ? (
                                <p className="text-xs text-rose-300">{inlineErrors.cardholderName}</p>
                              ) : null}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm text-gray-300">Card number</label>
                                <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                                  <CreditCard className="h-3.5 w-3.5" /> {cardBrand}
                                </span>
                              </div>
                              <input
                                type="text"
                                value={cardNumber}
                                onChange={(event) => {
                                  setCardNumber(formatCardNumber(event.target.value));
                                  if (inlineErrors.cardNumber) {
                                    setInlineErrors((current) => ({ ...current, cardNumber: '' }));
                                  }
                                }}
                                placeholder="4242 4242 4242 4242"
                                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
                              />
                              {inlineErrors.cardNumber ? <p className="text-xs text-rose-300">{inlineErrors.cardNumber}</p> : null}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-sm text-gray-300">Expiry date</label>
                                <input
                                  type="text"
                                  value={expiry}
                                  onChange={(event) => {
                                    setExpiry(formatExpiry(event.target.value));
                                    if (inlineErrors.expiry) {
                                      setInlineErrors((current) => ({ ...current, expiry: '' }));
                                    }
                                  }}
                                  placeholder="MM/YY"
                                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
                                />
                                {inlineErrors.expiry ? <p className="text-xs text-rose-300">{inlineErrors.expiry}</p> : null}
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm text-gray-300">CVC</label>
                                <input
                                  type="text"
                                  value={cvc}
                                  onChange={(event) => {
                                    setCvc(event.target.value.replace(/\D+/g, '').slice(0, 4));
                                    if (inlineErrors.cvc) {
                                      setInlineErrors((current) => ({ ...current, cvc: '' }));
                                    }
                                  }}
                                  placeholder="123"
                                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
                                />
                                {inlineErrors.cvc ? <p className="text-xs text-rose-300">{inlineErrors.cvc}</p> : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                {mode === 'register' && registerStep > 1 ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setRegisterStep((current) => (current - 1) as RegisterStep);
                      setStatusMessage(null);
                      setInlineErrors({});
                    }}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (mode === 'register' &&
                      ((registerStep === 1 && !stepOneValid) ||
                        (registerStep === 2 && !stepTwoValid) ||
                        (registerStep === 3 && !stepThreeValid)))
                  }
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <motion.span
                        className="h-3.5 w-3.5 rounded-full border-2 border-white/35 border-t-white"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      {t('login.authenticating')}
                    </span>
                  ) : mode === 'login' ? (
                    t('login.loginWithEmail')
                  ) : registerStep === 3 ? (
                    'Start my subscription'
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </form>
          </div>

          <button
            type="button"
            onClick={() => {
              setMode((currentMode) => (currentMode === 'login' ? 'register' : 'login'));
              setRegisterStep(1);
              setStatusMessage(null);
              setInlineErrors({});
            }}
            disabled={isSubmitting}
            className="w-full text-sm text-gray-300 hover:text-white transition-colors"
          >
            {mode === 'login' ? t('login.noAccount') : t('login.alreadyHaveAccount')}
          </button>

          {statusMessage ? (
            <p className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-xs leading-relaxed text-blue-200">
              {statusMessage}
            </p>
          ) : null}
          </div>
        </motion.div>
      </div>
    </>,
    document.body,
  );
}
