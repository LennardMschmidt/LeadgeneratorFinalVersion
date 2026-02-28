import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSelect } from './DashboardSelect';
import { AppAlertToast } from '../ui/AppAlertToast';
import {
  clearBusinessProfileInBackend,
  fetchBusinessProfileFromBackend,
  saveBusinessProfileToBackend,
} from './api';
import {
  clearBusinessProfile,
  getBusinessProfile,
  saveBusinessProfile,
} from './businessProfileStorage';
import {
  BusinessProfile,
  PreferredContactMethod,
  PrimaryProblem,
  TargetCustomerType,
} from './types';
import { toFriendlyErrorFromUnknown } from '../../lib/errorMessaging';

interface BusinessProfilePageProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateBusinessProfile: () => void;
  onNavigateSavedSearches: () => void;
  onNavigateBilling: () => void;
  onNavigateAccountSettings: () => void;
  onLogout: () => void;
}

interface BusinessProfileFormState {
  businessName: string;
  businessCategory: string;
  businessLocation: string;
  serviceDescription: string;
  targetCustomerType: TargetCustomerType | '';
  primaryProblemsYouSolve: PrimaryProblem[];
  preferredContactMethod: PreferredContactMethod | '';
}

const TARGET_CUSTOMER_TYPE_OPTIONS: TargetCustomerType[] = [
  'Local Services',
  'Restaurants',
  'Clinics',
  'E-commerce',
  'SaaS',
  'Agencies',
];

const PRIMARY_PROBLEM_OPTIONS: PrimaryProblem[] = [
  'No Website',
  'Low Google Rating',
  'Outdated Branding',
  'Low Review Count',
  'No Social Media',
  'Poor SEO',
];

const CONTACT_METHOD_OPTIONS: PreferredContactMethod[] = ['Email', 'Phone', 'Both'];

const createEmptyForm = (): BusinessProfileFormState => ({
  businessName: '',
  businessCategory: '',
  businessLocation: '',
  serviceDescription: '',
  targetCustomerType: '',
  primaryProblemsYouSolve: [],
  preferredContactMethod: '',
});

const toFormState = (profile: BusinessProfile): BusinessProfileFormState => ({
  businessName: profile.businessName,
  businessCategory: profile.businessCategory,
  businessLocation: profile.businessLocation,
  serviceDescription: profile.serviceDescription,
  targetCustomerType: profile.targetCustomerType,
  primaryProblemsYouSolve: profile.primaryProblemsYouSolve,
  preferredContactMethod: profile.preferredContactMethod,
});

