import {
  BusinessProfile,
  PreferredContactMethod,
  PrimaryProblem,
  TargetCustomerType,
} from './types';

export const BUSINESS_PROFILE_STORAGE_KEY = 'businessProfile';

const TARGET_CUSTOMER_TYPES: TargetCustomerType[] = [
  'Local Services',
  'Restaurants',
  'Clinics',
  'E-commerce',
  'SaaS',
  'Agencies',
];

const PRIMARY_PROBLEMS: PrimaryProblem[] = [
  'No Website',
  'Low Google Rating',
  'Outdated Branding',
  'Low Review Count',
  'No Social Media',
  'Poor SEO',
];

const PREFERRED_CONTACT_METHODS: PreferredContactMethod[] = ['Email', 'Phone', 'Both'];

const isString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isTargetCustomerType = (value: unknown): value is TargetCustomerType =>
  typeof value === 'string' && TARGET_CUSTOMER_TYPES.includes(value as TargetCustomerType);

const isPrimaryProblemArray = (value: unknown): value is PrimaryProblem[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === 'string' && PRIMARY_PROBLEMS.includes(item as PrimaryProblem),
  );

const isPreferredContactMethod = (value: unknown): value is PreferredContactMethod =>
  typeof value === 'string' &&
  PREFERRED_CONTACT_METHODS.includes(value as PreferredContactMethod);

const isBusinessProfile = (value: unknown): value is BusinessProfile => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const profile = value as Partial<BusinessProfile>;

  return (
    isString(profile.businessName) &&
    isString(profile.businessCategory) &&
    isString(profile.businessLocation) &&
    isString(profile.serviceDescription) &&
    isTargetCustomerType(profile.targetCustomerType) &&
    isPrimaryProblemArray(profile.primaryProblemsYouSolve) &&
    isPreferredContactMethod(profile.preferredContactMethod)
  );
};

export const getBusinessProfile = (): BusinessProfile | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(BUSINESS_PROFILE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isBusinessProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveBusinessProfile = (profile: BusinessProfile): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(BUSINESS_PROFILE_STORAGE_KEY, JSON.stringify(profile));
};

export const clearBusinessProfile = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(BUSINESS_PROFILE_STORAGE_KEY);
};

