import { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
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

interface BusinessProfilePageProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateBusinessProfile: () => void;
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
  onLogout,
}: BusinessProfilePageProps) {
  const [form, setForm] = useState<BusinessProfileFormState>(createEmptyForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const existingProfile = getBusinessProfile();
    if (existingProfile) {
      setForm(toFormState(existingProfile));
    }
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
      'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition-all hover:border-white/25 focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20',
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

  const handleSaveProfile = () => {
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
      setErrorMessage('Business Name, Category, Location, and Service Description are required.');
      setSuccessMessage(null);
      return;
    }

    if (!nextForm.targetCustomerType) {
      setErrorMessage('Please select a target customer type.');
      setSuccessMessage(null);
      return;
    }

    if (!nextForm.preferredContactMethod) {
      setErrorMessage('Please select a preferred contact method.');
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

    saveBusinessProfile(profileToSave);
    setForm(toFormState(profileToSave));
    setErrorMessage(null);
    setSuccessMessage('Business profile saved.');

    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);
  };

  const handleResetProfile = () => {
    clearBusinessProfile();
    setForm(createEmptyForm());
    setErrorMessage(null);
    setSuccessMessage('Business profile cleared.');

    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);
  };

  return (
    <>
      <DashboardHeader
        onNavigateHome={onNavigateHome}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateBusinessProfile={onNavigateBusinessProfile}
        onLogout={onLogout}
      />

      <main className="relative mx-auto max-w-7xl px-6 py-20">
        <section>
          <h1 className="text-4xl font-bold">Business Profile</h1>
          <p className="mt-3 text-gray-400">
            Tell us about your business so we can match you with better leads.
          </p>
        </section>

        <section className="mt-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(59,130,246,0.08)] backdrop-blur-sm md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="business-name" className="block text-sm text-gray-300">
                  Business Name
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
                  placeholder="Your business name"
                  className={inputClassName}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="business-category" className="block text-sm text-gray-300">
                  Business Category
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
                  placeholder="Category"
                  className={inputClassName}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="business-location" className="block text-sm text-gray-300">
                  Business Location
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
                  placeholder="City, State"
                  className={inputClassName}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="target-customer-type" className="block text-sm text-gray-300">
                  Target Customer Type
                </label>
                <div className="relative">
                  <select
                    id="target-customer-type"
                    value={form.targetCustomerType}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        targetCustomerType: event.target.value as TargetCustomerType | '',
                      }))
                    }
                    className={`${inputClassName} appearance-none pr-10`}
                  >
                    <option value="" className="text-black">
                      Select target type
                    </option>
                    {TARGET_CUSTOMER_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option} className="text-black">
                        {option}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    ▼
                  </span>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="service-description" className="block text-sm text-gray-300">
                  Service Description
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
                  placeholder="Describe your services and how you help customers."
                  className={inputClassName}
                />
              </div>

              <div className="space-y-3 md:col-span-2">
                <p className="text-sm text-gray-300">Primary Problems You Solve</p>
                <div className="flex flex-wrap gap-2">
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
                        {problem}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 md:col-span-2">
                <p className="text-sm text-gray-300">Preferred Contact Method</p>
                <div className="flex flex-wrap gap-4">
                  {CONTACT_METHOD_OPTIONS.map((method) => (
                    <label key={method} className="inline-flex items-center gap-2 text-sm text-gray-200">
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
                      {method}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {successMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveProfile}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-medium shadow-lg shadow-blue-500/20 transition-all hover:from-blue-600 hover:to-purple-700"
              >
                Save Profile
              </button>
              <button
                type="button"
                onClick={handleResetProfile}
                className="rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

