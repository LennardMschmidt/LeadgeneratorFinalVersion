type AuthUser = {
  id: string;
  email: string | null;
};

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
};

type AuthActionSuccess = {
  ok: true;
  requiresEmailConfirmation?: boolean;
};

type AuthActionFailure = {
  ok: false;
  message: string;
};

export type AuthActionResult = AuthActionSuccess | AuthActionFailure;

const SESSION_STORAGE_KEY = 'leadgen.auth.session';
const SESSION_STORAGE_MODE_KEY = 'leadgen.auth.session_mode';
const EXPIRY_REFRESH_BUFFER_SECONDS = 30;

const getSupabaseUrl = (): string => (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');

const getSupabasePublishableKey = (): string =>
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? '')
    .trim();

const isBrowser = typeof window !== 'undefined';

const hasSupabaseConfig = (): boolean => getSupabaseUrl().length > 0 && getSupabasePublishableKey().length > 0;

const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

type SessionStorageMode = 'local' | 'session';

const parseStoredSession = (raw: string | null): StoredSession | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.user !== 'object' ||
      parsed.user === null ||
      typeof parsed.user.id !== 'string'
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      user: {
        id: parsed.user.id,
        email: typeof parsed.user.email === 'string' ? parsed.user.email : null,
      },
    };
  } catch {
    return null;
  }
};

const getSessionStorageMode = (): SessionStorageMode => {
  if (!isBrowser) {
    return 'local';
  }

  return 'local';
};

const setSessionStorageMode = (): SessionStorageMode => {
  const mode: SessionStorageMode = 'local';
  if (!isBrowser) {
    return mode;
  }

  window.localStorage.setItem(SESSION_STORAGE_MODE_KEY, mode);
  return mode;
};

const readStoredSession = (): { session: StoredSession; mode: SessionStorageMode } | null => {
  if (!isBrowser) {
    return null;
  }

  const preferredMode = getSessionStorageMode();
  const orderedModes: SessionStorageMode[] =
    preferredMode === 'local' ? ['local', 'session'] : ['session', 'local'];

  for (const mode of orderedModes) {
    const raw =
      mode === 'local'
        ? window.localStorage.getItem(SESSION_STORAGE_KEY)
        : window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    const session = parseStoredSession(raw);
    if (session) {
      if (mode === 'session') {
        writeStoredSession(session, 'local');
        return { session, mode: 'local' };
      }

      return { session, mode };
    }
  }

  return null;
};

const writeStoredSession = (session: StoredSession, mode: SessionStorageMode): void => {
  if (!isBrowser) {
    return;
  }

  const encoded = JSON.stringify(session);
  if (mode === 'local') {
    window.localStorage.setItem(SESSION_STORAGE_KEY, encoded);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, encoded);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
};

const clearStoredSession = (): void => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
};

const clearUrlHash = (): void => {
  if (!isBrowser || !window.location.hash) {
    return;
  }

  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, '', cleanUrl);
};

const readOAuthHashSession = (): StoredSession | null => {
  if (!isBrowser || !window.location.hash || window.location.hash.length <= 1) {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresInRaw = params.get('expires_in');
  const expiresAtRaw = params.get('expires_at');

  if (!accessToken || !refreshToken) {
    return null;
  }

  let expiresAt = nowInSeconds() + 3600;

  if (expiresAtRaw) {
    const parsed = Number(expiresAtRaw);
    if (Number.isFinite(parsed) && parsed > 0) {
      expiresAt = Math.floor(parsed);
    }
  } else if (expiresInRaw) {
    const parsed = Number(expiresInRaw);
    if (Number.isFinite(parsed) && parsed > 0) {
      expiresAt = nowInSeconds() + Math.floor(parsed);
    }
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
    user: {
      id: 'pending-oauth-user',
      email: null,
    },
  };
};

type SupabaseAuthResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  id?: unknown;
  email?: unknown;
  user?: {
    id?: unknown;
    email?: unknown;
  } | null;
  session?: {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    user?: {
      id?: unknown;
      email?: unknown;
    } | null;
  } | null;
  error?: unknown;
  error_description?: unknown;
  message?: unknown;
  msg?: unknown;
};

