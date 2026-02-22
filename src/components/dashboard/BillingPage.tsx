import { useEffect, useMemo, useState } from 'react';
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
import { Progress } from '../ui/progress';

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

  const progressValue = useMemo(() => {
    if (!usage || usage.dailyTokenLimit <= 0) {
      return 0;
    }

    const ratio = (usage.tokensUsedToday / usage.dailyTokenLimit) * 100;
    return Math.max(0, Math.min(100, Math.round(ratio)));
  }, [usage]);

  const aiProgressValue = useMemo(() => {
    if (!usage || usage.aiTokensTotal <= 0) {
      return 0;
    }

    const ratio = (usage.aiTokensUsed / usage.aiTokensTotal) * 100;
    return Math.max(0, Math.min(100, Math.round(ratio)));
  }, [usage]);

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

      <main className="relative mx-auto max-w-7xl px-6 py-24">
        <section>
          <h1 className="mb-[10px] text-4xl font-bold">{t('billingPage.title')}</h1>
          <p className="mt-4 text-gray-400">{t('billingPage.subtitle')}</p>
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
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="mb-[10px] text-xl font-semibold text-white">{t('billingPage.currentPlan.title')}</h2>
                <p className="mb-[10px] text-sm text-gray-400">{t('billingPage.currentPlan.description')}</p>
              </div>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              ) : (
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-gray-200">
                  {currentPlan?.name ?? usage?.plan ?? '-'}
                </span>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">{t('billingPage.currentPlan.dailyLimit')}</p>
                <p className="mt-2 text-2xl font-bold text-white">{usage?.dailyTokenLimit ?? 0}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">{t('billingPage.currentPlan.usedToday')}</p>
                <p className="mt-2 text-2xl font-bold text-white">{usage?.tokensUsedToday ?? 0}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">{t('billingPage.currentPlan.remainingToday')}</p>
                <p className="mt-2 text-2xl font-bold text-white">{usage?.tokensRemainingToday ?? 0}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
                <span>{t('billingPage.currentPlan.usageProgress')}</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2 bg-white/10" />
            </div>

            <div className="mt-8 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                {t('billingPage.currentPlan.aiTokensTitle')}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    {t('billingPage.currentPlan.aiTotal')}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">{usage?.aiTokensTotal ?? 0}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    {t('billingPage.currentPlan.aiUsed')}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">{usage?.aiTokensUsed ?? 0}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    {t('billingPage.currentPlan.aiRemaining')}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">{usage?.aiTokensRemaining ?? 0}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
                  <span>{t('billingPage.currentPlan.aiUsageProgress')}</span>
                  <span>{aiProgressValue}%</span>
                </div>
                <Progress value={aiProgressValue} className="h-2 bg-white/10" />
              </div>

              {usage?.aiPeriodEnd ? (
                <p className="mt-3 text-xs text-gray-400">
                  {t('billingPage.currentPlan.aiPeriodEnds')}: {new Date(usage.aiPeriodEnd).toLocaleString()}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-[10px] text-xl font-semibold text-white">{t('billingPage.changePlan.title')}</h2>
            <p className="mb-[10px] text-sm text-gray-400">{t('billingPage.changePlan.description')}</p>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {orderedPlans.map((plan) => {
                const isCurrent = usage?.plan === plan.code;
                const isPending = isChangingPlan === plan.code;
                const visual = billingPlanVisuals[plan.code as 'STANDARD' | 'PRO' | 'EXPERT'];
                const isPro = plan.code === 'PRO';
                const isExpert = plan.code === 'EXPERT';
                const planFeatures = [
                  `${plan.aiTokensPerMonth} AI evaluation tokens/month`,
                  ...visual.features,
                ];

                return (
                  <div
                    key={plan.code}
                    className={`rounded-3xl border p-8 transition-all ${
                      isExpert
                        ? 'border-2 border-cyan-300 hover:scale-[1.02]'
                        : isPro
                          ? 'bg-gradient-to-br from-white/10 to-white/[0.02] border-blue-500/30 shadow-xl shadow-blue-500/10 scale-105'
                          : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10'
                    }`}
                    style={
                      isExpert
                        ? {
                            borderColor: '#22d3ee',
                            borderWidth: '2px',
                            background:
                              'linear-gradient(135deg, rgba(6, 182, 212, 0.22), rgba(16, 185, 129, 0.18), rgba(163, 230, 53, 0.16))',
                            boxShadow:
                              '0 0 0 1px rgba(103, 232, 249, 0.55), 0 0 42px rgba(34, 211, 238, 0.42), inset 0 0 28px rgba(20, 184, 166, 0.12)',
                          }
                        : undefined
                    }
                  >
                    {visual.badge ? (
                      <div className="mb-4">
                        <span
                          className={`px-3 py-1 rounded-full text-white text-xs font-medium ${
                            isExpert
                              ? 'bg-gradient-to-r from-cyan-300 to-emerald-300 text-black shadow-[0_0_20px_rgba(34,211,238,0.65)]'
                              : 'bg-gradient-to-r from-blue-500 to-purple-600'
                          }`}
                        >
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
                        isExpert
                          ? 'bg-gradient-to-r from-cyan-300 to-emerald-400 hover:from-cyan-400 hover:to-emerald-500 text-black shadow-[0_0_28px_rgba(16,185,129,0.45)]'
                          : isPro
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                      style={
                        isExpert
                          ? {
                              border: '1px solid rgba(103, 232, 249, 0.8)',
                            }
                          : undefined
                      }
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
                              isExpert
                                ? 'bg-emerald-400/30'
                                : isPro
                                  ? 'bg-blue-500/20'
                                  : 'bg-white/5'
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
