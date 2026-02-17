/// <reference types="vite/client" />

import {
  BackendLead,
  BackendLeadResponse,
  Lead,
  LeadSearchMeta,
  LeadStatus,
  LeadTier,
  SavedLead,
  SavedSearch,
  SearchConfiguration,
} from './types';
import { getSupabaseAccessToken } from '../../lib/supabaseAuth';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

const API_LEAD_STATUSES: LeadStatus[] = ['New', 'Pending', 'Contacted', 'Won', 'Lost', 'Archived'];
const API_LEAD_TIERS: LeadTier[] = ['Tier 1', 'Tier 2', 'Tier 3'];

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

const isLeadStatus = (value: unknown): value is LeadStatus =>
  typeof value === 'string' && API_LEAD_STATUSES.includes(value as LeadStatus);
const isLeadTier = (value: unknown): value is LeadTier =>
  typeof value === 'string' && API_LEAD_TIERS.includes(value as LeadTier);

const normalizeLeadStatus = (value: unknown): LeadStatus => (isLeadStatus(value) ? value : 'New');

const toTierFromStored = (value: unknown): Lead['tier'] => {
  if (value === 'Tier 1' || value === 'Tier 2' || value === 'Tier 3') {
    return value;
  }
  return 'Tier 3';
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const toInteger = (value: unknown): number | undefined => {
  const parsed = toFiniteNumber(value);
  if (parsed === undefined) {
    return undefined;
  }
  return Math.round(parsed);
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const toLeadFromBackend = (backendLead: BackendLead): Lead => ({
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
  ...(typeof backendLead.place_id === 'string' ? { placeId: backendLead.place_id } : {}),
  ...(typeof backendLead.data_id === 'string' ? { dataId: backendLead.data_id } : {}),
  ...(typeof backendLead.feature_id === 'string' ? { featureId: backendLead.feature_id } : {}),
  ...(typeof backendLead.maps_url === 'string' ? { mapsUrl: backendLead.maps_url } : {}),
  ...(typeof backendLead.website_url === 'string' ? { websiteUrl: backendLead.website_url } : {}),
  ...(typeof backendLead.website_display === 'string'
    ? { websiteDisplay: backendLead.website_display }
    : {}),
  ...(Array.isArray(backendLead.categories) ? { categories: backendLead.categories } : {}),
  ...(Array.isArray(backendLead.google_types) ? { googleTypes: backendLead.google_types } : {}),
  ...(backendLead.address
    ? {
        address: {
          ...(Array.isArray(backendLead.address.address_lines)
            ? { addressLines: backendLead.address.address_lines }
            : {}),
          ...(typeof backendLead.address.full === 'string' ? { full: backendLead.address.full } : {}),
          ...(typeof backendLead.address.locality === 'string'
            ? { locality: backendLead.address.locality }
            : {}),
          ...(typeof backendLead.address.country_code === 'string'
            ? { countryCode: backendLead.address.country_code }
            : {}),
          ...(typeof backendLead.address.timezone === 'string'
            ? { timezone: backendLead.address.timezone }
            : {}),
        },
      }
    : {}),
  ...(backendLead.geo ? { geo: backendLead.geo } : {}),
  ...(typeof backendLead.reviews_url === 'string' ? { reviewsUrl: backendLead.reviews_url } : {}),
  ...(backendLead.phone
    ? {
        phone: {
          ...(typeof backendLead.phone.phone_local === 'string'
            ? { phoneLocal: backendLead.phone.phone_local }
            : {}),
          ...(typeof backendLead.phone.phone_international === 'string'
            ? { phoneInternational: backendLead.phone.phone_international }
            : {}),
          ...(typeof backendLead.phone.tel_uri === 'string' ? { telUri: backendLead.phone.tel_uri } : {}),
        },
      }
    : {}),
  ...(backendLead.hours
    ? {
        hours: {
          weeklyHours: Array.isArray(backendLead.hours.weekly_hours)
            ? backendLead.hours.weekly_hours.map((entry) => ({
                ...(typeof entry.day === 'string' ? { day: entry.day } : {}),
                hours: toStringArray(entry.hours),
              }))
            : [],
          ...(typeof backendLead.hours.status_summary === 'string'
            ? { statusSummary: backendLead.hours.status_summary }
            : {}),
          ...(typeof backendLead.hours.status_text === 'string'
            ? { statusText: backendLead.hours.status_text }
            : {}),
        },
      }
    : {}),
  ...(backendLead.attributes ? { attributes: backendLead.attributes } : {}),
  ...(backendLead.raw_refs
    ? {
        rawRefs: {
          ...(typeof backendLead.raw_refs.knowledge_graph_id === 'string'
            ? { knowledgeGraphId: backendLead.raw_refs.knowledge_graph_id }
            : {}),
          ...(typeof backendLead.raw_refs.owner_or_profile_id === 'string'
            ? { ownerOrProfileId: backendLead.raw_refs.owner_or_profile_id }
            : {}),
        },
      }
    : {}),
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

type BackendSavedSearch = {
  id: unknown;
  name: unknown;
  config: {
    location?: unknown;
    category?: unknown;
    searchSource?: unknown;
    businessType?: unknown;
    problemCategoriesSelected?: unknown;
    problemFilters?: unknown;
    contactPreference?: unknown;
    maxResults?: unknown;
  } | null;
};

type SavedSearchListResponse = {
  savedSearches?: unknown;
};

type SavedSearchCreateResponse = {
  savedSearch?: unknown;
};

type BackendSavedLead = {
  id?: unknown;
  sourceLeadId?: unknown;
  businessName?: unknown;
  category?: unknown;
  location?: unknown;
  source?: unknown;
  tier?: unknown;
  score?: unknown;
  status?: unknown;
  explanation?: unknown;
  problems?: unknown;
  contactChannels?: unknown;
  rating?: unknown;
  reviewCount?: unknown;
  rawPayload?: unknown;
  savedAt?: unknown;
  updatedAt?: unknown;
};

type SavedLeadListResponse = {
  items?: unknown;
  total?: unknown;
  limit?: unknown;
  offset?: unknown;
  tierCounts?: unknown;
};

type SavedLeadMutationResponse = {
  savedLead?: unknown;
};

type SavedLeadBulkResponse = {
  requested?: unknown;
  insertedOrUpdated?: unknown;
  skipped?: unknown;
};

type SavedLeadFilteredDeleteResponse = {
  deleted?: unknown;
  statusFilter?: unknown;
  tierFilter?: unknown;
};

export type SavedLeadPage = {
  items: SavedLead[];
  total: number;
  limit: number;
  offset: number;
  tierCounts: Record<LeadTier, number>;
};

export type SavedLeadBulkResult = {
  requested: number;
  insertedOrUpdated: number;
  skipped: number;
};

export type SavedLeadFilteredDeleteResult = {
  deleted: number;
  statusFilter: LeadStatus | null;
  tierFilter: LeadTier | null;
};

const parseStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const normalizeContactPreference = (value: unknown): SearchConfiguration['contactPreference'] => {
  if (value === 'Email' || value === 'Phone' || value === 'LinkedIn' || value === 'Any') {
    return value;
  }
  return 'Any';
};

const mapSavedSearch = (item: BackendSavedSearch): SavedSearch | null => {
  if (typeof item.id !== 'string' || typeof item.name !== 'string') {
    return null;
  }

  const config = item.config ?? {};
  if (typeof config !== 'object') {
    return null;
  }

  const mapped: SavedSearch = {
    id: item.id,
    name: item.name,
    config: {
      location: typeof config.location === 'string' ? config.location : '',
      category: typeof config.category === 'string' ? config.category : '',
      searchSource: typeof config.searchSource === 'string' ? config.searchSource : '',
      businessType: typeof config.businessType === 'string' ? config.businessType : '',
      problemCategoriesSelected: parseStringArray(config.problemCategoriesSelected),
      problemFilters: parseStringArray(config.problemFilters),
      contactPreference: normalizeContactPreference(config.contactPreference),
      maxResults:
        typeof config.maxResults === 'number' && Number.isFinite(config.maxResults)
          ? Math.max(20, Math.min(300, Math.round(config.maxResults)))
          : 20,
    },
  };

  return mapped;
};

const mapSavedLead = (item: BackendSavedLead): SavedLead | null => {
  if (typeof item.id !== 'string') {
    return null;
  }

  if (
    typeof item.businessName !== 'string' ||
    typeof item.category !== 'string' ||
    typeof item.location !== 'string'
  ) {
    return null;
  }

  const savedLeadId = item.id;
  const sourceLeadId = typeof item.sourceLeadId === 'string' && item.sourceLeadId.length > 0
    ? item.sourceLeadId
    : savedLeadId;

  const mapped: SavedLead = {
    savedLeadId,
    id: sourceLeadId,
    businessName: item.businessName,
    category: item.category,
    location: item.location,
    source: typeof item.source === 'string' ? item.source : '',
    tier: toTierFromStored(item.tier),
    score: toInteger(item.score) ?? 0,
    status: normalizeLeadStatus(item.status),
    explanation: typeof item.explanation === 'string' ? item.explanation : '',
    problems: toStringArray(item.problems),
    contactChannels: toStringArray(item.contactChannels),
    ...(toFiniteNumber(item.rating) !== undefined ? { rating: toFiniteNumber(item.rating) } : {}),
    ...(toInteger(item.reviewCount) !== undefined ? { reviewCount: toInteger(item.reviewCount) } : {}),
    savedAt: typeof item.savedAt === 'string' ? item.savedAt : new Date().toISOString(),
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
  };

  const raw = item.rawPayload;
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const rawPayload = raw as Record<string, unknown>;
    const optionalString = (...keys: string[]): string | undefined => {
      const candidate = keys
        .map((key) => rawPayload[key])
        .find((value) => typeof value === 'string' && value.trim().length > 0);
      return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : undefined;
    };
    const optionalStringArray = (...keys: string[]): string[] | undefined => {
      const candidate = keys
        .map((key) => rawPayload[key])
        .find((value) => Array.isArray(value));
      const values = toStringArray(candidate);
      return values.length > 0 ? values : undefined;
    };

    if (optionalString('placeId', 'place_id')) {
      mapped.placeId = optionalString('placeId', 'place_id');
    }
    if (optionalString('dataId', 'data_id')) {
      mapped.dataId = optionalString('dataId', 'data_id');
    }
    if (optionalString('featureId', 'feature_id')) {
      mapped.featureId = optionalString('featureId', 'feature_id');
    }
    if (optionalString('mapsUrl', 'maps_url')) {
      mapped.mapsUrl = optionalString('mapsUrl', 'maps_url');
    }
    if (optionalString('websiteUrl', 'website_url')) {
      mapped.websiteUrl = optionalString('websiteUrl', 'website_url');
    }
    if (optionalString('websiteDisplay', 'website_display')) {
      mapped.websiteDisplay = optionalString('websiteDisplay', 'website_display');
    }
    if (optionalStringArray('categories')) {
      mapped.categories = optionalStringArray('categories');
    }
    if (optionalStringArray('googleTypes', 'google_types')) {
      mapped.googleTypes = optionalStringArray('googleTypes', 'google_types');
    }
    if (optionalString('reviewsUrl', 'reviews_url')) {
      mapped.reviewsUrl = optionalString('reviewsUrl', 'reviews_url');
    }

    const address = rawPayload.address;
    if (typeof address === 'object' && address !== null && !Array.isArray(address)) {
      const addressPayload = address as Record<string, unknown>;
      mapped.address = {
        ...(Array.isArray(addressPayload.addressLines) || Array.isArray(addressPayload.address_lines)
          ? {
              addressLines: toStringArray(
                Array.isArray(addressPayload.addressLines)
                  ? addressPayload.addressLines
                  : addressPayload.address_lines,
              ),
            }
          : {}),
        ...(typeof addressPayload.full === 'string' ? { full: addressPayload.full } : {}),
        ...(typeof addressPayload.locality === 'string' ? { locality: addressPayload.locality } : {}),
        ...(typeof addressPayload.countryCode === 'string' ||
        typeof addressPayload.country_code === 'string'
          ? {
              countryCode:
                typeof addressPayload.countryCode === 'string'
                  ? addressPayload.countryCode
                  : (addressPayload.country_code as string),
            }
          : {}),
        ...(typeof addressPayload.timezone === 'string' ? { timezone: addressPayload.timezone } : {}),
      };
    }

    const geo = rawPayload.geo;
    if (typeof geo === 'object' && geo !== null && !Array.isArray(geo)) {
      const geoPayload = geo as Record<string, unknown>;
      const lat = toFiniteNumber(geoPayload.lat);
      const lng = toFiniteNumber(geoPayload.lng);
      if (lat !== undefined && lng !== undefined) {
        mapped.geo = { lat, lng };
      }
    }

    const phone = rawPayload.phone;
    if (typeof phone === 'object' && phone !== null && !Array.isArray(phone)) {
      const phonePayload = phone as Record<string, unknown>;
      mapped.phone = {
        ...(typeof phonePayload.phoneLocal === 'string'
          ? { phoneLocal: phonePayload.phoneLocal }
          : {}),
        ...(typeof phonePayload.phoneInternational === 'string'
          ? { phoneInternational: phonePayload.phoneInternational }
          : {}),
        ...(typeof phonePayload.phone_local === 'string'
          ? { phoneLocal: phonePayload.phone_local }
          : {}),
        ...(typeof phonePayload.phone_international === 'string'
          ? { phoneInternational: phonePayload.phone_international }
          : {}),
        ...(typeof phonePayload.telUri === 'string'
          ? { telUri: phonePayload.telUri }
          : {}),
        ...(typeof phonePayload.tel_uri === 'string'
          ? { telUri: phonePayload.tel_uri }
          : {}),
      };
    }

    const hours = rawPayload.hours;
    if (typeof hours === 'object' && hours !== null && !Array.isArray(hours)) {
      const hoursPayload = hours as Record<string, unknown>;
      const weeklyHoursRaw = Array.isArray(hoursPayload.weeklyHours)
        ? hoursPayload.weeklyHours
        : Array.isArray(hoursPayload.weekly_hours)
          ? hoursPayload.weekly_hours
          : [];

      mapped.hours = {
        weeklyHours: weeklyHoursRaw
          .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
          .map((entry) => ({
            ...(typeof entry.day === 'string' ? { day: entry.day } : {}),
            hours: toStringArray(entry.hours),
          })),
        ...(typeof hoursPayload.statusSummary === 'string'
          ? { statusSummary: hoursPayload.statusSummary }
          : {}),
        ...(typeof hoursPayload.status_summary === 'string'
          ? { statusSummary: hoursPayload.status_summary }
          : {}),
        ...(typeof hoursPayload.statusText === 'string'
          ? { statusText: hoursPayload.statusText }
          : {}),
        ...(typeof hoursPayload.status_text === 'string'
          ? { statusText: hoursPayload.status_text }
          : {}),
      };
    }

    if (
      typeof rawPayload.attributes === 'object' &&
      rawPayload.attributes !== null &&
      !Array.isArray(rawPayload.attributes)
    ) {
      const attributes = rawPayload.attributes as Record<string, unknown>;
      const normalizedAttributes: Record<string, string[]> = {};
      Object.entries(attributes).forEach(([key, value]) => {
        const values = toStringArray(value);
        if (values.length > 0) {
          normalizedAttributes[key] = values;
        }
      });
      if (Object.keys(normalizedAttributes).length > 0) {
        mapped.attributes = normalizedAttributes;
      }
    }

    const rawRefs = rawPayload.rawRefs ?? rawPayload.raw_refs;
    if (typeof rawRefs === 'object' && rawRefs !== null && !Array.isArray(rawRefs)) {
      const refsPayload = rawRefs as Record<string, unknown>;
      mapped.rawRefs = {
        ...(typeof refsPayload.knowledgeGraphId === 'string'
          ? { knowledgeGraphId: refsPayload.knowledgeGraphId }
          : {}),
        ...(typeof refsPayload.knowledge_graph_id === 'string'
          ? { knowledgeGraphId: refsPayload.knowledge_graph_id }
          : {}),
        ...(typeof refsPayload.ownerOrProfileId === 'string'
          ? { ownerOrProfileId: refsPayload.ownerOrProfileId }
          : {}),
        ...(typeof refsPayload.owner_or_profile_id === 'string'
          ? { ownerOrProfileId: refsPayload.owner_or_profile_id }
          : {}),
      };
    }
  }

  return mapped;
};

const parseBackendError = async (response: Response): Promise<string> => {
  if (response.status === 401) {
    return 'Your session expired or is invalid. Please log in again.';
  }

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

const getAuthorizationHeader = async (): Promise<string> => {
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) {
    throw new Error('You must be logged in to access dashboard data.');
  }

  return `Bearer ${accessToken}`;
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
  const authorization = await getAuthorizationHeader();
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
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
  const mappedLeads = backendLeads.map(toLeadFromBackend);
  logLeadPayloads(backendLeads, mappedLeads);
  return {
    leads: mappedLeads,
    ...(Array.isArray(payload) ? {} : { meta: payload.meta }),
  };
};

export const cancelBackendSearch = async (): Promise<void> => {
  const requestUrl = buildApiUrl('/api/leads/cancel');
  try {
    const authorization = await getAuthorizationHeader();
    await fetch(requestUrl, {
      method: 'POST',
      headers: {
        Authorization: authorization,
      },
    });
  } catch {
    // Best-effort cancellation endpoint call.
  }
};

export const fetchSavedSearchesFromBackend = async (): Promise<SavedSearch[]> => {
  const requestUrl = buildApiUrl('/api/leads/saved-searches');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as SavedSearchListResponse;
  const rawItems = Array.isArray(payload.savedSearches) ? payload.savedSearches : [];
  return rawItems
    .map((item) => mapSavedSearch(item as BackendSavedSearch))
    .filter((item): item is SavedSearch => item !== null);
};

export const createSavedSearchInBackend = async (
  name: string,
  config: SearchConfiguration,
): Promise<SavedSearch> => {
  const requestUrl = buildApiUrl('/api/leads/saved-searches');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({
      name,
      config: {
        location: config.location,
        category: config.category,
        searchSource: config.searchSource,
        businessType: config.businessType,
        problemCategoriesSelected: config.problemCategoriesSelected,
        problemFilters: config.problemFilters,
        contactPreference: config.contactPreference,
        maxResults: config.maxResults,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as SavedSearchCreateResponse;
  const mapped = mapSavedSearch(payload.savedSearch as BackendSavedSearch);
  if (!mapped) {
    throw new Error('Saved search response is invalid.');
  }

  return mapped;
};

export const deleteSavedSearchFromBackend = async (
  savedSearchId: string,
): Promise<void> => {
  const requestUrl = buildApiUrl(`/api/leads/saved-searches/${encodeURIComponent(savedSearchId)}`);
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'DELETE',
    headers: {
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }
};

export const saveLeadToBackend = async (lead: Lead): Promise<SavedLead> => {
  const requestUrl = buildApiUrl('/api/leads/saved-leads');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify(lead),
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as SavedLeadMutationResponse;
  const mapped = mapSavedLead(payload.savedLead as BackendSavedLead);
  if (!mapped) {
    throw new Error('Saved lead response is invalid.');
  }

  return mapped;
};

export const saveVisibleLeadsToBackend = async (
  leads: Lead[],
): Promise<SavedLeadBulkResult> => {
  const requestUrl = buildApiUrl('/api/leads/saved-leads/bulk');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({ leads }),
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as SavedLeadBulkResponse;
  return {
    requested: toInteger(payload.requested) ?? 0,
    insertedOrUpdated: toInteger(payload.insertedOrUpdated) ?? 0,
    skipped: toInteger(payload.skipped) ?? 0,
  };
};

export const fetchSavedLeadsFromBackend = async (params?: {
  limit?: number;
  offset?: number;
  status?: LeadStatus | 'All';
  tier?: LeadTier | 'All';
}): Promise<SavedLeadPage> => {
  const query = new URLSearchParams();
  if (typeof params?.limit === 'number') {
    query.set('limit', String(Math.max(1, Math.round(params.limit))));
  }
  if (typeof params?.offset === 'number') {
    query.set('offset', String(Math.max(0, Math.round(params.offset))));
  }
  if (params?.status && params.status !== 'All') {
    query.set('status', params.status);
  }
  if (params?.tier && params.tier !== 'All') {
    query.set('tier', params.tier);
  }

  const requestUrl = buildApiUrl(`/api/leads/saved-leads${query.toString() ? `?${query}` : ''}`);
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as SavedLeadListResponse;
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const parsedTierCounts = payload.tierCounts;
  const tierCounts: Record<LeadTier, number> = {
    'Tier 1': 0,
    'Tier 2': 0,
    'Tier 3': 0,
  };
  if (typeof parsedTierCounts === 'object' && parsedTierCounts !== null && !Array.isArray(parsedTierCounts)) {
    const maybeCounts = parsedTierCounts as Record<string, unknown>;
    (Object.keys(tierCounts) as LeadTier[]).forEach((tier) => {
      tierCounts[tier] = toInteger(maybeCounts[tier]) ?? 0;
    });
  }

  return {
    items: rawItems
      .map((item) => mapSavedLead(item as BackendSavedLead))
      .filter((item): item is SavedLead => item !== null),
    total: toInteger(payload.total) ?? 0,
    limit: toInteger(payload.limit) ?? params?.limit ?? 25,
    offset: toInteger(payload.offset) ?? params?.offset ?? 0,
    tierCounts,
  };
};

export const updateSavedLeadStatusInBackend = async (
  savedLeadId: string,
  status: LeadStatus,
): Promise<SavedLead> => {
  const requestUrl = buildApiUrl(
    `/api/leads/saved-leads/${encodeURIComponent(savedLeadId)}/status`,
  );
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as SavedLeadMutationResponse;
  const mapped = mapSavedLead(payload.savedLead as BackendSavedLead);
  if (!mapped) {
    throw new Error('Saved lead response is invalid.');
  }

  return mapped;
};

export const deleteSavedLeadFromBackend = async (savedLeadId: string): Promise<void> => {
  const requestUrl = buildApiUrl(
    `/api/leads/saved-leads/${encodeURIComponent(savedLeadId)}`,
  );
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'DELETE',
    headers: {
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }
};

export const deleteFilteredSavedLeadsFromBackend = async (
  filters?: {
    status?: LeadStatus | 'All';
    tier?: LeadTier | 'All';
  },
): Promise<SavedLeadFilteredDeleteResult> => {
  const query = new URLSearchParams();
  if (filters?.status && filters.status !== 'All') {
    query.set('status', filters.status);
  }
  if (filters?.tier && filters.tier !== 'All') {
    query.set('tier', filters.tier);
  }

  const requestUrl = buildApiUrl(`/api/leads/saved-leads${query.toString() ? `?${query}` : ''}`);
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'DELETE',
    headers: {
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as SavedLeadFilteredDeleteResponse;
  return {
    deleted: toInteger(payload.deleted) ?? 0,
    statusFilter: isLeadStatus(payload.statusFilter) ? payload.statusFilter : null,
    tierFilter: isLeadTier(payload.tierFilter) ? payload.tierFilter : null,
  };
};
