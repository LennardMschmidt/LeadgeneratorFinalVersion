/// <reference types="vite/client" />

import { BackendLead, BackendLeadResponse, Lead, LeadSearchMeta, SearchConfiguration } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

const buildApiUrl = (path: string): string => {
  if (API_BASE_URL.length > 0) {
    return `${API_BASE_URL}${path}`;
  }

  return path;
};

const mapTier = (tier: BackendLead['tier']): Lead['tier'] => {
  if (tier === 'most_valuable') {
    return 'Tier 1';
  }

  if (tier === 'probable') {
    return 'Tier 2';
  }

  return 'Tier 3';
};

const toLead = (backendLead: BackendLead): Lead => ({
  id: backendLead.id,
  businessName: backendLead.businessName,
  location: backendLead.location,
  category: backendLead.category,
  ...(typeof backendLead.source === 'string' ? { source: backendLead.source } : {}),
  problems: backendLead.problems.map((problem) => problem.type),
  explanation: backendLead.explanation,
  tier: mapTier(backendLead.tier),
  score: backendLead.score,
  status: 'New',
  ...(typeof backendLead.rating === 'number' ? { rating: backendLead.rating } : {}),
  ...(typeof backendLead.review_count === 'number'
    ? { reviewCount: backendLead.review_count }
    : {}),
  contactChannels: backendLead.contactChannels.map(
    (channel) => `${channel.type}: ${channel.value}`,
  ),
});

const toPayload = (searchConfig: SearchConfiguration) => ({
  category: searchConfig.category.trim(),
  location: searchConfig.location.trim(),
  source: searchConfig.searchSource,
  businessType: searchConfig.businessType,
  problemCategoriesSelected: searchConfig.problemCategoriesSelected,
  problemFilters: searchConfig.problemFilters,
  maxResults: searchConfig.maxResults,
  contactPreferences:
    searchConfig.contactPreference === 'Any'
      ? []
      : [searchConfig.contactPreference.toLowerCase()],
});

const parseBackendError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
      return payload.error;
    }
  } catch {
    // Ignore parse errors and fall back to HTTP status text.
  }

  return `Request failed (${response.status})`;
};

const logLeadPayloads = (backendLeads: BackendLead[], mappedLeads: Lead[]): void => {
  console.groupCollapsed(
    `[Lead Search] Received ${backendLeads.length} backend lead(s), mapped ${mappedLeads.length} UI lead(s)`,
  );

  backendLeads.forEach((lead, index) => {
    console.log(`[Lead Search][Backend][${index + 1}]`, JSON.stringify(lead, null, 2));
  });

  mappedLeads.forEach((lead, index) => {
    console.log(`[Lead Search][Frontend][${index + 1}]`, JSON.stringify(lead, null, 2));
  });

  console.groupEnd();
};

export const generateLeadsFromBackend = async (
  searchConfig: SearchConfiguration,
  options?: { signal?: AbortSignal },
): Promise<{ leads: Lead[]; meta?: LeadSearchMeta }> => {
  const requestUrl = buildApiUrl('/api/leads/generate');
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toPayload(searchConfig)),
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Search cancelled.');
    }

    if (error instanceof TypeError) {
      const targetDescription =
        API_BASE_URL.length > 0
          ? API_BASE_URL
          : '/api via Vite dev proxy (default target http://localhost:4000)';

      throw new Error(
        `Could not reach backend at ${targetDescription}. Verify the backend is running and URL settings are correct.`,
      );
    }

    throw error;
  }

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as BackendLead[] | BackendLeadResponse;
  const backendLeads = Array.isArray(payload) ? payload : payload.leads;
  const mappedLeads = backendLeads.map(toLead);
  logLeadPayloads(backendLeads, mappedLeads);
  return {
    leads: mappedLeads,
    ...(Array.isArray(payload) ? {} : { meta: payload.meta }),
  };
};

export const cancelBackendSearch = async (): Promise<void> => {
  const requestUrl = buildApiUrl('/api/leads/cancel');
  try {
    await fetch(requestUrl, {
      method: 'POST',
    });
  } catch {
    // Best-effort cancellation endpoint call.
  }
};
