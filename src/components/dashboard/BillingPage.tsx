import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CreditCard, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  BackendApiError,
  BillingPlan,
  BillingUsage,
  cancelSubscriptionAtPeriodEndInBackend,
  changeBillingPlanInBackend,
  createBillingPortalSessionInBackend,
  createCheckoutSessionInBackend,
  fetchAccountDetailsFromBackend,
  fetchBillingPlansFromBackend,
  fetchBillingUsageFromBackend,
  skipTrialNowInBackend,
} from './api';
import { DashboardHeader } from './DashboardHeader';
import { toFriendlyErrorFromUnknown } from '../../lib/errorMessaging';
import { AppAlertToast } from '../ui/AppAlertToast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface BillingPageProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateBusinessProfile: () => void;
  onNavigateSavedSearches: () => void;
  onNavigateBilling: () => void;
  onNavigateAccountSettings: () => void;
  onLogout: () => void;
  billingAccessStatus: boolean | null;
}

type PlanCode = 'STANDARD' | 'PRO' | 'EXPERT';
type PlanChangeDirection = 'upgrade' | 'downgrade' | 'same' | 'unknown';

const planOrder: PlanCode[] = ['STANDARD', 'PRO', 'EXPERT'];
const fallbackDailyTokenLimits: Record<PlanCode, number> = {
  STANDARD: 180,
  PRO: 380,
  EXPERT: 700,
};

type SubscriptionPlanVisual = {
  price: string;
  period: string;
  description: string;
  cta: string;
  badge?: string;
  features: string[];
};

const FALLBACK_SUBSCRIPTION_PLAN_VISUALS: Record<
  PlanCode,
  SubscriptionPlanVisual
