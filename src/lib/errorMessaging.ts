const GENERIC_ERROR_MESSAGE = 'Oh no, something went wrong. Please try again.';

const TECHNICAL_ERROR_PATTERNS: RegExp[] = [
  /failed to fetch/i,
  /request failed/i,
  /could not reach/i,
  /backend/i,
  /python/i,
  /stripe/i,
  /supabase/i,
  /webhook/i,
  /database/i,
  /postgres/i,
  /timeout/i,
  /network/i,
  /no such customer/i,
  /invalid webhook/i,
];

export const toFriendlyErrorMessage = (
  message: string | null | undefined,
  fallback: string = GENERIC_ERROR_MESSAGE,
): string => {
  if (!message || message.trim().length === 0) {
    return fallback;
  }

  const trimmed = message.trim();
  const looksTechnical = TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed));
  if (looksTechnical) {
    return fallback;
  }

  return trimmed;
};

export const toFriendlyErrorFromUnknown = (
  error: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE,
): string => {
  if (error instanceof Error) {
    return toFriendlyErrorMessage(error.message, fallback);
  }

  if (typeof error === 'string') {
    return toFriendlyErrorMessage(error, fallback);
  }

  return fallback;
};

export const USER_SESSION_ERROR_MESSAGE = 'Your session expired. Please log in again.';
export const USER_CONNECTION_ERROR_MESSAGE = 'Connection problem. Please try again.';
export const USER_FEATURE_LOCKED_MESSAGE = 'This feature is not included in your current plan.';
export const USER_CHECKOUT_REQUIRED_MESSAGE = 'Please start checkout to activate your subscription first.';
export const USER_GENERIC_ERROR_MESSAGE = GENERIC_ERROR_MESSAGE;