export function BusinessProfilePage({
  onNavigateHome,
  onNavigateDashboard,
  onNavigateBusinessProfile,
  onNavigateSavedSearches,
  onNavigateBilling,
  onNavigateAccountSettings,
  onLogout,
}: BusinessProfilePageProps) {
  const { t, tm } = useI18n();
  const [form, setForm] = useState<BusinessProfileFormState>(createEmptyForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isResettingProfile, setIsResettingProfile] = useState(false);
  const successTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const localProfile = getBusinessProfile();
    if (localProfile) {
      setForm(toFormState(localProfile));
    }

    let isMounted = true;
    const loadProfile = async () => {
      try {
        const backendProfile = await fetchBusinessProfileFromBackend();
        if (!isMounted) {
          return;
        }

        if (backendProfile) {
          setForm(toFormState(backendProfile));
          saveBusinessProfile(backendProfile);
          return;
        }

        if (localProfile) {
          try {
            await saveBusinessProfileToBackend(localProfile);
          } catch {
            // Best effort sync for existing local users.
          }
        }
      } catch {
        // Silent fallback to local profile.
      }
    };

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
    },
    [],
  );

  const inputClassName = useMemo(
    () =>
      'w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-base text-white placeholder:text-gray-500 outline-none transition-all hover:border-white/25 focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20',
    [],
  );

  const toggleProblem = (problem: PrimaryProblem) => {
    setForm((currentForm) => {
      const exists = currentForm.primaryProblemsYouSolve.includes(problem);
      return {
        ...currentForm,
        primaryProblemsYouSolve: exists
          ? currentForm.primaryProblemsYouSolve.filter((item) => item !== problem)
          : [...currentForm.primaryProblemsYouSolve, problem],
      };
    });
  };

  const handleSaveProfile = async () => {
    if (isSavingProfile) {
      return;
    }

    const nextForm = {
      ...form,
      businessName: form.businessName.trim(),
      businessCategory: form.businessCategory.trim(),
      businessLocation: form.businessLocation.trim(),
      serviceDescription: form.serviceDescription.trim(),
    };

    if (
      !nextForm.businessName ||
      !nextForm.businessCategory ||
      !nextForm.businessLocation ||
      !nextForm.serviceDescription
    ) {
      setErrorMessage(t('dashboard.businessProfile.requiredFieldsError'));
      setSuccessMessage(null);
      return;
    }

    if (!nextForm.targetCustomerType) {
      setErrorMessage(t('dashboard.businessProfile.targetTypeRequired'));
      setSuccessMessage(null);
      return;
    }

    if (!nextForm.preferredContactMethod) {
      setErrorMessage(t('dashboard.businessProfile.preferredContactRequired'));
      setSuccessMessage(null);
      return;
    }

    const profileToSave: BusinessProfile = {
      businessName: nextForm.businessName,
      businessCategory: nextForm.businessCategory,
      businessLocation: nextForm.businessLocation,
      serviceDescription: nextForm.serviceDescription,
      targetCustomerType: nextForm.targetCustomerType,
      primaryProblemsYouSolve: nextForm.primaryProblemsYouSolve,
      preferredContactMethod: nextForm.preferredContactMethod,
    };

    setIsSavingProfile(true);
    try {
      const persistedProfile = await saveBusinessProfileToBackend(profileToSave);
      saveBusinessProfile(persistedProfile);
      setForm(toFormState(persistedProfile));
      setErrorMessage(null);
      setSuccessMessage(t('dashboard.businessProfile.profileSaved'));

      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = window.setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);
    } catch (error) {
      setErrorMessage(toFriendlyErrorFromUnknown(error, t('dashboard.businessProfile.requiredFieldsError')));
      setSuccessMessage(null);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResetProfile = async () => {
    if (isResettingProfile) {
      return;
    }

    setIsResettingProfile(true);
    try {
      await clearBusinessProfileInBackend();
      clearBusinessProfile();
      setForm(createEmptyForm());
      setErrorMessage(null);
      setSuccessMessage(t('dashboard.businessProfile.profileCleared'));

      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = window.setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);
    } catch (error) {
      setErrorMessage(toFriendlyErrorFromUnknown(error, t('dashboard.businessProfile.requiredFieldsError')));
      setSuccessMessage(null);
    } finally {
      setIsResettingProfile(false);
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
        <section className="mb-[20px]" style={{ marginTop: '10px' }}>
          <h1 className="text-4xl font-bold" style={{ marginBottom: '20px' }}>
            {t('dashboard.businessProfile.title')}
          </h1>
          <p className="mb-2 text-gray-400">{t('dashboard.businessProfile.subtitle')}</p>
        </section>

        <section>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_0_30px_rgba(59,130,246,0.08)] backdrop-blur-sm md:p-12">
            <div className="grid md:grid-cols-2" style={{ columnGap: '2.75rem' }}>
              <div className="space-y-4" style={{ paddingBottom: '20px' }}>
                <label htmlFor="business-name" className="block text-sm text-gray-300">
                  {t('dashboard.businessProfile.businessNameLabel')}
                </label>
                <input
                  id="business-name"
                  value={form.businessName}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      businessName: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </div>

              <div className="space-y-4" style={{ paddingBottom: '20px' }}>
                <label htmlFor="business-category" className="block text-sm text-gray-300">
                  {t('dashboard.businessProfile.businessCategoryLabel')}
                </label>
                <input
                  id="business-category"
                  value={form.businessCategory}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      businessCategory: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </div>

              <div className="space-y-4" style={{ paddingBottom: '20px' }}>
                <label htmlFor="business-location" className="block text-sm text-gray-300">
                  {t('dashboard.businessProfile.businessLocationLabel')}
                </label>
                <input
                  id="business-location"
                  value={form.businessLocation}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      businessLocation: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </div>

              <div className="space-y-4" style={{ paddingBottom: '20px' }}>
                <label htmlFor="target-customer-type" className="block text-sm text-gray-300">
                  {t('dashboard.businessProfile.targetCustomerTypeLabel')}
                </label>
                <DashboardSelect
                  id="target-customer-type"
                  value={form.targetCustomerType || '__none__'}
                  onValueChange={(nextValue) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      targetCustomerType:
                        nextValue === '__none__' ? '' : (nextValue as TargetCustomerType),
                    }))
                  }
                  options={[
                    { value: '__none__', label: t('dashboard.businessProfile.selectTargetType') },
                    ...TARGET_CUSTOMER_TYPE_OPTIONS.map((option) => ({
                      value: option,
                      label: tm('targetCustomerTypes', option),
                    })),
                  ]}
                />
              </div>

              <div className="space-y-4 md:col-span-2" style={{ paddingBottom: '20px' }}>
                <label htmlFor="service-description" className="block text-sm text-gray-300">
                  {t('dashboard.businessProfile.serviceDescriptionLabel')}
                </label>
                <textarea
                  id="service-description"
                  value={form.serviceDescription}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      serviceDescription: event.target.value,
                    }))
                  }
                  rows={4}
                  className={`${inputClassName} min-h-[170px]`}
                />
              </div>

              <div className="space-y-5 md:col-span-2" style={{ paddingBottom: '20px' }}>
                <p className="mb-2 text-sm text-gray-300">{t('dashboard.businessProfile.primaryProblemsLabel')}</p>
                <div className="flex flex-wrap gap-3">
                  {PRIMARY_PROBLEM_OPTIONS.map((problem) => {
                    const isSelected = form.primaryProblemsYouSolve.includes(problem);
                    return (
                      <button
                        key={problem}
                        type="button"
                        onClick={() => toggleProblem(problem)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                          isSelected
                            ? 'border-blue-400/60 bg-blue-500/20 text-blue-200'
                            : 'border-white/15 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                        }`}
                      >
                        {tm('primaryProblems', problem)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5 md:col-span-2" style={{ paddingBottom: '20px' }}>
                <p className="mb-2 text-sm text-gray-300">{t('dashboard.businessProfile.preferredContactMethodLabel')}</p>
                <div className="flex flex-wrap gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  {CONTACT_METHOD_OPTIONS.map((method) => (
                    <label
                      key={method}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-200"
                    >
                      <input
                        type="radio"
                        name="preferred-contact-method"
                        value={method}
                        checked={form.preferredContactMethod === method}
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            preferredContactMethod: event.target.value as PreferredContactMethod,
                          }))
                        }
                        className="h-4 w-4 border border-white/20 bg-white/5"
                      />
                      {tm('preferredContactMethods', method)}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4" style={{ marginTop: '26px' }}>
              <button
                type="button"
                onClick={() => {
                  void handleSaveProfile();
                }}
                disabled={isSavingProfile || isResettingProfile}
                className="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-medium shadow-lg shadow-blue-500/20 transition-all hover:from-blue-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingProfile ? t('common.loading') : t('dashboard.businessProfile.saveProfile')}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleResetProfile();
                }}
                disabled={isSavingProfile || isResettingProfile}
                className="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isResettingProfile ? t('common.loading') : t('dashboard.businessProfile.reset')}
              </button>
            </div>
          </div>
        </section>
      </main>
      <AppAlertToast
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
        variant="error"
      />
      <AppAlertToast
        message={successMessage}
        onClose={() => setSuccessMessage(null)}
        variant="success"
      />
    </>
  );
}
