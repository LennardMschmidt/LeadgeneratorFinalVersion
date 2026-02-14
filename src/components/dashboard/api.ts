/// <reference types="vite/client" />

import { BackendLead, Lead, SearchConfiguration } from './types';

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
  problems: backendLead.problems.map(
    (problem) => `${problem.type} (severity ${problem.severity})`,
  ),
  explanation: backendLead.explanation,
  tier: mapTier(backendLead.tier),
  score: backendLead.score,
  status: 'New',
  contactChannels: backendLead.contactChannels.map(
    (channel) => `${channel.type}: ${channel.value}`,
  ),
});

const toPayload = (searchConfig: SearchConfiguration) => ({
  category: searchConfig.category.trim(),
  location: searchConfig.location.trim(),
  problemFilters: searchConfig.problemFilters,
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

export const generateLeadsFromBackend = async (
  searchConfig: SearchConfiguration,
): Promise<Lead[]> => {
  const requestUrl = buildApiUrl('/api/leads/generate');
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toPayload(searchConfig)),
    });
  } catch (error) {
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

  const payload = (await response.json()) as BackendLead[];
  return payload.map(toLead);
};
