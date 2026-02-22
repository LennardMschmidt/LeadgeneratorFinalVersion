import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Mail } from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  AccountDetails,
  cancelSubscriptionAndDeleteAccountInBackend,
  cancelSubscriptionAtPeriodEndInBackend,
  fetchAccountDetailsFromBackend,
} from './api';
import { DashboardHeader } from './DashboardHeader';
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

interface AccountSettingsPageProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateBusinessProfile: () => void;
  onNavigateSavedSearches: () => void;
  onNavigateBilling: () => void;
  onNavigateAccountSettings: () => void;
  onLogout: () => void;
}

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

const formatSubscriptionStatus = (value: string): string => {
  if (!value) {
    return 'inactive';
  }
  return value.replace(/_/g, ' ');
};

export function AccountSettingsPage({
  onNavigateHome,
  onNavigateDashboard,
  onNavigateBusinessProfile,
  onNavigateSavedSearches,
  onNavigateBilling,
  onNavigateAccountSettings,
  onLogout,
}: AccountSettingsPageProps) {
  const { t } = useI18n();
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDeleteNowDialogOpen, setIsDeleteNowDialogOpen] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [isDeletingAccountNow, setIsDeletingAccountNow] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAccountDetails = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const details = await fetchAccountDetailsFromBackend();
        if (!isMounted) {
          return;
        }
        setAccountDetails(details);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(t('accountSettingsPage.errors.loadFailed'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAccountDetails();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const currentPeriodEndLabel = useMemo(
    () => formatDateTime(accountDetails?.currentPeriodEnd ?? null),
    [accountDetails?.currentPeriodEnd],
  );

  const accountCreatedLabel = useMemo(
    () => formatDateTime(accountDetails?.createdAt ?? null),
    [accountDetails?.createdAt],
  );

  const handleChangePassword = () => {
    setErrorMessage(null);
    setNoticeMessage(t('accountSettingsPage.actions.changePasswordSoon'));
  };

  const handleConfirmCancellation = async () => {
    setErrorMessage(null);
    setNoticeMessage(null);
    setIsCancellingSubscription(true);

    try {
      const updatedSubscription = await cancelSubscriptionAtPeriodEndInBackend();
      setAccountDetails((current) =>
        current
          ? {
              ...current,
              plan: updatedSubscription.plan,
              subscriptionStatus: updatedSubscription.subscriptionStatus,
              currentPeriodEnd: updatedSubscription.currentPeriodEnd,
            }
          : current,
      );

      const endDateLabel = formatDateTime(updatedSubscription.currentPeriodEnd);
      setNoticeMessage(
        endDateLabel
          ? t('accountSettingsPage.cancellation.successScheduled', { date: endDateLabel })
          : t('accountSettingsPage.cancellation.successNoDate'),
      );
      setIsCancelDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t('accountSettingsPage.errors.cancelFailed'));
      }
    } finally {
      setIsCancellingSubscription(false);
    }
  };

  const handleConfirmImmediateDeletion = async () => {
    setErrorMessage(null);
    setNoticeMessage(null);
    setIsDeletingAccountNow(true);

    try {
      await cancelSubscriptionAndDeleteAccountInBackend('DELETE');
      setIsDeleteNowDialogOpen(false);
      onLogout();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t('accountSettingsPage.errors.deleteNowFailed'));
      }
    } finally {
      setIsDeletingAccountNow(false);
    }
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

      <main className="relative mx-auto max-w-7xl px-6 py-24">
        <section>
          <h1 className="mb-[20px] text-4xl font-bold">{t('accountSettingsPage.title')}</h1>
          <p className="mb-2 text-gray-400">{t('accountSettingsPage.subtitle')}</p>
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
                <h2 className="mb-[10px] text-xl font-semibold text-white">{t('accountSettingsPage.details.title')}</h2>
                <p className="mb-2 text-sm text-gray-400">{t('accountSettingsPage.details.description')}</p>
              </div>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : null}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">{t('accountSettingsPage.details.email')}</p>
                <p className="mt-2 mb-2 break-all text-base text-white">{accountDetails?.email ?? t('common.notAvailable')}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">{t('accountSettingsPage.details.plan')}</p>
                <p className="mt-2 mb-2 text-base text-white">{accountDetails?.plan ?? t('common.notAvailable')}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                  {t('accountSettingsPage.details.subscriptionStatus')}
                </p>
                <p className="mt-2 mb-2 text-base text-white">
                  {accountDetails ? formatSubscriptionStatus(accountDetails.subscriptionStatus) : t('common.notAvailable')}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                  {t('accountSettingsPage.details.currentPeriodEnd')}
                </p>
                <p className="mt-2 mb-2 text-base text-white">
                  {currentPeriodEndLabel ?? t('accountSettingsPage.details.notAvailable')}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 sm:col-span-2">
                <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                  {t('accountSettingsPage.details.accountCreated')}
                </p>
                <p className="mt-2 mb-2 text-base text-white">
                  {accountCreatedLabel ?? t('accountSettingsPage.details.notAvailable')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleChangePassword}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <KeyRound className="h-4 w-4" />
                {t('accountSettingsPage.actions.changePassword')}
              </button>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-3" style={{ marginTop: '20px' }}>
          <button
            type="button"
            onClick={() => setIsCancelDialogOpen(true)}
            disabled={isCancellingSubscription || isDeletingAccountNow}
            className="inline-flex min-w-[220px] items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('accountSettingsPage.actions.cancelSubscription')}
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteNowDialogOpen(true)}
            disabled={isCancellingSubscription || isDeletingAccountNow}
            className="inline-flex min-w-[220px] items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('accountSettingsPage.actions.tempDeleteAccount')}
          </button>
        </div>
      </main>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="border border-red-400/35 bg-[#151219] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accountSettingsPage.cancellation.dialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-gray-300">
              <span className="block">{t('accountSettingsPage.cancellation.dialogDescription')}</span>
              <span className="inline-flex items-center gap-2 text-red-200">
                <Mail className="h-4 w-4" />
                {t('accountSettingsPage.cancellation.dialogSupportHint')}
              </span>
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
              {t('accountSettingsPage.cancellation.dialogCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmCancellation()}
              className="inline-flex min-w-[200px] items-center justify-center gap-2"
              style={{
                minWidth: '200px',
                borderRadius: '0.65rem',
                border: '1px solid rgba(248, 113, 113, 0.62)',
                backgroundColor: 'rgba(239, 68, 68, 0.22)',
                color: 'rgb(254, 226, 226)',
                padding: '0.55rem 1rem',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {isCancellingSubscription ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('accountSettingsPage.actions.cancelling')}
                </>
              ) : (
                t('accountSettingsPage.cancellation.dialogConfirm')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteNowDialogOpen} onOpenChange={setIsDeleteNowDialogOpen}>
        <AlertDialogContent className="border border-red-400/35 bg-[#151219] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accountSettingsPage.deleteNow.dialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-gray-300">
              <span className="block">{t('accountSettingsPage.deleteNow.dialogDescription')}</span>
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
              {t('accountSettingsPage.deleteNow.dialogCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmImmediateDeletion()}
              className="inline-flex min-w-[200px] items-center justify-center gap-2"
              style={{
                minWidth: '200px',
                borderRadius: '0.65rem',
                border: '1px solid rgba(248, 113, 113, 0.62)',
                backgroundColor: 'rgba(239, 68, 68, 0.22)',
                color: 'rgb(254, 226, 226)',
                padding: '0.55rem 1rem',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {isDeletingAccountNow ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('accountSettingsPage.actions.deletingAccount')}
                </>
              ) : (
                t('accountSettingsPage.deleteNow.dialogConfirm')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