> = {
  STANDARD: {
    price: '€39',
    period: 'per month',
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
    period: 'per month',
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
    period: 'per month',
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

const formatDateTime = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleString();
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
  trialActiveTitle: string;
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
  trialTokenNotice: string | null;
  isLoading: boolean;
  labels: CurrentPlanModuleLabels;
}

interface PendingPlanChange {
  planCode: PlanCode;
  planName: string;
  price: string;
  period: string;
}

const getPlanChangeDirection = (
  currentPlan: string | null | undefined,
  nextPlan: PlanCode | null
): PlanChangeDirection => {
  if (!currentPlan || !nextPlan) {
    return 'unknown';
  }

  if (!planOrder.includes(currentPlan as PlanCode)) {
    return 'unknown';
  }

  const currentIndex = planOrder.indexOf(currentPlan as PlanCode);
  const nextIndex = planOrder.indexOf(nextPlan);

  if (nextIndex > currentIndex) {
    return 'upgrade';
  }

  if (nextIndex < currentIndex) {
    return 'downgrade';
  }

  return 'same';
};

function CurrentPlanModule({
  usage,
  planName,
  trialTokenNotice,
  isLoading,
  labels,
}: CurrentPlanModuleProps) {
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
          <div style={trialTokenNotice ? { paddingBottom: 10 } : undefined}>
            <h2 className="text-2xl text-[#F8FAFC]" style={{ marginBottom: 20 }}>
              {labels.currentPlanTitle}
            </h2>
            <p className="text-sm text-[#94A3B8]" style={{ marginBottom: 8 }}>
              {labels.currentPlanDescription}
            </p>
            {trialTokenNotice ? (
              <div
                className="mt-3 mb-[10px] rounded-xl border px-4 py-3"
                style={{
                  marginBottom: '10px',
                  borderColor: 'rgba(251, 191, 36, 0.35)',
                  background:
                    'linear-gradient(135deg, rgba(146, 64, 14, 0.25), rgba(15, 23, 42, 0.22))',
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide text-amber-200"
                  style={{ marginBottom: 6 }}
                >
                  {labels.trialActiveTitle}
                </p>
                <p className="text-sm text-amber-100/90" style={{ marginBottom: 10 }}>
                  {trialTokenNotice}
                </p>
              </div>
            ) : null}
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
                <Loader2 className="spin-loader h-4 w-4" />
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
  billingAccessStatus,
}: BillingPageProps) {
  const { t, raw } = useI18n();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPlan, setIsChangingPlan] = useState<string | null>(null);
  const [isPlanChangeDialogOpen, setIsPlanChangeDialogOpen] = useState(false);
  const [pendingPlanChange, setPendingPlanChange] = useState<PendingPlanChange | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isSettingUpPaymentMethod, setIsSettingUpPaymentMethod] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [isSkipTrialDialogOpen, setIsSkipTrialDialogOpen] = useState(false);
  const [isSkippingTrial, setIsSkippingTrial] = useState(false);
  const [scheduledCancellationAt, setScheduledCancellationAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const subscriptionPlanVisuals =
    raw<Record<PlanCode, SubscriptionPlanVisual> | undefined>(
      'subscriptionPlans.plans',
    ) ?? FALLBACK_SUBSCRIPTION_PLAN_VISUALS;

  const orderedPlans = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          planOrder.indexOf(a.code as PlanCode) -
          planOrder.indexOf(b.code as PlanCode),
      ),
    [plans],
  );
  const planChangeDirection = getPlanChangeDirection(
    usage?.plan,
    pendingPlanChange?.planCode ?? null
  );

  const loadBillingData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [loadedPlans, loadedUsage, accountDetails] = await Promise.all([
        fetchBillingPlansFromBackend(),
        fetchBillingUsageFromBackend(),
        fetchAccountDetailsFromBackend(),
      ]);
      setPlans(loadedPlans);
      setUsage(loadedUsage);
      setScheduledCancellationAt(accountDetails.currentPeriodEnd);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(toFriendlyErrorFromUnknown(error));
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

  const redirectToCheckout = async (planCode: PlanCode) => {
    const checkout = await createCheckoutSessionInBackend(planCode);
    setNoticeMessage(t('billingPage.notices.redirectingToCheckout'));
    window.location.assign(checkout.url);
  };

  const handleChangePlan = async (planCode: PlanCode) => {
    setIsChangingPlan(planCode);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const updatedUsage = await changeBillingPlanInBackend(planCode);
      setUsage(updatedUsage);
      setNoticeMessage(t('billingPage.notices.planUpdated'));
    } catch (error) {
      if (error instanceof BackendApiError && error.code === 'CHECKOUT_REQUIRED') {
        try {
          await redirectToCheckout(planCode);
          return;
        } catch (checkoutError) {
          if (checkoutError instanceof Error) {
            setErrorMessage(toFriendlyErrorFromUnknown(checkoutError));
          } else {
            setErrorMessage(t('billingPage.errors.checkoutFailed'));
          }
          return;
        }
      }
      if (error instanceof Error) {
        setErrorMessage(toFriendlyErrorFromUnknown(error));
      } else {
        setErrorMessage(t('billingPage.errors.planUpdateFailed'));
      }
    } finally {
      setIsChangingPlan(null);
    }
  };

  const openPlanChangeDialog = (input: PendingPlanChange) => {
    setPendingPlanChange(input);
    setIsPlanChangeDialogOpen(true);
  };

  const handleConfirmPlanChange = async () => {
    if (!pendingPlanChange || isChangingPlan) {
      return;
    }

    const planToApply = pendingPlanChange.planCode;
    setIsPlanChangeDialogOpen(false);
    setPendingPlanChange(null);
    await handleChangePlan(planToApply);
  };

  const handleOpenBillingPortal = async () => {
    setIsOpeningPortal(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const portal = await createBillingPortalSessionInBackend();
      setNoticeMessage(t('billingPage.notices.redirectingToPortal'));
      window.location.assign(portal.url);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(toFriendlyErrorFromUnknown(error));
      } else {
        setErrorMessage(t('billingPage.errors.portalFailed'));
      }
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleSetupPaymentMethod = async () => {
    setIsSettingUpPaymentMethod(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const checkoutPlan =
        usage?.plan === 'STANDARD' || usage?.plan === 'PRO' || usage?.plan === 'EXPERT'
          ? usage.plan
          : 'STANDARD';
      await redirectToCheckout(checkoutPlan);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(toFriendlyErrorFromUnknown(error));
      } else {
        setErrorMessage(t('billingPage.errors.checkoutFailed'));
      }
    } finally {
      setIsSettingUpPaymentMethod(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancellingSubscription(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const cancellation = await cancelSubscriptionAtPeriodEndInBackend();
      setUsage((current) =>
        current
          ? {
              ...current,
              plan: cancellation.plan,
              subscriptionStatus: cancellation.subscriptionStatus,
            }
          : current,
      );
      setScheduledCancellationAt(cancellation.currentPeriodEnd);

      const endDateLabel = formatDateTime(cancellation.currentPeriodEnd);
      setNoticeMessage(
        endDateLabel
          ? t('billingPage.notices.cancellationScheduledWithDate', { date: endDateLabel })
          : t('billingPage.notices.cancellationScheduled'),
      );
      setIsCancelDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(toFriendlyErrorFromUnknown(error));
      } else {
        setErrorMessage(t('billingPage.errors.cancelFailed'));
      }
    } finally {
      setIsCancellingSubscription(false);
    }
  };

  const handleSkipTrialNow = async () => {
    setIsSkippingTrial(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      await skipTrialNowInBackend();
      await loadBillingData();
      setNoticeMessage(t('billingPage.notices.trialSkipped'));
      setIsSkipTrialDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(toFriendlyErrorFromUnknown(error));
      } else {
        setErrorMessage(t('billingPage.errors.skipTrialFailed'));
      }
    } finally {
      setIsSkippingTrial(false);
    }
  };

  const currentPlan = usage ? plans.find((plan) => plan.code === usage.plan) ?? null : null;
  const currentPlanNameForDialog = currentPlan?.name ?? usage?.plan ?? '-';
  const planChangeDirectionLabel =
    planChangeDirection === 'upgrade'
      ? t('billingPage.changePlan.dialogDirectionUpgrade')
      : planChangeDirection === 'downgrade'
        ? t('billingPage.changePlan.dialogDirectionDowngrade')
        : t('billingPage.changePlan.dialogDirectionChange');
  const planChangeVisual =
    planChangeDirection === 'downgrade'
      ? {
          badgeBorder: '1px solid rgba(52, 211, 153, 0.45)',
          badgeBackground:
            'linear-gradient(135deg, rgba(6, 95, 70, 0.5), rgba(37, 99, 235, 0.2))',
          badgeText: 'rgb(167, 243, 208)',
          actionBorder: '1px solid rgba(52, 211, 153, 0.68)',
          actionBackground:
            'linear-gradient(135deg, rgba(5, 150, 105, 0.9), rgba(37, 99, 235, 0.88))',
          actionShadow:
            '0 0 0 1px rgba(52, 211, 153, 0.2), 0 10px 26px rgba(6, 78, 59, 0.45)',
        }
      : planChangeDirection === 'upgrade'
        ? {
            badgeBorder: '1px solid rgba(96, 165, 250, 0.45)',
            badgeBackground:
              'linear-gradient(135deg, rgba(29, 78, 216, 0.45), rgba(124, 58, 237, 0.22))',
            badgeText: 'rgb(191, 219, 254)',
            actionBorder: '1px solid rgba(96, 165, 250, 0.72)',
            actionBackground:
              'linear-gradient(135deg, rgba(37, 99, 235, 0.88), rgba(124, 58, 237, 0.88))',
            actionShadow:
              '0 0 0 1px rgba(96, 165, 250, 0.24), 0 10px 30px rgba(49, 46, 129, 0.35)',
          }
        : {
            badgeBorder: '1px solid rgba(148, 163, 184, 0.45)',
            badgeBackground: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(71, 85, 105, 0.3))',
            badgeText: 'rgb(226, 232, 240)',
            actionBorder: '1px solid rgba(148, 163, 184, 0.62)',
            actionBackground:
              'linear-gradient(135deg, rgba(71, 85, 105, 0.88), rgba(100, 116, 139, 0.88))',
            actionShadow: '0 0 0 1px rgba(148, 163, 184, 0.2), 0 8px 24px rgba(15, 23, 42, 0.35)',
          };
  const currentPlanLabels: CurrentPlanModuleLabels = {
    currentPlanTitle: t('billingPage.currentPlan.title'),
    currentPlanDescription: t('billingPage.currentPlan.description'),
    trialActiveTitle: t('billingPage.currentPlan.trialActiveTitle'),
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
  const hasFeatureAccessFromUsage = useMemo(() => {
    if (!usage) {
      return null;
    }

    const status = usage.subscriptionStatus.toLowerCase();
    const periodEnd = scheduledCancellationAt
      ? Date.parse(scheduledCancellationAt)
      : Number.NaN;
    const hasFuturePeriodEnd = Number.isFinite(periodEnd) && periodEnd > Date.now();

    return (
      status === 'active' ||
      status === 'trialing' ||
      status === 'past_due' ||
      (status === 'cancelled' && hasFuturePeriodEnd)
    );
  }, [scheduledCancellationAt, usage]);
  const isBillingRestricted =
    billingAccessStatus === false || hasFeatureAccessFromUsage === false;
  const isTrialingSubscription = usage?.subscriptionStatus.toLowerCase() === 'trialing';
  const purchasedPlanDailyLimit = useMemo(() => {
    if (!usage) {
      return null;
    }

    const tokenLimitFromPlans = plans.find((plan) => plan.code === usage.plan)?.dailyTokenLimit;
    if (typeof tokenLimitFromPlans === 'number' && Number.isFinite(tokenLimitFromPlans)) {
      return tokenLimitFromPlans;
    }

    if (usage.plan === 'STANDARD' || usage.plan === 'PRO' || usage.plan === 'EXPERT') {
      return fallbackDailyTokenLimits[usage.plan];
    }

    return null;
  }, [plans, usage]);
  const trialTokenNotice =
    isTrialingSubscription && purchasedPlanDailyLimit
      ? t('billingPage.currentPlan.trialTokenNotice', {
          planName: currentPlan?.name ?? usage?.plan ?? 'STANDARD',
          tokenLimit: purchasedPlanDailyLimit,
        })
      : null;

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
        hideAccountMenu={isBillingRestricted}
        hideDashboardButton={isBillingRestricted}
      />

      <main
        className="billing-page relative mx-auto w-full max-w-7xl overflow-x-clip px-3 py-16 sm:px-6 sm:py-24"
        style={{ paddingBottom: 'calc(6rem + 20px)' }}
      >
        <section>
          <h1 className="text-4xl font-bold" style={{ marginBottom: 20 }}>
            {t('billingPage.title')}
          </h1>
          <p className="text-gray-400" style={{ marginBottom: 8 }}>
            {t('billingPage.subtitle')}
          </p>
        </section>

        {isBillingRestricted ? (
          <section
            className="mt-8 rounded-2xl border p-6"
            style={{
              borderColor: 'rgba(250, 204, 21, 0.4)',
              background:
                'linear-gradient(135deg, rgba(120, 53, 15, 0.38), rgba(31, 41, 55, 0.25))',
              marginBottom: 20,
            }}
          >
            <h2 className="text-xl font-semibold text-amber-100" style={{ marginBottom: 8 }}>
              {t('billingPage.accessRequired.title')}
            </h2>
            <p className="text-sm text-amber-50/90" style={{ marginBottom: 0 }}>
              {t('billingPage.accessRequired.description')}
            </p>
          </section>
        ) : null}

        <div className="mt-8 grid gap-8">
          <CurrentPlanModule
            usage={usage}
            isLoading={isLoading}
            planName={currentPlan?.name ?? usage?.plan ?? '-'}
            trialTokenNotice={trialTokenNotice}
            labels={currentPlanLabels}
          />

          <section
            className="rounded-2xl border p-6"
            style={{
              borderColor: 'rgba(96, 165, 250, 0.25)',
              background:
                'linear-gradient(145deg, rgba(30, 41, 59, 0.76), rgba(15, 23, 42, 0.68) 42%, rgba(30, 27, 75, 0.56))',
              boxShadow: '0 14px 36px rgba(2, 6, 23, 0.32)',
            }}
          >
            <h2 className="text-xl font-semibold text-white" style={{ marginBottom: 20 }}>
              {t('billingPage.changePlan.title')}
            </h2>
            <p className="text-sm text-gray-400" style={{ marginBottom: 8 }}>
              {t('billingPage.changePlan.description')}
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {orderedPlans.map((plan) => {
                const isAnyPlanChanging = Boolean(isChangingPlan);
                const isCurrent = usage?.plan === plan.code;
                const isPending = isChangingPlan === plan.code;
                const isCurrentChanging = isCurrent && isAnyPlanChanging;
                const visual = subscriptionPlanVisuals[plan.code as PlanCode];
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
                      disabled={isPending || isAnyPlanChanging}
                      onClick={() => {
                        if (isCurrent) {
                          return;
                        }
                        openPlanChangeDialog({
                          planCode: plan.code as PlanCode,
                          planName: plan.name,
                          price: visual.price,
                          period: visual.period,
                        });
                      }}
                      className={`w-full px-6 py-3 rounded-xl font-medium transition-all mb-8 ${
                        isPro
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {isPending || isCurrentChanging ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="spin-loader h-4 w-4" />
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

          <section
            className="rounded-2xl border p-6"
            style={{
              borderColor: 'rgba(45, 212, 191, 0.26)',
              background:
                'linear-gradient(145deg, rgba(15, 23, 42, 0.76), rgba(6, 78, 59, 0.2) 40%, rgba(8, 47, 73, 0.4))',
            }}
          >
            <h2 className="mb-[10px] text-xl font-semibold text-white">{t('billingPage.paymentMethod.title')}</h2>
            <p className="mb-[10px] text-sm text-gray-400">{t('billingPage.paymentMethod.description')}</p>

            <div
              className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border p-4 md:flex-row md:items-center"
              style={{
                borderColor: 'rgba(45, 212, 191, 0.24)',
                background: 'linear-gradient(135deg, rgba(8, 47, 73, 0.32), rgba(15, 23, 42, 0.5))',
              }}
            >
              <div className="inline-flex items-center gap-3 text-gray-200">
                <CreditCard className="h-5 w-5" />
                <span>{t('billingPage.paymentMethod.stripeManaged')}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isBillingRestricted ? (
                  <button
                    type="button"
                    onClick={() => void handleSetupPaymentMethod()}
                    disabled={isOpeningPortal || isSettingUpPaymentMethod}
                    className="inline-flex items-center justify-center rounded-lg border px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      height: '40px',
                      minWidth: '260px',
                      borderColor: 'rgba(147, 197, 253, 0.45)',
                      background: 'linear-gradient(90deg, rgba(37, 99, 235, 1) 0%, rgba(147, 51, 234, 1) 100%)',
                      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.35)',
                    }}
                  >
                    {isSettingUpPaymentMethod
                      ? t('billingPage.changePlan.updating')
                      : t('billingPage.paymentMethod.addButton')}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleOpenBillingPortal()}
                  disabled={isOpeningPortal || isSettingUpPaymentMethod}
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ height: '40px' }}
                >
                  {isOpeningPortal
                    ? t('billingPage.changePlan.updating')
                    : t('billingPage.paymentMethod.updateButton')}
                </button>
              </div>
            </div>
          </section>

          {isTrialingSubscription ? (
            <section className="rounded-2xl border border-amber-300/25 bg-amber-500/5 p-6">
              <h2 className="mb-[10px] text-xl font-semibold text-amber-100">
                {t('billingPage.skipTrial.title')}
              </h2>
              <p className="mb-[10px] text-sm text-amber-50/90">
                {t('billingPage.skipTrial.description')}
              </p>
              <button
                type="button"
                onClick={() => setIsSkipTrialDialogOpen(true)}
                disabled={isSkippingTrial}
                className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  borderColor: 'rgba(253, 186, 116, 0.55)',
                  background:
                    'linear-gradient(90deg, rgba(234, 88, 12, 0.9) 0%, rgba(249, 115, 22, 0.9) 100%)',
                  boxShadow: '0 10px 24px rgba(194, 65, 12, 0.3)',
                }}
              >
                {isSkippingTrial
                  ? t('billingPage.skipTrial.processing')
                  : t('billingPage.skipTrial.action')}
              </button>
            </section>
          ) : null}

          <section
            className="rounded-2xl border p-6"
            style={{
              borderColor: 'rgba(251, 113, 133, 0.24)',
              background:
                'linear-gradient(145deg, rgba(15, 23, 42, 0.72), rgba(76, 5, 25, 0.28) 45%, rgba(51, 65, 85, 0.6))',
            }}
          >
            <h2 className="mb-[10px] text-xl font-semibold text-white">{t('billingPage.cancellation.title')}</h2>
            <p className="mb-[10px] text-sm text-gray-400">{t('billingPage.cancellation.description')}</p>
            {scheduledCancellationAt ? (
              <p className="mb-[10px] text-xs text-gray-300">
                {t('billingPage.cancellation.currentPeriodEnd')}: {formatDateTime(scheduledCancellationAt) ?? '-'}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setIsCancelDialogOpen(true)}
              disabled={isCancellingSubscription}
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancellingSubscription
                ? t('billingPage.cancellation.cancelling')
                : t('billingPage.cancellation.action')}
            </button>
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
      <AppAlertToast
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
        variant="error"
      />
      <AppAlertToast
        message={noticeMessage}
        onClose={() => setNoticeMessage(null)}
        variant="info"
      />

      <AlertDialog
        open={isPlanChangeDialogOpen}
        onOpenChange={(open) => {
          setIsPlanChangeDialogOpen(open);
          if (!open) {
            setPendingPlanChange(null);
          }
        }}
      >
        <AlertDialogContent
          className="text-white"
          style={{
            border: '1px solid rgba(148, 163, 184, 0.3)',
            background:
              'linear-gradient(155deg, rgba(21, 18, 25, 0.98), rgba(9, 12, 25, 0.98))',
            boxShadow:
              '0 24px 70px rgba(2, 6, 23, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          }}
        >
          <AlertDialogHeader style={{ display: 'grid', gap: 14 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content',
                borderRadius: 9999,
                border: planChangeVisual.badgeBorder,
                background: planChangeVisual.badgeBackground,
                color: planChangeVisual.badgeText,
                padding: '7px 12px',
                fontSize: 12,
                letterSpacing: 0.25,
                fontWeight: 700,
              }}
            >
              {planChangeDirectionLabel}
            </div>
            <AlertDialogTitle style={{ fontSize: '1.32rem', lineHeight: 1.2, color: 'rgb(248, 250, 252)' }}>
              {t('billingPage.changePlan.dialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'rgb(203, 213, 225)', lineHeight: 1.55 }}>
              {t('billingPage.changePlan.dialogDescription', {
                plan: pendingPlanChange?.planName ?? '-',
                price: pendingPlanChange?.price ?? '-',
                period: pendingPlanChange?.period ?? '',
              })}
            </AlertDialogDescription>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  background: 'rgba(15, 23, 42, 0.52)',
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    color: 'rgb(148, 163, 184)',
                    fontSize: 11,
                    letterSpacing: 0.35,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  {t('billingPage.changePlan.dialogCurrentPlanLabel')}
                </div>
                <div style={{ color: 'rgb(241, 245, 249)', fontSize: 15, fontWeight: 600 }}>
                  {currentPlanNameForDialog}
                </div>
              </div>
              <div
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  background: 'rgba(15, 23, 42, 0.52)',
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    color: 'rgb(148, 163, 184)',
                    fontSize: 11,
                    letterSpacing: 0.35,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  {t('billingPage.changePlan.dialogNewPlanLabel')}
                </div>
                <div style={{ color: 'rgb(241, 245, 249)', fontSize: 15, fontWeight: 600 }}>
                  {pendingPlanChange?.planName ?? '-'}
                </div>
              </div>
            </div>

            <div
              style={{
                borderRadius: 12,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(2, 6, 23, 0.45)',
                padding: '11px 12px',
                display: 'grid',
                gap: 7,
              }}
            >
              <span style={{ display: 'block', color: 'rgb(203, 213, 225)', fontSize: 13 }}>
                {t('billingPage.changePlan.dialogProrationNote')}
              </span>
              {planChangeDirection === 'downgrade' ? (
                <span style={{ display: 'block', color: 'rgb(167, 243, 208)', fontSize: 13 }}>
                  {t('billingPage.changePlan.dialogDowngradeCreditNote')}
                </span>
              ) : null}
              {planChangeDirection === 'upgrade' ? (
                <span style={{ display: 'block', color: 'rgb(191, 219, 254)', fontSize: 13 }}>
                  {t('billingPage.changePlan.dialogUpgradeChargeNote')}
                </span>
              ) : null}
              {scheduledCancellationAt ? (
                <span style={{ display: 'block', color: 'rgb(148, 163, 184)', fontSize: 12 }}>
                  {t('billingPage.changePlan.dialogCurrentCycleEnd', {
                    date: formatDateTime(scheduledCancellationAt) ?? '-',
                  })}
                </span>
              ) : null}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter
            className="!flex !flex-row !items-center !justify-center gap-3"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              width: '100%',
              marginTop: '0.25rem',
            }}
          >
            <AlertDialogCancel
              className="min-w-[180px]"
              style={{
                minWidth: '180px',
                borderRadius: '0.65rem',
                border: '1px solid rgba(148, 163, 184, 0.42)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'rgb(226, 232, 240)',
                padding: '0.55rem 1rem',
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              {t('billingPage.changePlan.dialogCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmPlanChange();
              }}
              disabled={!pendingPlanChange || Boolean(isChangingPlan)}
              className="min-w-[180px]"
              style={{
                minWidth: '180px',
                borderRadius: '0.65rem',
                border: planChangeVisual.actionBorder,
                background: planChangeVisual.actionBackground,
                color: 'rgb(255, 255, 255)',
                padding: '0.55rem 1rem',
                textAlign: 'center',
                fontWeight: 700,
                boxShadow: planChangeVisual.actionShadow,
                opacity: !pendingPlanChange || isChangingPlan ? 0.7 : 1,
              }}
            >
              {t('billingPage.changePlan.dialogConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isSkipTrialDialogOpen} onOpenChange={setIsSkipTrialDialogOpen}>
        <AlertDialogContent
          className="text-white"
          style={{
            border: '1px solid rgba(251, 191, 36, 0.34)',
            background:
              'linear-gradient(160deg, rgba(34, 20, 10, 0.98), rgba(16, 18, 30, 0.98))',
            boxShadow:
              '0 24px 70px rgba(2, 6, 23, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          }}
        >
          <AlertDialogHeader style={{ display: 'grid', gap: 14 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content',
                borderRadius: 9999,
                border: '1px solid rgba(251, 191, 36, 0.48)',
                background:
                  'linear-gradient(135deg, rgba(146, 64, 14, 0.58), rgba(245, 158, 11, 0.26))',
                color: 'rgb(253, 230, 138)',
                padding: '7px 12px',
                fontSize: 12,
                letterSpacing: 0.25,
                fontWeight: 700,
              }}
            >
              {t('billingPage.skipTrial.title')}
            </div>
            <AlertDialogTitle style={{ fontSize: '1.32rem', lineHeight: 1.2, color: 'rgb(248, 250, 252)' }}>
              {t('billingPage.skipTrial.dialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'rgb(203, 213, 225)', lineHeight: 1.55 }}>
              {t('billingPage.skipTrial.dialogDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter
            className="!flex !flex-row !items-center !justify-center gap-3"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              width: '100%',
              marginTop: '0.25rem',
            }}
          >
            <AlertDialogCancel
              className="min-w-[180px]"
              style={{
                minWidth: '180px',
                borderRadius: '0.65rem',
                border: '1px solid rgba(148, 163, 184, 0.42)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'rgb(226, 232, 240)',
                padding: '0.55rem 1rem',
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              {t('billingPage.skipTrial.dialogCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleSkipTrialNow();
              }}
              disabled={isSkippingTrial}
              className="min-w-[180px]"
              style={{
                minWidth: '180px',
                borderRadius: '0.65rem',
                border: '1px solid rgba(251, 191, 36, 0.52)',
                background:
                  'linear-gradient(135deg, rgba(234, 88, 12, 0.9), rgba(249, 115, 22, 0.9))',
                color: 'rgb(255, 255, 255)',
                padding: '0.55rem 1rem',
                textAlign: 'center',
                fontWeight: 700,
                boxShadow: '0 10px 30px rgba(194, 65, 12, 0.35)',
                opacity: isSkippingTrial ? 0.7 : 1,
              }}
            >
              {isSkippingTrial
                ? t('billingPage.skipTrial.processing')
                : t('billingPage.skipTrial.dialogConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent
          className="text-white"
          style={{
            border: '1px solid rgba(248, 113, 113, 0.34)',
            background:
              'linear-gradient(160deg, rgba(24, 14, 19, 0.98), rgba(16, 18, 30, 0.98))',
            boxShadow:
              '0 24px 70px rgba(2, 6, 23, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          }}
        >
          <AlertDialogHeader style={{ display: 'grid', gap: 14 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content',
                borderRadius: 9999,
                border: '1px solid rgba(248, 113, 113, 0.5)',
                background:
                  'linear-gradient(135deg, rgba(127, 29, 29, 0.58), rgba(220, 38, 38, 0.26))',
                color: 'rgb(254, 202, 202)',
                padding: '7px 12px',
                fontSize: 12,
                letterSpacing: 0.25,
                fontWeight: 700,
              }}
            >
              {t('billingPage.cancellation.title')}
            </div>
            <AlertDialogTitle style={{ fontSize: '1.32rem', lineHeight: 1.2, color: 'rgb(248, 250, 252)' }}>
              {t('billingPage.cancellation.dialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'rgb(203, 213, 225)', lineHeight: 1.55 }}>
              {t('billingPage.cancellation.dialogDescription')}
            </AlertDialogDescription>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  background: 'rgba(15, 23, 42, 0.52)',
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    color: 'rgb(148, 163, 184)',
                    fontSize: 11,
                    letterSpacing: 0.35,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  {t('billingPage.changePlan.dialogCurrentPlanLabel')}
                </div>
                <div style={{ color: 'rgb(241, 245, 249)', fontSize: 15, fontWeight: 600 }}>
                  {currentPlanNameForDialog}
                </div>
              </div>
              <div
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  background: 'rgba(15, 23, 42, 0.52)',
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    color: 'rgb(148, 163, 184)',
                    fontSize: 11,
                    letterSpacing: 0.35,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  {t('billingPage.cancellation.currentPeriodEnd')}
                </div>
                <div style={{ color: 'rgb(241, 245, 249)', fontSize: 15, fontWeight: 600 }}>
                  {formatDateTime(scheduledCancellationAt) ?? '-'}
                </div>
              </div>
            </div>

            <div
              style={{
                borderRadius: 12,
                border: '1px solid rgba(248, 113, 113, 0.3)',
                background: 'rgba(127, 29, 29, 0.25)',
                color: 'rgb(254, 226, 226)',
                padding: '10px 12px',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {t('billingPage.cancellation.description')}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter
            className="!flex !flex-row !items-center !justify-center gap-3"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              width: '100%',
              marginTop: '0.25rem',
            }}
          >
            <AlertDialogCancel
              className="min-w-[160px]"
              style={{
                minWidth: '160px',
                borderRadius: '0.65rem',
                border: '1px solid rgba(148, 163, 184, 0.42)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'rgb(226, 232, 240)',
                padding: '0.55rem 1rem',
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              {t('billingPage.cancellation.dialogCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!isCancellingSubscription) {
                  void handleCancelSubscription();
                }
              }}
              disabled={isCancellingSubscription}
              className="min-w-[160px]"
              style={{
                minWidth: '160px',
                borderRadius: '0.65rem',
                border: '1px solid rgba(248, 113, 113, 0.72)',
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.88), rgba(153, 27, 27, 0.9))',
                color: 'rgb(255, 255, 255)',
                padding: '0.55rem 1rem',
                textAlign: 'center',
                fontWeight: 700,
                boxShadow: '0 0 0 1px rgba(248, 113, 113, 0.24), 0 10px 30px rgba(127, 29, 29, 0.38)',
                opacity: isCancellingSubscription ? 0.7 : 1,
              }}
            >
              {isCancellingSubscription
                ? t('billingPage.cancellation.cancelling')
                : t('billingPage.cancellation.dialogConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
