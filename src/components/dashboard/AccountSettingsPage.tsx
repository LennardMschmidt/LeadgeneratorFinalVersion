import { FormEvent, useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Mail } from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  AccountDetails,
  cancelSubscriptionAtPeriodEndInBackend,
  fetchAccountDetailsFromBackend,
} from './api';
import { signInWithEmail, updateSupabasePassword } from '../../lib/supabaseAuth';
import { toFriendlyErrorFromUnknown } from '../../lib/errorMessaging';
import { DashboardHeader } from './DashboardHeader';
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

const getAuthFailureMessage = (result: unknown, fallbackMessage: string): string => {
  if (
    result &&
    typeof result === 'object' &&
    'message' in result &&
    typeof (result as { message?: unknown }).message === 'string' &&
    (result as { message: string }).message.trim().length > 0
  ) {
    return (result as { message: string }).message;
  }

  return fallbackMessage;
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
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
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
          setErrorMessage(toFriendlyErrorFromUnknown(error));
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

  const resetPasswordDialogState = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setChangePasswordError(null);
    setIsChangingPassword(false);
  };

  const handleChangePassword = () => {
    setErrorMessage(null);
    setNoticeMessage(null);
    resetPasswordDialogState();
    setIsChangePasswordDialogOpen(true);
  };

  const handleSubmitPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isChangingPassword) {
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);
    setChangePasswordError(null);

    if (currentPassword.trim().length === 0) {
      setChangePasswordError(t('accountSettingsPage.changePassword.errors.currentPasswordRequired'));
      return;
    }

    if (newPassword.length < 8) {
      setChangePasswordError(t('accountSettingsPage.changePassword.errors.newPasswordMin'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError(t('accountSettingsPage.changePassword.errors.confirmMismatch'));
      return;
    }

    if (newPassword === currentPassword) {
      setChangePasswordError(t('accountSettingsPage.changePassword.errors.newMustDiffer'));
      return;
    }

    if (!accountDetails?.email) {
      setChangePasswordError(t('accountSettingsPage.changePassword.errors.emailMissing'));
      return;
    }

    setIsChangingPassword(true);
    try {
      const verifyCurrent = await signInWithEmail(accountDetails.email, currentPassword);
      if (!verifyCurrent.ok) {
        setChangePasswordError(
          getAuthFailureMessage(
            verifyCurrent,
            t('accountSettingsPage.changePassword.errors.currentPasswordInvalid'),
          ),
        );
        return;
      }

      const result = await updateSupabasePassword(newPassword, { context: 'account' });
      if (!result.ok) {
        setChangePasswordError(
          getAuthFailureMessage(result, t('accountSettingsPage.changePassword.errors.updateFailed')),
        );
        return;
      }

      setIsChangePasswordDialogOpen(false);
      resetPasswordDialogState();
      setNoticeMessage(t('accountSettingsPage.changePassword.success'));
    } finally {
      setIsChangingPassword(false);
    }
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
        setErrorMessage(toFriendlyErrorFromUnknown(error));
      } else {
        setErrorMessage(t('accountSettingsPage.errors.cancelFailed'));
      }
    } finally {
      setIsCancellingSubscription(false);
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

      <main
        className="relative mx-auto w-full max-w-7xl overflow-x-clip px-3 py-16 sm:px-6 sm:py-24"
        style={{ paddingBottom: 'calc(6rem + 20px)' }}
      >
        <section>
          <h1 className="mb-[20px] text-4xl font-bold">{t('accountSettingsPage.title')}</h1>
          <p className="mb-2 text-slate-300">{t('accountSettingsPage.subtitle')}</p>
        </section>

        <div className="mt-8 grid gap-8">
          <section
            className="rounded-2xl border p-6"
            style={{
              borderColor: 'rgba(125, 211, 252, 0.25)',
              background:
                'linear-gradient(145deg, rgba(15, 23, 42, 0.88), rgba(30, 41, 59, 0.74) 48%, rgba(14, 116, 144, 0.16))',
              boxShadow: '0 16px 36px rgba(2, 6, 23, 0.32)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="mb-[10px] text-xl font-semibold text-white">{t('accountSettingsPage.details.title')}</h2>
                <p className="mb-2 text-sm text-slate-300">{t('accountSettingsPage.details.description')}</p>
              </div>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : null}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-sky-300/20 bg-sky-950/30 p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-sky-100/70">{t('accountSettingsPage.details.email')}</p>
                <p className="mt-2 mb-2 break-all text-base text-white">{accountDetails?.email ?? t('common.notAvailable')}</p>
              </div>
              <div className="rounded-xl border border-violet-300/20 bg-violet-950/20 p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-violet-100/70">{t('accountSettingsPage.details.plan')}</p>
                <p className="mt-2 mb-2 text-base text-white">{accountDetails?.plan ?? t('common.notAvailable')}</p>
              </div>
              <div className="rounded-xl border border-emerald-300/20 bg-emerald-950/20 p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                  {t('accountSettingsPage.details.subscriptionStatus')}
                </p>
                <p className="mt-2 mb-2 text-base text-white">
                  {accountDetails ? formatSubscriptionStatus(accountDetails.subscriptionStatus) : t('common.notAvailable')}
                </p>
              </div>
              <div className="rounded-xl border border-cyan-300/20 bg-cyan-950/20 p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                  {t('accountSettingsPage.details.currentPeriodEnd')}
                </p>
                <p className="mt-2 mb-2 text-base text-white">
                  {currentPeriodEndLabel ?? t('accountSettingsPage.details.notAvailable')}
                </p>
              </div>
              <div className="rounded-xl border border-slate-300/20 bg-slate-900/40 p-4 sm:col-span-2">
                <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                  {t('accountSettingsPage.details.accountCreated')}
                </p>
                <p className="mt-2 mb-2 text-base text-white">
                  {accountCreatedLabel ?? t('accountSettingsPage.details.notAvailable')}
                </p>
              </div>
            </div>

            <div className="flex justify-end" style={{ marginTop: '20px' }}>
              <button
                type="button"
                onClick={handleChangePassword}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-300/35 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/25"
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
            disabled={isCancellingSubscription}
            className="inline-flex min-w-[220px] items-center justify-center rounded-lg border border-rose-300/40 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('accountSettingsPage.actions.cancelSubscription')}
          </button>
        </div>
      </main>

      <AlertDialog
        open={isChangePasswordDialogOpen}
        onOpenChange={(open) => {
          setIsChangePasswordDialogOpen(open);
          if (!open) {
            resetPasswordDialogState();
          }
        }}
      >
        <AlertDialogContent
          className="text-white"
          style={{
            border: '1px solid rgba(96, 165, 250, 0.32)',
            background:
              'linear-gradient(160deg, rgba(17, 20, 33, 0.98), rgba(21, 18, 25, 0.98))',
            boxShadow:
              '0 24px 70px rgba(2, 6, 23, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          }}
        >
          <AlertDialogHeader style={{ display: 'grid', gap: 12 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content',
                borderRadius: 9999,
                border: '1px solid rgba(96, 165, 250, 0.5)',
                background:
                  'linear-gradient(135deg, rgba(30, 64, 175, 0.48), rgba(124, 58, 237, 0.22))',
                color: 'rgb(191, 219, 254)',
                padding: '7px 12px',
                fontSize: 12,
                letterSpacing: 0.25,
                fontWeight: 700,
              }}
            >
              {t('accountSettingsPage.actions.changePassword')}
            </div>
            <AlertDialogTitle style={{ fontSize: '1.32rem', lineHeight: 1.2, color: 'rgb(248, 250, 252)' }}>
              {t('accountSettingsPage.changePassword.title')}
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'rgb(203, 213, 225)', lineHeight: 1.55 }}>
              {t('accountSettingsPage.changePassword.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleSubmitPasswordChange} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label htmlFor="current-password" className="text-sm text-gray-300">
                {t('accountSettingsPage.changePassword.currentPasswordLabel')}
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setChangePasswordError(null);
                }}
                placeholder={t('accountSettingsPage.changePassword.currentPasswordPlaceholder')}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/35 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                style={{ height: 'calc(var(--spacing) * 11)' }}
                autoComplete="current-password"
                required
                disabled={isChangingPassword}
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label htmlFor="new-password-account" className="text-sm text-gray-300">
                {t('accountSettingsPage.changePassword.newPasswordLabel')}
              </label>
              <input
                id="new-password-account"
                type="password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setChangePasswordError(null);
                }}
                placeholder={t('accountSettingsPage.changePassword.newPasswordPlaceholder')}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/35 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                style={{ height: 'calc(var(--spacing) * 11)' }}
                autoComplete="new-password"
                minLength={8}
                required
                disabled={isChangingPassword}
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label htmlFor="confirm-new-password-account" className="text-sm text-gray-300">
                {t('accountSettingsPage.changePassword.confirmPasswordLabel')}
              </label>
              <input
                id="confirm-new-password-account"
                type="password"
                value={confirmNewPassword}
                onChange={(event) => {
                  setConfirmNewPassword(event.target.value);
                  setChangePasswordError(null);
                }}
                placeholder={t('accountSettingsPage.changePassword.confirmPasswordPlaceholder')}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/35 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                style={{ height: 'calc(var(--spacing) * 11)' }}
                autoComplete="new-password"
                minLength={8}
                required
                disabled={isChangingPassword}
              />
            </div>

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
                type="button"
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
                {t('accountSettingsPage.changePassword.cancel')}
              </AlertDialogCancel>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-lg"
                style={{
                  minWidth: '200px',
                  borderRadius: '0.65rem',
                  border: '1px solid rgba(96, 165, 250, 0.72)',
                  background:
                    'linear-gradient(135deg, rgba(37, 99, 235, 0.88), rgba(124, 58, 237, 0.88))',
                  color: 'rgb(255, 255, 255)',
                  padding: '0.55rem 1rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  boxShadow: '0 0 0 1px rgba(96, 165, 250, 0.24), 0 10px 30px rgba(49, 46, 129, 0.35)',
                  opacity: isChangingPassword ? 0.7 : 1,
                }}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('accountSettingsPage.changePassword.saving')}
                  </>
                ) : (
                  t('accountSettingsPage.changePassword.confirm')
                )}
              </button>
            </AlertDialogFooter>
          </form>
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
              {t('accountSettingsPage.actions.cancelSubscription')}
            </div>
            <AlertDialogTitle style={{ fontSize: '1.32rem', lineHeight: 1.2, color: 'rgb(248, 250, 252)' }}>
              {t('accountSettingsPage.cancellation.dialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'rgb(203, 213, 225)', lineHeight: 1.55 }}>
              {t('accountSettingsPage.cancellation.dialogDescription')}
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
                  {t('accountSettingsPage.details.plan')}
                </div>
                <div style={{ color: 'rgb(241, 245, 249)', fontSize: 15, fontWeight: 600 }}>
                  {accountDetails?.plan ?? '-'}
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
                  {t('accountSettingsPage.details.currentPeriodEnd')}
                </div>
                <div style={{ color: 'rgb(241, 245, 249)', fontSize: 15, fontWeight: 600 }}>
                  {currentPeriodEndLabel ?? '-'}
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
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('accountSettingsPage.cancellation.dialogSupportHint')}
              </span>
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
              {t('accountSettingsPage.cancellation.dialogCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmCancellation()}
              className="inline-flex min-w-[200px] items-center justify-center gap-2"
              style={{
                minWidth: '200px',
                borderRadius: '0.65rem',
                border: '1px solid rgba(248, 113, 113, 0.72)',
                background:
                  'linear-gradient(135deg, rgba(220, 38, 38, 0.88), rgba(153, 27, 27, 0.9))',
                color: 'rgb(255, 255, 255)',
                padding: '0.55rem 1rem',
                fontWeight: 700,
                textAlign: 'center',
                boxShadow: '0 0 0 1px rgba(248, 113, 113, 0.24), 0 10px 30px rgba(127, 29, 29, 0.38)',
                opacity: isCancellingSubscription ? 0.7 : 1,
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

      <AppAlertToast
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
        variant="error"
      />
      <AppAlertToast
        message={changePasswordError}
        onClose={() => setChangePasswordError(null)}
        variant="error"
      />
      <AppAlertToast
        message={noticeMessage}
        onClose={() => setNoticeMessage(null)}
        variant="info"
      />
    </>
  );
}
