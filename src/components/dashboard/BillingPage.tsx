import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CreditCard, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  BillingPlan,
  BillingUsage,
  changeBillingPlanInBackend,
  fetchBillingPlansFromBackend,
  fetchBillingUsageFromBackend,
  mockBillingPaymentInBackend,
} from './api';
import { DashboardHeader } from './DashboardHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface BillingPageProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateBusinessProfile: () => void;
  onNavigateSavedSearches: () => void;
  onNavigateBilling: () => void;
  onNavigateAccountSettings: () => void;
  onLogout: () => void;
}

const planOrder: Array<'STANDARD' | 'PRO' | 'EXPERT'> = ['STANDARD', 'PRO', 'EXPERT'];

const billingPlanVisuals: Record<
  'STANDARD' | 'PRO' | 'EXPERT',
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
    price: '$49',
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
    price: '$79',
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

interface AnimatedProgressBarProps {
  percentage: number;
  variant: 'standard' | 'ai';
  label: string;
}

function AnimatedProgressBar({ percentage, variant, label }: AnimatedProgressBarProps) {
  const animatedPercentageRef = useRef(0);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    const target = Math.max(0, Math.min(100, percentage));
    const start = animatedPercentageRef.current;
    const duration = 950;
    const startTime = performance.now();
    let frameId: number | null = null;

    const step = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = start + (target - start) * easedProgress;

      animatedPercentageRef.current = nextValue;
      setAnimatedPercentage(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      }
    };

    frameId = window.requestAnimationFrame(step);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [percentage]);

  const gradientColors =
    variant === 'standard'
      ? 'linear-gradient(90deg, #3B82F6 0%, #A855F7 100%)'
      : 'linear-gradient(90deg, #22D3EE 0%, #3B82F6 100%)';

  const glowColor = variant === 'standard' ? 'rgba(168, 85, 247, 0.5)' : 'rgba(34, 211, 238, 0.5)';
  const safeAnimatedPercentage = Math.min(100, Math.max(0, animatedPercentage));
  const visibleFillPercentage = safeAnimatedPercentage <= 0 ? 0 : Math.max(safeAnimatedPercentage, 2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span className="text-sm text-[#94A3B8]">{label}</span>
        <span
          className="text-sm"
          style={{
            background: gradientColors,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 500,
          }}
        >
          {animatedPercentage.toFixed(1)}%
        </span>
      </div>

      <div
        className="group relative overflow-hidden rounded-full"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 9999,
          height: 12,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          className="relative h-full transition-all duration-1000 ease-out"
          style={{
            position: 'relative',
            display: 'block',
            height: '100%',
            width: `${visibleFillPercentage.toFixed(2)}%`,
            background: gradientColors,
            boxShadow: `0 0 12px ${glowColor}, 0 0 24px ${glowColor}`,
          }}
        >
          <div
            className="absolute inset-0 opacity-60"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: animatedPercentage > 0 ? 'shimmer 2.5s infinite' : 'none',
            }}
          />
        </div>

        {animatedPercentage > 0 ? (
          <div
            className="absolute top-0 bottom-0 transition-all duration-1000 ease-out group-hover:opacity-100"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 6,
              left: `${safeAnimatedPercentage.toFixed(2)}%`,
              background: variant === 'standard' ? '#A855F7' : '#22D3EE',
              boxShadow: `0 0 12px ${glowColor}`,
              filter: 'blur(3px)',
              opacity: 0.8,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'highlight';
}

function MetricCard({ label, value, variant = 'default' }: MetricCardProps) {
  const isHighlight = variant === 'highlight';

  return (
    <div
      className="billing-value-card rounded-xl p-4 backdrop-blur-sm transition-all duration-200 hover:border-[rgba(255,255,255,0.15)]"
      style={{
        flex: 1,
        minWidth: 0,
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div className="text-xs text-[#94A3B8]" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <div
        className={`billing-value text-2xl ${isHighlight ? '' : 'text-[#F8FAFC]'}`}
        style={
          isHighlight
            ? {
                marginBottom: 20,
                background: 'linear-gradient(135deg, #3B82F6 0%, #A855F7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 500,
              }
            : { fontWeight: 500, marginBottom: 20 }
        }
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

interface CurrentPlanModuleLabels {
  currentPlanTitle: string;
  currentPlanDescription: string;
  dailyLimit: string;
  usedToday: string;
  remainingToday: string;
  usageProgress: string;
  scrapeRefillRule: string;
  scrapeRefillAt: string;
  aiTokensTitle: string;
  aiTotal: string;
  aiUsed: string;
  aiRemaining: string;
  aiUsageProgress: string;
  aiRefillRule: string;
  aiRefillAt: string;
}

interface CurrentPlanModuleProps {
  usage: BillingUsage | null;
  planName: string;
  isLoading: boolean;
  labels: CurrentPlanModuleLabels;
}

function CurrentPlanModule({ usage, planName, isLoading, labels }: CurrentPlanModuleProps) {
  const dailyTokenLimit = usage?.dailyTokenLimit ?? 0;
  const tokensUsedToday = usage?.tokensUsedToday ?? 0;
  const tokensRemainingToday = usage?.tokensRemainingToday ?? Math.max(0, dailyTokenLimit - tokensUsedToday);
  const usageProgress =
    dailyTokenLimit > 0 ? Math.max(0, Math.min(100, (tokensUsedToday / dailyTokenLimit) * 100)) : 0;
  const now = new Date();
  const nextDailyReset = new Date(now);
  nextDailyReset.setHours(24, 0, 0, 0);
  const dailyRefillAt = nextDailyReset.toLocaleString();

  const aiTokensTotal = usage?.aiTokensTotal ?? 0;
  const aiTokensUsed = usage?.aiTokensUsed ?? 0;
  const aiTokensRemaining = usage?.aiTokensRemaining ?? Math.max(0, aiTokensTotal - aiTokensUsed);
  const aiUsageProgress =
    aiTokensTotal > 0 ? Math.max(0, Math.min(100, (aiTokensUsed / aiTokensTotal) * 100)) : 0;
  const aiPeriodEnd = usage?.aiPeriodEnd ? new Date(usage.aiPeriodEnd).toLocaleString() : null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8 backdrop-blur-xl"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl"
        style={{
          background: 'linear-gradient(135deg, #3B82F6 0%, #A855F7 100%)',
          opacity: 0.15,
        }}
      />

      <div className="relative space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl text-[#F8FAFC]" style={{ marginBottom: 20 }}>
              {labels.currentPlanTitle}
            </h2>
            <p className="text-sm text-[#94A3B8]" style={{ marginBottom: 8 }}>
              {labels.currentPlanDescription}
            </p>
          </div>
          <div
            className="rounded-full px-4 py-2 text-sm backdrop-blur-sm"
            style={{
              background:
                'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.2)',
              color: '#F8FAFC',
              fontWeight: 500,
            }}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                ...
              </span>
            ) : (
              planName
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="billing-metric-row" style={{ display: 'flex', gap: 16 }}>
            <MetricCard label={labels.dailyLimit} value={dailyTokenLimit} variant="highlight" />
            <MetricCard label={labels.usedToday} value={tokensUsedToday} />
            <MetricCard label={labels.remainingToday} value={tokensRemainingToday} />
          </div>

          <AnimatedProgressBar percentage={usageProgress} variant="standard" label={labels.usageProgress} />
          <p className="text-xs text-[#94A3B8]">{labels.scrapeRefillRule}</p>
          <p className="text-xs text-[#64748B]">
            {labels.scrapeRefillAt}: {dailyRefillAt}
          </p>
        </div>

        <div
          className="h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
          }}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3" style={{ marginBottom: 20 }}>
            <h3 className="text-lg text-[#F8FAFC]" style={{ marginTop: 20 }}>
              {labels.aiTokensTitle}
            </h3>
          </div>

          <div className="billing-metric-row" style={{ display: 'flex', gap: 16 }}>
            <MetricCard label={labels.aiTotal} value={aiTokensTotal} />
            <MetricCard label={labels.aiUsed} value={aiTokensUsed} />
            <MetricCard label={labels.aiRemaining} value={aiTokensRemaining} />
          </div>

          <AnimatedProgressBar percentage={aiUsageProgress} variant="ai" label={labels.aiUsageProgress} />
          <p className="text-xs text-[#94A3B8]">{labels.aiRefillRule}</p>
          <p className="text-xs text-[#64748B]">
            {labels.aiRefillAt}: {aiPeriodEnd ?? '-'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}

export function BillingPage({
  onNavigateHome,
  onNavigateDashboard,
  onNavigateBusinessProfile,
  onNavigateSavedSearches,
  onNavigateBilling,
  onNavigateAccountSettings,
  onLogout,
}: BillingPageProps) {
  const { t } = useI18n();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPlan, setIsChangingPlan] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [mockCardNumber, setMockCardNumber] = useState('4242 4242 4242 4242');
  const [mockExpiry, setMockExpiry] = useState('12/29');
  const [mockCvc, setMockCvc] = useState('123');
  const [mockCardholderName, setMockCardholderName] = useState('Lead Generator User');

  const orderedPlans = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          planOrder.indexOf(a.code as (typeof planOrder)[number]) -
          planOrder.indexOf(b.code as (typeof planOrder)[number]),
      ),
    [plans],
  );

  const loadBillingData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [loadedPlans, loadedUsage] = await Promise.all([
        fetchBillingPlansFromBackend(),
        fetchBillingUsageFromBackend(),
      ]);
      setPlans(loadedPlans);
      setUsage(loadedUsage);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t('billingPage.errors.loadFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBillingData();
  }, []);

  const handleChangePlan = async (planCode: 'STANDARD' | 'PRO' | 'EXPERT') => {
    setIsChangingPlan(planCode);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const updatedUsage = await changeBillingPlanInBackend(planCode);
      setUsage(updatedUsage);
      setNoticeMessage(t('billingPage.notices.planUpdated'));
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t('billingPage.errors.planUpdateFailed'));
      }
    } finally {
      setIsChangingPlan(null);
    }
  };

  const handleMockPaymentSave = async () => {
    setIsSavingPayment(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      await mockBillingPaymentInBackend({
        cardNumber: mockCardNumber,
        expiry: mockExpiry,
        cvc: mockCvc,
        cardholderName: mockCardholderName,
      });
      const updatedUsage = await fetchBillingUsageFromBackend();
      setUsage(updatedUsage);
      setNoticeMessage(t('billingPage.notices.paymentUpdated'));
      setIsPaymentModalOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t('billingPage.errors.paymentFailed'));
      }
    } finally {
      setIsSavingPayment(false);
    }
  };

  const currentPlan = usage ? plans.find((plan) => plan.code === usage.plan) ?? null : null;
  const currentPlanLabels: CurrentPlanModuleLabels = {
    currentPlanTitle: t('billingPage.currentPlan.title'),
    currentPlanDescription: t('billingPage.currentPlan.description'),
    dailyLimit: t('billingPage.currentPlan.dailyLimit'),
    usedToday: t('billingPage.currentPlan.usedToday'),
    remainingToday: t('billingPage.currentPlan.remainingToday'),
    usageProgress: t('billingPage.currentPlan.usageProgress'),
    scrapeRefillRule: t('billingPage.currentPlan.scrapeRefillRule'),
    scrapeRefillAt: t('billingPage.currentPlan.scrapeRefillAt'),
    aiTokensTitle: t('billingPage.currentPlan.aiTokensTitle'),
    aiTotal: t('billingPage.currentPlan.aiTotal'),
    aiUsed: t('billingPage.currentPlan.aiUsed'),
    aiRemaining: t('billingPage.currentPlan.aiRemaining'),
    aiUsageProgress: t('billingPage.currentPlan.aiUsageProgress'),
    aiRefillRule: t('billingPage.currentPlan.aiRefillRule'),
    aiRefillAt: t('billingPage.currentPlan.aiRefillAt'),
  };

  return (
    <>
      <DashboardHeader
        onNavigateHome={onNavigateHome}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateBusinessProfile={onNavigateBusinessProfile}
        onNavigateSavedSearches={onNavigateSavedSearches}
        onNavigateBilling={onNavigateBilling}
        onNavigateAccountSettings={onNavigateAccountSettings}
        onLogout={onLogout}
      />

      <main className="billing-page relative mx-auto max-w-7xl px-6 py-24">
        <section>
          <h1 className="text-4xl font-bold" style={{ marginBottom: 20 }}>
            {t('billingPage.title')}
          </h1>
          <p className="text-gray-400" style={{ marginBottom: 8 }}>
            {t('billingPage.subtitle')}
          </p>
        </section>

        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {noticeMessage ? (
          <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {noticeMessage}
          </div>
        ) : null}

        <div className="mt-8 grid gap-8">
          <CurrentPlanModule
            usage={usage}
            isLoading={isLoading}
            planName={currentPlan?.name ?? usage?.plan ?? '-'}
            labels={currentPlanLabels}
          />

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white" style={{ marginBottom: 20 }}>
              {t('billingPage.changePlan.title')}
            </h2>
            <p className="text-sm text-gray-400" style={{ marginBottom: 8 }}>
              {t('billingPage.changePlan.description')}
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {orderedPlans.map((plan) => {
                const isCurrent = usage?.plan === plan.code;
                const isPending = isChangingPlan === plan.code;
                const visual = billingPlanVisuals[plan.code as 'STANDARD' | 'PRO' | 'EXPERT'];
                const isPro = plan.code === 'PRO';
                const isExpert = plan.code === 'EXPERT';
                const showPlanBadge = Boolean(visual.badge) && !isExpert;
                const planFeatures = visual.features;

                return (
                  <div
                    key={plan.code}
                    className={`rounded-3xl border p-8 transition-all ${
                      isPro
                        ? 'bg-gradient-to-br from-white/10 to-white/[0.02] border-blue-500/30 shadow-xl shadow-blue-500/10 scale-105'
                        : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10'
                    }`}
                  >
                    {showPlanBadge ? (
                      <div className="mb-4">
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-medium">
                          {visual.badge}
                        </span>
                      </div>
                    ) : null}

                    <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-5xl font-bold text-white">{visual.price}</span>
                      <span className="text-gray-400">{visual.period}</span>
                    </div>
                    <p className="text-gray-400 mb-8">{visual.description}</p>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (isCurrent) {
                          return;
                        }
                        void handleChangePlan(plan.code);
                      }}
                      className={`w-full px-6 py-3 rounded-xl font-medium transition-all mb-8 ${
                        isPro
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {isPending ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('billingPage.changePlan.updating')}
                        </span>
                      ) : isCurrent ? (
                        t('billingPage.changePlan.current')
                      ) : (
                        visual.cta
                      )}
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
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-[10px] text-xl font-semibold text-white">{t('billingPage.paymentMethod.title')}</h2>
            <p className="mb-[10px] text-sm text-gray-400">{t('billingPage.paymentMethod.description')}</p>

            <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center">
              <div className="inline-flex items-center gap-3 text-gray-200">
                <CreditCard className="h-5 w-5" />
                <span>{t('billingPage.paymentMethod.mockCard')}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                {t('billingPage.paymentMethod.updateButton')}
              </button>
            </div>
          </section>

        </div>
      </main>

      <style>{`
        .billing-page p {
          margin-bottom: 8px;
        }
        .billing-page h1,
        .billing-page h2,
        .billing-page h3,
        .billing-page h4,
        .billing-page .billing-value {
          margin-bottom: 20px;
        }
      `}</style>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md border border-white/15 bg-[#121521] p-6 text-white" hideCloseButton>
          <DialogHeader>
            <DialogTitle>{t('billingPage.paymentMethod.modalTitle')}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <label className="block text-sm text-gray-300">
              {t('billingPage.paymentMethod.cardNumberLabel')}
              <input
                type="text"
                value={mockCardNumber}
                onChange={(event) => setMockCardNumber(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-blue-400/60"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-gray-300">
                {t('billingPage.paymentMethod.expiryLabel')}
                <input
                  type="text"
                  value={mockExpiry}
                  onChange={(event) => setMockExpiry(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-blue-400/60"
                />
              </label>

              <label className="block text-sm text-gray-300">
                {t('billingPage.paymentMethod.cvcLabel')}
                <input
                  type="text"
                  value={mockCvc}
                  onChange={(event) => setMockCvc(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-blue-400/60"
                />
              </label>
            </div>

            <label className="block text-sm text-gray-300">
              {t('billingPage.paymentMethod.cardholderLabel')}
              <input
                type="text"
                value={mockCardholderName}
                onChange={(event) => setMockCardholderName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-blue-400/60"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={isSavingPayment}
              className="rounded-lg border border-white/20 bg-transparent px-4 py-2 text-sm text-gray-200 transition hover:bg-white/10 disabled:opacity-50"
            >
              {t('billingPage.actions.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleMockPaymentSave()}
              disabled={isSavingPayment}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-purple-700 disabled:opacity-60"
            >
              {isSavingPayment ? t('billingPage.actions.saving') : t('billingPage.actions.save')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