const parseErrorMessage = (payload: SupabaseAuthResponse | null): string => {
  if (!payload) {
    return 'Authentication failed. Please try again.';
  }

  if (typeof payload.error_description === 'string' && payload.error_description.trim().length > 0) {
    return payload.error_description;
  }

  if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message;
  }

  if (typeof payload.msg === 'string' && payload.msg.trim().length > 0) {
    return payload.msg;
  }

  if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
    return payload.error;
  }

  return 'Authentication failed. Please try again.';
};

const parseUserFromPayload = (payload: SupabaseAuthResponse | null): AuthUser | null => {
  if (!payload) {
    return null;
  }

  if (payload.user && typeof payload.user.id === 'string') {
    return {
      id: payload.user.id,
      email: typeof payload.user.email === 'string' ? payload.user.email : null,
    };
  }

  if (typeof payload.id === 'string') {
    return {
      id: payload.id,
      email: typeof payload.email === 'string' ? payload.email : null,
    };
  }

  return null;
};

const toStoredSession = (payload: SupabaseAuthResponse): StoredSession | null => {
  const source = payload.session ?? payload;
  if (!source || typeof source !== 'object') {
    return null;
  }

  if (
    typeof source.access_token !== 'string' ||
    typeof source.refresh_token !== 'string' ||
    typeof source.expires_in !== 'number' ||
    typeof source.user !== 'object' ||
    source.user === null ||
    typeof source.user.id !== 'string'
  ) {
    return null;
  }

  return {
    accessToken: source.access_token,
    refreshToken: source.refresh_token,
    expiresAt: nowInSeconds() + Math.max(0, Math.floor(source.expires_in)),
    user: {
      id: source.user.id,
      email: typeof source.user.email === 'string' ? source.user.email : null,
    },
  };
};

const isSessionNearExpiry = (session: StoredSession): boolean =>
  session.expiresAt - EXPIRY_REFRESH_BUFFER_SECONDS <= nowInSeconds();

const authRequest = async (
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT';
    body?: Record<string, unknown>;
    accessToken?: string;
  } = {},
): Promise<{ ok: boolean; status: number; payload: SupabaseAuthResponse | null }> => {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: options.method ?? 'POST',
    headers: {
      apikey: key,
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  let payload: SupabaseAuthResponse | null = null;
  try {
    payload = (await response.json()) as SupabaseAuthResponse;
  } catch {
    payload = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
};

const refreshSessionIfNeeded = async (
  session: StoredSession,
  mode: SessionStorageMode,
): Promise<StoredSession | null> => {
  if (!isSessionNearExpiry(session)) {
    return session;
  }

  const response = await authRequest('token?grant_type=refresh_token', {
    body: { refresh_token: session.refreshToken },
  });

  if (!response.ok || !response.payload) {
    clearStoredSession();
    return null;
  }

  const refreshed = toStoredSession(response.payload);
  if (!refreshed) {
    clearStoredSession();
    return null;
  }

  writeStoredSession(refreshed, mode);
  return refreshed;
};

const verifySessionUser = async (
  session: StoredSession,
  mode: SessionStorageMode,
): Promise<boolean> => {
  const response = await authRequest('user', {
    method: 'GET',
    accessToken: session.accessToken,
  });

  const user = response.ok ? parseUserFromPayload(response.payload) : null;
  if (!user) {
    clearStoredSession();
    return false;
  }

  const updatedSession: StoredSession = {
    ...session,
    user,
  };
  writeStoredSession(updatedSession, mode);
  return true;
};

export const isSupabaseAuthConfigured = (): boolean => hasSupabaseConfig();

export const restoreSupabaseSession = async (): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const oauthSession = readOAuthHashSession();
  if (oauthSession) {
    writeStoredSession(oauthSession, getSessionStorageMode());
    clearUrlHash();
  }

  const existing = readStoredSession();
  if (!existing) {
    return false;
  }

  const validSession = await refreshSessionIfNeeded(existing.session, existing.mode);
  if (!validSession) {
    return false;
  }

  return verifySessionUser(validSession, existing.mode);
};

export const getSupabaseAccessToken = async (): Promise<string | null> => {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const existing = readStoredSession();
  if (!existing) {
    return null;
  }

  const validSession = await refreshSessionIfNeeded(existing.session, existing.mode);
  if (!validSession) {
    return null;
  }

  return validSession.accessToken;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  options?: { rememberMe?: boolean; name?: string },
): Promise<AuthActionResult> => {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: 'Supabase Auth is not configured in this frontend.',
    };
  }

  const mode = setSessionStorageMode();

  const response = await authRequest('signup', {
    body: {
      email,
      password,
      ...(options?.name && options.name.trim().length > 0
        ? { data: { full_name: options.name.trim() } }
        : {}),
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      message: parseErrorMessage(response.payload),
    };
  }

  if (!response.payload) {
    return {
      ok: false,
      message: 'Signup failed. Please try again.',
    };
  }

  const session = toStoredSession(response.payload);
  if (session) {
    writeStoredSession(session, mode);
    return { ok: true };
  }

  return {
    ok: true,
    requiresEmailConfirmation: true,
  };
};

