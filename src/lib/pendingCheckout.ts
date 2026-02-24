type BillingPlanCode = 'STANDARD' | 'PRO' | 'EXPERT';

type PendingCheckoutRecord = {
  plan: BillingPlanCode;
  email: string;
  createdAt: number;
};

const PENDING_CHECKOUT_STORAGE_KEY = 'leadgen.billing.pending_checkout';
const PENDING_CHECKOUT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const isBrowser = typeof window !== 'undefined';

const isPlanCode = (value: unknown): value is BillingPlanCode =>
  value === 'STANDARD' || value === 'PRO' || value === 'EXPERT';

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const savePendingCheckout = (input: {
  plan: BillingPlanCode;
  email: string;
}): void => {
  if (!isBrowser) {
    return;
  }

  const payload: PendingCheckoutRecord = {
    plan: input.plan,
    email: normalizeEmail(input.email),
    createdAt: Date.now(),
  };

  window.localStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
};

export const clearPendingCheckout = (): void => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
};

export const getPendingCheckout = (): PendingCheckoutRecord | null => {
  if (!isBrowser) {
    return null;
  }

  const raw = window.localStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as Partial<PendingCheckoutRecord>;
    if (
      !isPlanCode(payload.plan) ||
      typeof payload.email !== 'string' ||
      typeof payload.createdAt !== 'number'
    ) {
      clearPendingCheckout();
      return null;
    }

    if (Date.now() - payload.createdAt > PENDING_CHECKOUT_TTL_MS) {
      clearPendingCheckout();
      return null;
    }

    return {
      plan: payload.plan,
      email: normalizeEmail(payload.email),
      createdAt: payload.createdAt,
    };
  } catch {
    clearPendingCheckout();
    return null;
  }
};