export const signInWithEmail = async (
  email: string,
  password: string,
  options?: { rememberMe?: boolean },
): Promise<AuthActionResult> => {
  void options;
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: 'Supabase Auth is not configured in this frontend.',
    };
  }

  const mode = setSessionStorageMode();

  const response = await authRequest('token?grant_type=password', {
    body: { email, password },
  });

  if (!response.ok || !response.payload) {
    return {
      ok: false,
      message: parseErrorMessage(response.payload),
    };
  }

  const session = toStoredSession(response.payload);
  if (!session) {
    return {
      ok: false,
      message: 'Login failed. Please try again.',
    };
  }

  writeStoredSession(session, mode);
  return { ok: true };
};

export const signInWithGoogle = async (
  redirectPath = '/dashboard',
  options?: { rememberMe?: boolean },
): Promise<AuthActionResult> => {
  void options;
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: 'Supabase Auth is not configured in this frontend.',
    };
  }

  if (!isBrowser) {
    return {
      ok: false,
      message: 'Google login must be started from the browser.',
    };
  }

  setSessionStorageMode();

  const normalizedPath = redirectPath.startsWith('/') ? redirectPath : '/dashboard';
  const redirectTo = `${window.location.origin}${normalizedPath}`;
  const authorizeUrl = new URL(`${getSupabaseUrl()}/auth/v1/authorize`);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('redirect_to', redirectTo);

  window.location.assign(authorizeUrl.toString());

  return { ok: true };
};

export const sendPasswordResetEmail = async (
  email: string,
  options?: { redirectPath?: string },
): Promise<AuthActionResult> => {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: 'Supabase Auth is not configured in this frontend.',
    };
  }

  const requestedPath = options?.redirectPath ?? '/reset-password';
  const normalizedPath = requestedPath.startsWith('/') ? requestedPath : '/reset-password';
  const redirectTo = isBrowser ? `${window.location.origin}${normalizedPath}` : undefined;

  const response = await authRequest('recover', {
    body: {
      email,
      ...(redirectTo ? { redirect_to: redirectTo } : {}),
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      message: parseErrorMessage(response.payload),
    };
  }

  return { ok: true };
};

export const updateSupabasePassword = async (newPassword: string): Promise<AuthActionResult> => {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: 'Supabase Auth is not configured in this frontend.',
    };
  }

  const token = await getSupabaseAccessToken();
  if (!token) {
    return {
      ok: false,
      message: 'Your reset link is invalid or expired. Request a new password reset email.',
    };
  }

  const response = await authRequest('user', {
    method: 'PUT',
    accessToken: token,
    body: { password: newPassword },
  });

  if (!response.ok) {
    return {
      ok: false,
      message: parseErrorMessage(response.payload),
    };
  }

  return { ok: true };
};

export const signOutFromSupabase = async (): Promise<void> => {
  if (!hasSupabaseConfig()) {
    clearStoredSession();
    return;
  }

  const existing = readStoredSession();
  if (!existing) {
    clearStoredSession();
    return;
  }

  try {
    await authRequest('logout', {
      accessToken: existing.session.accessToken,
    });
  } finally {
    clearStoredSession();
  }
};
