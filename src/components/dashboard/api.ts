/// <reference types="vite/client" />

import {
  BackendLead,
  BackendLeadResponse,
  BusinessProfile,
  Lead,
  LeadSearchMeta,
  LeadStatus,
  LeadTier,
  SavedLead,
  SavedSearch,
  SearchConfiguration,
} from './types';
import { canonicalizeSearchSource } from './searchSources';
import { getSupabaseAccessToken } from '../../lib/supabaseAuth';
import {
  USER_CHECKOUT_REQUIRED_MESSAGE,
  USER_CONNECTION_ERROR_MESSAGE,
  USER_FEATURE_LOCKED_MESSAGE,
  USER_GENERIC_ERROR_MESSAGE,
  USER_SESSION_ERROR_MESSAGE,
  toFriendlyErrorMessage,
} from '../../lib/errorMessaging';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

const API_LEAD_STATUSES: LeadStatus[] = ['New', 'Pending', 'Contacted', 'Won', 'Lost', 'Archived'];
const API_LEAD_TIERS: LeadTier[] = ['Tier 1', 'Tier 2', 'Tier 3'];
let activeLeadSearchJobId: string | null = null;

const buildApiUrl = (path: string): string => {
  if (API_BASE_URL.length > 0) {
    return `${API_BASE_URL}${path}`;
  }

  return path;
};

const createRequestId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

const toStringRecord = (value: unknown): Record<string, string> | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  const normalized: Record<string, string> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    if (typeof raw === 'string') {
      normalized[key] = raw;
    }
  });

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const LINKEDIN_NO_PROBLEMS_MESSAGE = 'No problem categories available for LinkedIn leads.';

const toLeadFromBackend = (backendLead: BackendLead): Lead => ({
  id: backendLead.id,
  businessName: backendLead.businessName,
  location: backendLead.location,
  category: backendLead.category,
  ...(typeof backendLead.source === 'string' ? { source: backendLead.source } : {}),
  problems:
    backendLead.problems.length === 0 &&
    typeof backendLead.source === 'string' &&
    backendLead.source.toLowerCase().includes('linkedin')
      ? [LINKEDIN_NO_PROBLEMS_MESSAGE]
      : backendLead.problems.map((problem) => problem.type),
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
  ...(typeof backendLead.linkedin_url === 'string' ? { linkedinUrl: backendLead.linkedin_url } : {}),
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

const toPayload = (searchConfig: SearchConfiguration) => {
  const normalizedSource = canonicalizeSearchSource(searchConfig.searchSource);
  const linkedinSource = normalizedSource === 'linkedin';
  const problemCategories = linkedinSource ? [] : searchConfig.problemCategoriesSelected;
  const problemFilters = linkedinSource ? [] : searchConfig.problemFilters;

  return {
    category: searchConfig.category.trim(),
    location: searchConfig.location.trim(),
    query: [searchConfig.category.trim(), searchConfig.location.trim()].join(' ').trim(),
    source: normalizedSource,
    businessType: searchConfig.businessType,
    problemCategories,
    problemCategoriesSelected: problemCategories,
    problemFilters,
    maxResults: searchConfig.maxResults,
    max_results: searchConfig.maxResults,
    contactPreferences: [],
  };
};

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
  saved_lead_id?: unknown;
  sourceLeadId?: unknown;
  source_lead_id?: unknown;
  businessName?: unknown;
  business_name?: unknown;
  category?: unknown;
  location?: unknown;
  source?: unknown;
  tier?: unknown;
  score?: unknown;
  status?: unknown;
  explanation?: unknown;
  problems?: unknown;
  contact_channels?: unknown;
  contactChannels?: unknown;
  rating?: unknown;
  review_count?: unknown;
  reviewCount?: unknown;
  raw_payload?: unknown;
  rawPayload?: unknown;
  website_analysis?: unknown;
  websiteAnalysis?: unknown;
  website_analysis_created_at?: unknown;
  websiteAnalysisCreatedAt?: unknown;
  website_ai_summary?: unknown;
  websiteAiSummary?: unknown;
  website_ai_generated_at?: unknown;
  websiteAiGeneratedAt?: unknown;
  contact_ai_suggestions?: unknown;
  contactAiSuggestions?: unknown;
  contact_ai_generated_at?: unknown;
  contactAiGeneratedAt?: unknown;
  saved_at?: unknown;
  savedAt?: unknown;
  updated_at?: unknown;
  updatedAt?: unknown;
};

type SavedLeadListResponse = {
  items?: unknown;
  total?: unknown;
  limit?: unknown;
  offset?: unknown;
  tierCounts?: unknown;
  problemCounts?: unknown;
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
  queryFilter?: unknown;
  problemAny?: unknown;
};

export type SavedLeadPage = {
  items: SavedLead[];
  total: number;
  limit: number;
  offset: number;
  tierCounts: Record<LeadTier, number>;
  problemCounts: Record<string, number>;
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
  queryFilter: string | null;
  problemAny: string[];
};

const MAX_BULK_SAVE_PAYLOAD_BYTES = 80_000;

const estimateJsonPayloadSize = (payload: unknown): number => {
  const serialized = JSON.stringify(payload);
  if (typeof globalThis.TextEncoder === 'function') {
    return new globalThis.TextEncoder().encode(serialized).length;
  }
  return serialized.length;
};

const splitLeadsIntoSaveBatches = (leads: Lead[]): Lead[][] => {
  if (leads.length === 0) {
    return [];
  }

  const batches: Lead[][] = [];
  let currentBatch: Lead[] = [];

  for (const lead of leads) {
    const candidateBatch = [...currentBatch, lead];
    const candidateSize = estimateJsonPayloadSize({ leads: candidateBatch });

    if (currentBatch.length > 0 && candidateSize > MAX_BULK_SAVE_PAYLOAD_BYTES) {
      batches.push(currentBatch);
      currentBatch = [lead];
      continue;
    }

    currentBatch = candidateBatch;

    // Even if a single lead is oversized, keep progress by sending it alone.
    if (candidateSize > MAX_BULK_SAVE_PAYLOAD_BYTES) {
      batches.push(currentBatch);
      currentBatch = [];
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
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
      searchSource: canonicalizeSearchSource(config.searchSource),
      businessType: typeof config.businessType === 'string' ? config.businessType : '',
      problemCategoriesSelected: parseStringArray(config.problemCategoriesSelected),
      problemFilters: parseStringArray(config.problemFilters),
      contactPreference: normalizeContactPreference(config.contactPreference),
      maxResults:
        typeof config.maxResults === 'number' && Number.isFinite(config.maxResults)
          ? Math.max(20, Math.min(120, Math.round(config.maxResults)))
          : 20,
    },
  };

  return mapped;
};

const mapSavedLead = (item: BackendSavedLead): SavedLead | null => {
  const idCandidate =
    typeof item.id === 'string'
      ? item.id
      : typeof item.saved_lead_id === 'string'
        ? item.saved_lead_id
        : null;
  if (!idCandidate) {
    return null;
  }

  const businessName =
    typeof item.businessName === 'string'
      ? item.businessName
      : typeof item.business_name === 'string'
        ? item.business_name
        : null;
  if (
    typeof businessName !== 'string' ||
    typeof item.category !== 'string' ||
    typeof item.location !== 'string'
  ) {
    return null;
  }

  const savedLeadId = idCandidate;
  const sourceLeadIdRaw =
    typeof item.sourceLeadId === 'string'
      ? item.sourceLeadId
      : typeof item.source_lead_id === 'string'
        ? item.source_lead_id
        : null;
  const sourceLeadId = sourceLeadIdRaw && sourceLeadIdRaw.length > 0
    ? sourceLeadIdRaw
    : savedLeadId;
  const contactAiSuggestions = toStringRecord(
    item.contactAiSuggestions ?? item.contact_ai_suggestions,
  );

  const mapped: SavedLead = {
    savedLeadId,
    id: sourceLeadId,
    businessName,
    category: item.category,
    location: item.location,
    source: typeof item.source === 'string' ? item.source : '',
    tier: toTierFromStored(item.tier),
    score: toInteger(item.score) ?? 0,
    status: normalizeLeadStatus(item.status),
    explanation: typeof item.explanation === 'string' ? item.explanation : '',
    problems: toStringArray(item.problems),
    contactChannels: toStringArray(item.contactChannels ?? item.contact_channels),
    ...(toFiniteNumber(item.rating) !== undefined ? { rating: toFiniteNumber(item.rating) } : {}),
    ...(toInteger(item.reviewCount ?? item.review_count) !== undefined
      ? { reviewCount: toInteger(item.reviewCount ?? item.review_count) }
      : {}),
    ...(typeof (item.websiteAnalysis ?? item.website_analysis) === 'object' &&
    (item.websiteAnalysis ?? item.website_analysis) !== null &&
    !Array.isArray(item.websiteAnalysis ?? item.website_analysis)
      ? { websiteAnalysis: (item.websiteAnalysis ?? item.website_analysis) as Record<string, unknown> }
      : {}),
    ...(typeof (item.websiteAnalysisCreatedAt ?? item.website_analysis_created_at) === 'string'
      ? {
          websiteAnalysisCreatedAt: item.websiteAnalysisCreatedAt ??
            (item.website_analysis_created_at as string),
        }
      : {}),
    ...(typeof (item.websiteAiSummary ?? item.website_ai_summary) === 'string'
      ? {
          websiteAiSummary: (item.websiteAiSummary ?? item.website_ai_summary) as string,
        }
      : {}),
    ...(typeof (item.websiteAiGeneratedAt ?? item.website_ai_generated_at) === 'string'
      ? {
          websiteAiGeneratedAt: (item.websiteAiGeneratedAt ??
            item.website_ai_generated_at) as string,
        }
      : {}),
    ...(contactAiSuggestions ? { contactAiSuggestions } : {}),
    ...(typeof (item.contactAiGeneratedAt ?? item.contact_ai_generated_at) === 'string'
      ? {
          contactAiGeneratedAt: (item.contactAiGeneratedAt ??
            item.contact_ai_generated_at) as string,
        }
      : {}),
    savedAt:
      typeof (item.savedAt ?? item.saved_at) === 'string'
        ? (item.savedAt ?? item.saved_at) as string
        : new Date().toISOString(),
    updatedAt:
      typeof (item.updatedAt ?? item.updated_at) === 'string'
        ? (item.updatedAt ?? item.updated_at) as string
        : new Date().toISOString(),
  };

  const raw = item.rawPayload ?? item.raw_payload;
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

type BackendErrorPayload = {
  message: string;
  code: string | null;
};

export class BackendApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(input: { message: string; status: number; code?: string | null }) {
    super(input.message);
    this.name = 'BackendApiError';
    this.status = input.status;
    this.code = input.code ?? null;
  }
}

const parseBackendErrorPayload = async (
  response: Response,
): Promise<BackendErrorPayload> => {
  if (response.status === 401) {
    return {
      message: USER_SESSION_ERROR_MESSAGE,
      code: null,
    };
  }

  const resolveFriendlyMessage = (input: {
    status: number;
    backendMessage: string | null;
    code: string | null;
  }): string => {
    if (input.code === 'FEATURE_NOT_IN_PLAN') {
      return USER_FEATURE_LOCKED_MESSAGE;
    }

    if (input.code === 'CHECKOUT_REQUIRED') {
      return USER_CHECKOUT_REQUIRED_MESSAGE;
    }

    if (input.status >= 500) {
      return USER_CONNECTION_ERROR_MESSAGE;
    }

    return toFriendlyErrorMessage(input.backendMessage, USER_GENERIC_ERROR_MESSAGE);
  };

  try {
    const payload = (await response.json()) as { error?: unknown; code?: unknown };
    if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
      const code =
        typeof payload.code === 'string' && payload.code.trim().length > 0
          ? payload.code
          : null;
      return {
        message: resolveFriendlyMessage({
          status: response.status,
          backendMessage: payload.error,
          code,
        }),
        code,
      };
    }
  } catch {
    // Ignore parse errors and fall back to HTTP status text.
  }

  return {
    message: response.status >= 500 ? USER_CONNECTION_ERROR_MESSAGE : USER_GENERIC_ERROR_MESSAGE,
    code: null,
  };
};

const parseBackendError = async (response: Response): Promise<string> => {
  const payload = await parseBackendErrorPayload(response);
  return payload.message;
};

const throwBackendApiError = async (response: Response): Promise<never> => {
  const payload = await parseBackendErrorPayload(response);
  throw new BackendApiError({
    message: payload.message,
    status: response.status,
    code: payload.code,
  });
};

type BusinessProfileApiResponse = {
  profile?: unknown;
};

const parseBusinessProfilePayload = (value: unknown): BusinessProfile | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const businessName =
    typeof payload.businessName === 'string' ? payload.businessName.trim() : '';
  const businessCategory =
    typeof payload.businessCategory === 'string' ? payload.businessCategory.trim() : '';
  const businessLocation =
    typeof payload.businessLocation === 'string' ? payload.businessLocation.trim() : '';
  const serviceDescription =
    typeof payload.serviceDescription === 'string' ? payload.serviceDescription.trim() : '';
  const targetCustomerType =
    typeof payload.targetCustomerType === 'string' ? payload.targetCustomerType.trim() : '';
  const preferredContactMethod =
    typeof payload.preferredContactMethod === 'string'
      ? payload.preferredContactMethod.trim()
      : '';
  const primaryProblemsYouSolve = toStringArray(payload.primaryProblemsYouSolve);

  if (
    !businessName ||
    !businessCategory ||
    !businessLocation ||
    !serviceDescription ||
    !targetCustomerType ||
    !preferredContactMethod
  ) {
    return null;
  }

  return {
    businessName,
    businessCategory,
    businessLocation,
    serviceDescription,
    targetCustomerType: targetCustomerType as BusinessProfile['targetCustomerType'],
    primaryProblemsYouSolve:
      primaryProblemsYouSolve as BusinessProfile['primaryProblemsYouSolve'],
    preferredContactMethod:
      preferredContactMethod as BusinessProfile['preferredContactMethod'],
  };
};

const getAuthorizationHeader = async (): Promise<string> => {
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) {
    throw new Error('You must be logged in to access dashboard data.');
  }

  return `Bearer ${accessToken}`;
};

export const fetchBusinessProfileFromBackend = async (): Promise<BusinessProfile | null> => {
  const requestUrl = buildApiUrl('/api/business-profile');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    await throwBackendApiError(response);
  }

  const payload = (await response.json()) as BusinessProfileApiResponse;
  return parseBusinessProfilePayload(payload.profile);
};

export const saveBusinessProfileToBackend = async (
  profile: BusinessProfile,
): Promise<BusinessProfile> => {
  const requestUrl = buildApiUrl('/api/business-profile');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    await throwBackendApiError(response);
  }

  const payload = (await response.json()) as BusinessProfileApiResponse;
  const parsed = parseBusinessProfilePayload(payload.profile);
  if (!parsed) {
    throw new Error('Business profile response is invalid.');
  }

  return parsed;
};

export const clearBusinessProfileInBackend = async (): Promise<void> => {
  const requestUrl = buildApiUrl('/api/business-profile');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'DELETE',
    headers: {
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    await throwBackendApiError(response);
  }
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
  options?: {
    signal?: AbortSignal;
    onJobStatusChange?: (status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled') => void;
  },
): Promise<{ leads: Lead[]; meta?: LeadSearchMeta }> => {
  const legacyGenerate = async (): Promise<{ leads: Lead[]; meta?: LeadSearchMeta }> => {
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
      await throwBackendApiError(response);
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

  const throwIfAborted = (): void => {
    if (options?.signal?.aborted) {
      throw new Error('Search cancelled.');
    }
  };

  const waitForPollInterval = async (ms: number): Promise<void> => {
    if (!options?.signal) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        options.signal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        window.clearTimeout(timeoutId);
        options.signal?.removeEventListener('abort', onAbort);
        reject(new Error('Search cancelled.'));
      };

      options.signal.addEventListener('abort', onAbort, { once: true });
    });
  };

  type SearchJobCreateResponse = { jobId?: unknown; status?: unknown };
  type SearchJobStatusResponse = {
    jobId?: unknown;
    status?: unknown;
    createdAt?: unknown;
    startedAt?: unknown;
    finishedAt?: unknown;
    error?: unknown;
  };
  const isJobStatus = (
    value: unknown,
  ): value is 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' =>
    value === 'queued' ||
    value === 'running' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'cancelled';

  const shouldFallbackToLegacyGenerate = (error: unknown): boolean => {
    return (
      error instanceof BackendApiError &&
      (error.status === 404 ||
        error.code === 'QUEUE_DISABLED' ||
        error.code === 'QUEUE_UNAVAILABLE')
    );
  };

  try {
    throwIfAborted();
    const requestUrl = buildApiUrl('/api/leads/search-jobs');
    const authorization = await getAuthorizationHeader();
    const createResponse = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify(toPayload(searchConfig)),
      signal: options?.signal,
    });

    if (!createResponse.ok) {
      await throwBackendApiError(createResponse);
    }

    const createPayload = (await createResponse.json()) as SearchJobCreateResponse;
    const jobId = typeof createPayload.jobId === 'string' ? createPayload.jobId.trim() : '';
    if (!jobId) {
      throw new Error('Backend returned an invalid search job id.');
    }

    activeLeadSearchJobId = jobId;
    options?.onJobStatusChange?.('queued');

    while (true) {
      throwIfAborted();
      const statusResponse = await fetch(buildApiUrl(`/api/leads/search-jobs/${encodeURIComponent(jobId)}`), {
        method: 'GET',
        headers: {
          Authorization: authorization,
        },
        signal: options?.signal,
      });

      if (!statusResponse.ok) {
        await throwBackendApiError(statusResponse);
      }

      const statusPayload = (await statusResponse.json()) as SearchJobStatusResponse;
      if (!isJobStatus(statusPayload.status)) {
        throw new Error('Backend returned an invalid job status.');
      }

      options?.onJobStatusChange?.(statusPayload.status);

      if (statusPayload.status === 'failed') {
        const backendError =
          typeof statusPayload.error === 'string' && statusPayload.error.trim().length > 0
            ? statusPayload.error
            : USER_GENERIC_ERROR_MESSAGE;
        throw new Error(backendError);
      }

      if (statusPayload.status === 'cancelled') {
        activeLeadSearchJobId = null;
        throw new Error('Search cancelled.');
      }

      if (statusPayload.status === 'completed') {
        const resultResponse = await fetch(
          buildApiUrl(`/api/leads/search-jobs/${encodeURIComponent(jobId)}/result`),
          {
            method: 'GET',
            headers: {
              Authorization: authorization,
            },
            signal: options?.signal,
          },
        );

        if (!resultResponse.ok) {
          await throwBackendApiError(resultResponse);
        }

        const payload = (await resultResponse.json()) as BackendLead[] | BackendLeadResponse;
        const backendLeads = Array.isArray(payload) ? payload : payload.leads;
        const mappedLeads = backendLeads.map(toLeadFromBackend);
        logLeadPayloads(backendLeads, mappedLeads);
        activeLeadSearchJobId = null;
        return {
          leads: mappedLeads,
          ...(Array.isArray(payload) ? {} : { meta: payload.meta }),
        };
      }

      await waitForPollInterval(1500);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Search cancelled.');
    }

    if (!(error instanceof Error && error.message === 'Search cancelled.')) {
      activeLeadSearchJobId = null;
    }

    if (shouldFallbackToLegacyGenerate(error)) {
      return legacyGenerate();
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
};

export const cancelBackendSearch = async (): Promise<void> => {
  const maybeJobId = activeLeadSearchJobId;
  const requestUrl = maybeJobId
    ? buildApiUrl(`/api/leads/search-jobs/${encodeURIComponent(maybeJobId)}/cancel`)
    : buildApiUrl('/api/leads/cancel');
  try {
    const authorization = await getAuthorizationHeader();
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        Authorization: authorization,
      },
    });
  } catch {
    // Best-effort cancellation endpoint call.
  } finally {
    activeLeadSearchJobId = null;
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
    await throwBackendApiError(response);
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
    await throwBackendApiError(response);
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
  if (leads.length === 0) {
    return {
      requested: 0,
      insertedOrUpdated: 0,
      skipped: 0,
    };
  }

  const requestUrl = buildApiUrl('/api/leads/saved-leads/bulk');
  const authorization = await getAuthorizationHeader();
  const batches = splitLeadsIntoSaveBatches(leads);

  let requested = 0;
  let insertedOrUpdated = 0;
  let skipped = 0;

  for (const batch of batches) {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({ leads: batch }),
    });

    if (!response.ok) {
      throw new Error(await parseBackendError(response));
    }

    const payload = (await response.json()) as SavedLeadBulkResponse;
    requested += toInteger(payload.requested) ?? 0;
    insertedOrUpdated += toInteger(payload.insertedOrUpdated) ?? 0;
    skipped += toInteger(payload.skipped) ?? 0;
  }

  return {
    requested,
    insertedOrUpdated,
    skipped,
  };
};

export const fetchSavedLeadsFromBackend = async (params?: {
  limit?: number;
  offset?: number;
  status?: LeadStatus | 'All';
  tier?: LeadTier | 'All';
  query?: string;
  problemAny?: string[];
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
  const queryFilter =
    typeof params?.query === 'string' ? params.query.trim() : '';
  if (queryFilter.length > 0) {
    query.set('q', queryFilter);
  }
  if (Array.isArray(params?.problemAny)) {
    const uniqueProblems = Array.from(
      new Set(
        params.problemAny
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
    uniqueProblems.forEach((problem) => query.append('problemAny', problem));
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
  const parsedProblemCounts = payload.problemCounts;
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

  const problemCounts: Record<string, number> = {};
  if (
    typeof parsedProblemCounts === 'object' &&
    parsedProblemCounts !== null &&
    !Array.isArray(parsedProblemCounts)
  ) {
    Object.entries(parsedProblemCounts as Record<string, unknown>).forEach(([problem, value]) => {
      const normalizedProblem = problem.trim();
      if (!normalizedProblem) {
        return;
      }
      problemCounts[normalizedProblem] = Math.max(0, toInteger(value) ?? 0);
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
    problemCounts,
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

export const runWebsiteAnalysisForSavedLead = async (
  savedLeadId: string,
): Promise<SavedLead> => {
  const requestUrl = buildApiUrl(`/api/leads/${encodeURIComponent(savedLeadId)}/website-analysis`);
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      Authorization: authorization,
    },
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

export const removeWebsiteAnalysisForSavedLead = async (
  savedLeadId: string,
): Promise<SavedLead> => {
  const requestUrl = buildApiUrl(`/api/leads/${encodeURIComponent(savedLeadId)}/website-analysis`);
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

  const payload = (await response.json()) as SavedLeadMutationResponse;
  const mapped = mapSavedLead(payload.savedLead as BackendSavedLead);
  if (!mapped) {
    throw new Error('Saved lead response is invalid.');
  }

  return mapped;
};

export type AiContactSuggestionChannel = 'email' | 'linkedin' | 'phone';

export const generateAiSummaryForSavedLead = async (
  savedLeadId: string,
): Promise<SavedLead> => {
  const requestUrl = buildApiUrl(`/api/leads/${encodeURIComponent(savedLeadId)}/ai-summary`);
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'X-Request-Id': createRequestId(),
    },
  });

  if (!response.ok) {
    await throwBackendApiError(response);
  }

  const payload = (await response.json()) as SavedLeadMutationResponse;
  const mapped = mapSavedLead(payload.savedLead as BackendSavedLead);
  if (!mapped) {
    throw new Error('Saved lead response is invalid.');
  }

  return mapped;
};

export const generateAiContactSuggestionForSavedLead = async (
  savedLeadId: string,
  channel: AiContactSuggestionChannel,
): Promise<SavedLead> => {
  const requestUrl = buildApiUrl(
    `/api/leads/${encodeURIComponent(savedLeadId)}/ai-contact-suggestion`,
  );
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
      'X-Request-Id': createRequestId(),
    },
    body: JSON.stringify({ channel }),
  });

  if (!response.ok) {
    await throwBackendApiError(response);
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
    query?: string;
    problemAny?: string[];
  },
): Promise<SavedLeadFilteredDeleteResult> => {
  const query = new URLSearchParams();
  if (filters?.status && filters.status !== 'All') {
    query.set('status', filters.status);
  }
  if (filters?.tier && filters.tier !== 'All') {
    query.set('tier', filters.tier);
  }
  const queryFilter =
    typeof filters?.query === 'string' ? filters.query.trim() : '';
  if (queryFilter.length > 0) {
    query.set('q', queryFilter);
  }
  if (Array.isArray(filters?.problemAny)) {
    const uniqueProblems = Array.from(
      new Set(
        filters.problemAny
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
    uniqueProblems.forEach((problem) => query.append('problemAny', problem));
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
    queryFilter:
      typeof payload.queryFilter === 'string' && payload.queryFilter.trim().length > 0
        ? payload.queryFilter.trim()
        : null,
    problemAny: toStringArray(payload.problemAny),
  };
};

type BackendBillingPlanCode = 'STANDARD' | 'PRO' | 'EXPERT';

type BillingPlanTokenCosts = {
  google_maps_search: number;
  linkedin_search: number;
  website_analysis: number;
};

type BillingEntitlements = {
  canUseLinkedInSearch: boolean;
  canUseAiEvaluations: boolean;
};

export type BillingPlan = {
  code: BackendBillingPlanCode;
  name: string;
  dailyTokenLimit: number;
  aiTokensPerMonth: number;
  entitlements: BillingEntitlements;
  tokenCosts: BillingPlanTokenCosts;
};

export type BillingUsage = {
  plan: BackendBillingPlanCode;
  subscriptionStatus: string;
  dailyTokenLimit: number;
  tokensUsedToday: number;
  tokensRemainingToday: number;
  usageDate: string;
  entitlements: BillingEntitlements;
  aiTokensTotal: number;
  aiTokensUsed: number;
  aiTokensRemaining: number;
  aiPeriodStart: string | null;
  aiPeriodEnd: string | null;
};

export type AccountDetails = {
  email: string;
  plan: BackendBillingPlanCode;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  createdAt: string | null;
};

type BillingPlansResponse = {
  plans?: unknown;
};

type BillingUsageResponse = {
  plan?: unknown;
  subscriptionStatus?: unknown;
  dailyTokenLimit?: unknown;
  tokensUsedToday?: unknown;
  tokensRemainingToday?: unknown;
  usageDate?: unknown;
  entitlements?: unknown;
  aiTokensTotal?: unknown;
  aiTokensUsed?: unknown;
  aiTokensRemaining?: unknown;
  aiPeriodStart?: unknown;
  aiPeriodEnd?: unknown;
};

type BillingChangePlanResponse = {
  subscription?: {
    plan?: unknown;
    subscriptionStatus?: unknown;
    dailyTokenLimit?: unknown;
    aiTokensPerMonth?: unknown;
    entitlements?: unknown;
    aiTokensTotal?: unknown;
    aiTokensUsed?: unknown;
    aiTokensRemaining?: unknown;
    aiPeriodStart?: unknown;
    aiPeriodEnd?: unknown;
  } | null;
};

type BillingCheckoutSessionResponse = {
  url?: unknown;
  sessionId?: unknown;
};

type BillingPortalSessionResponse = {
  url?: unknown;
};

type BillingMockPaymentResponse = {
  success?: unknown;
  subscription?: {
    plan?: unknown;
    subscriptionStatus?: unknown;
    activatedAt?: unknown;
  } | null;
};

type BillingAccountDetailsResponse = {
  account?: {
    email?: unknown;
    plan?: unknown;
    subscriptionStatus?: unknown;
    currentPeriodEnd?: unknown;
    createdAt?: unknown;
  } | null;
};

type BillingCancelSubscriptionResponse = {
  subscription?: {
    plan?: unknown;
    subscriptionStatus?: unknown;
    currentPeriodEnd?: unknown;
    scheduledDeletionAt?: unknown;
  } | null;
};

type BillingCancelDeleteResponse = {
  success?: unknown;
  deletedUserId?: unknown;
  cancelledAt?: unknown;
};

const isBillingPlanCode = (value: unknown): value is BackendBillingPlanCode =>
  value === 'STANDARD' || value === 'PRO' || value === 'EXPERT';

const parseBillingPlan = (value: unknown): BillingPlan | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const payload = value as {
    code?: unknown;
    name?: unknown;
    dailyTokenLimit?: unknown;
    aiTokensPerMonth?: unknown;
    entitlements?: unknown;
    tokenCosts?: unknown;
  };

  if (!isBillingPlanCode(payload.code) || typeof payload.name !== 'string') {
    return null;
  }

  const dailyTokenLimit = toInteger(payload.dailyTokenLimit);
  if (dailyTokenLimit === undefined) {
    return null;
  }
  const aiTokensPerMonth = toInteger(payload.aiTokensPerMonth) ?? 0;
  const entitlementsPayload = payload.entitlements;
  const entitlements: BillingEntitlements = {
    canUseLinkedInSearch: false,
    canUseAiEvaluations: false,
  };
  if (
    typeof entitlementsPayload === 'object' &&
    entitlementsPayload !== null &&
    !Array.isArray(entitlementsPayload)
  ) {
    const values = entitlementsPayload as Record<string, unknown>;
    entitlements.canUseLinkedInSearch = values.canUseLinkedInSearch === true;
    entitlements.canUseAiEvaluations = values.canUseAiEvaluations === true;
  }

  const tokenCosts = payload.tokenCosts;
  const normalizedCosts: BillingPlanTokenCosts = {
    google_maps_search: 1,
    linkedin_search: 3,
    website_analysis: 1,
  };

  if (typeof tokenCosts === 'object' && tokenCosts !== null && !Array.isArray(tokenCosts)) {
    const costs = tokenCosts as Record<string, unknown>;
    normalizedCosts.google_maps_search = toInteger(costs.google_maps_search) ?? 1;
    normalizedCosts.linkedin_search = toInteger(costs.linkedin_search) ?? 3;
    normalizedCosts.website_analysis = toInteger(costs.website_analysis) ?? 1;
  }

  return {
    code: payload.code,
    name: payload.name,
    dailyTokenLimit,
    aiTokensPerMonth,
    entitlements,
    tokenCosts: normalizedCosts,
  };
};

export const fetchBillingPlansFromBackend = async (): Promise<BillingPlan[]> => {
  const requestUrl = buildApiUrl('/api/billing/plans');
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

  const payload = (await response.json()) as BillingPlansResponse;
  const plans = Array.isArray(payload.plans) ? payload.plans : [];
  return plans.map(parseBillingPlan).filter((plan): plan is BillingPlan => plan !== null);
};

export const fetchPublicBillingPlansFromBackend = async (): Promise<BillingPlan[]> => {
  const requestUrl = buildApiUrl('/api/billing/plans');
  const response = await fetch(requestUrl, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as BillingPlansResponse;
  const plans = Array.isArray(payload.plans) ? payload.plans : [];
  return plans.map(parseBillingPlan).filter((plan): plan is BillingPlan => plan !== null);
};

export const fetchBillingUsageFromBackend = async (): Promise<BillingUsage> => {
  const requestUrl = buildApiUrl('/api/billing/usage');
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

  const payload = (await response.json()) as BillingUsageResponse;
  if (!isBillingPlanCode(payload.plan)) {
    throw new Error('Billing usage response is invalid.');
  }

  const entitlementPayload = payload.entitlements;
  const entitlements: BillingEntitlements = {
    canUseLinkedInSearch: false,
    canUseAiEvaluations: false,
  };
  if (
    typeof entitlementPayload === 'object' &&
    entitlementPayload !== null &&
    !Array.isArray(entitlementPayload)
  ) {
    const values = entitlementPayload as Record<string, unknown>;
    entitlements.canUseLinkedInSearch = values.canUseLinkedInSearch === true;
    entitlements.canUseAiEvaluations = values.canUseAiEvaluations === true;
  }

  return {
    plan: payload.plan,
    subscriptionStatus: typeof payload.subscriptionStatus === 'string' ? payload.subscriptionStatus : 'inactive',
    dailyTokenLimit: toInteger(payload.dailyTokenLimit) ?? 0,
    tokensUsedToday: toInteger(payload.tokensUsedToday) ?? 0,
    tokensRemainingToday: toInteger(payload.tokensRemainingToday) ?? 0,
    usageDate: typeof payload.usageDate === 'string' ? payload.usageDate : '',
    entitlements,
    aiTokensTotal: toInteger(payload.aiTokensTotal) ?? 0,
    aiTokensUsed: toInteger(payload.aiTokensUsed) ?? 0,
    aiTokensRemaining: toInteger(payload.aiTokensRemaining) ?? 0,
    aiPeriodStart: typeof payload.aiPeriodStart === 'string' ? payload.aiPeriodStart : null,
    aiPeriodEnd: typeof payload.aiPeriodEnd === 'string' ? payload.aiPeriodEnd : null,
  };
};

export const fetchAccountDetailsFromBackend = async (): Promise<AccountDetails> => {
  const requestUrl = buildApiUrl('/api/billing/account-details');
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

  const payload = (await response.json()) as BillingAccountDetailsResponse;
  const account = payload.account;
  if (!account || typeof account.email !== 'string' || !isBillingPlanCode(account.plan)) {
    throw new Error('Account details response is invalid.');
  }

  return {
    email: account.email,
    plan: account.plan,
    subscriptionStatus: typeof account.subscriptionStatus === 'string' ? account.subscriptionStatus : 'inactive',
    currentPeriodEnd: typeof account.currentPeriodEnd === 'string' ? account.currentPeriodEnd : null,
    createdAt: typeof account.createdAt === 'string' ? account.createdAt : null,
  };
};

export const changeBillingPlanInBackend = async (
  plan: BackendBillingPlanCode,
): Promise<BillingUsage> => {
  const requestUrl = buildApiUrl('/api/billing/change-plan');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({ plan }),
  });

  if (!response.ok) {
    await throwBackendApiError(response);
  }

  const payload = (await response.json()) as BillingChangePlanResponse;
  const subscription = payload.subscription;
  if (!subscription || !isBillingPlanCode(subscription.plan)) {
    throw new Error('Billing plan update response is invalid.');
  }

  const usage = await fetchBillingUsageFromBackend();
  return usage;
};

export const createCheckoutSessionInBackend = async (
  plan: BackendBillingPlanCode,
): Promise<{ url: string; sessionId: string }> => {
  const requestUrl = buildApiUrl('/api/billing/create-checkout-session');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({ plan }),
  });

  if (!response.ok) {
    await throwBackendApiError(response);
  }

  const payload = (await response.json()) as BillingCheckoutSessionResponse;
  if (typeof payload.url !== 'string' || payload.url.trim().length === 0) {
    throw new Error('Checkout session response is invalid.');
  }

  return {
    url: payload.url,
    sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : '',
  };
};

export const createBillingPortalSessionInBackend = async (): Promise<{ url: string }> => {
  const requestUrl = buildApiUrl('/api/billing/create-portal-session');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    await throwBackendApiError(response);
  }

  const payload = (await response.json()) as BillingPortalSessionResponse;
  if (typeof payload.url !== 'string' || payload.url.trim().length === 0) {
    throw new Error('Billing portal response is invalid.');
  }

  return { url: payload.url };
};

export const mockBillingPaymentInBackend = async (input?: {
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  cardholderName?: string;
}): Promise<void> => {
  const requestUrl = buildApiUrl('/api/billing/mock-payment');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({
      cardNumber: input?.cardNumber ?? '',
      expiry: input?.expiry ?? '',
      cvc: input?.cvc ?? '',
      cardholderName: input?.cardholderName ?? '',
    }),
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as BillingMockPaymentResponse;
  if (payload.success !== true) {
    throw new Error('Mock payment response is invalid.');
  }
};

export const cancelSubscriptionAtPeriodEndInBackend = async (): Promise<{
  plan: BackendBillingPlanCode;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
}> => {
  const requestUrl = buildApiUrl('/api/billing/cancel-subscription');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as BillingCancelSubscriptionResponse;
  const subscription = payload.subscription;
  if (!subscription || !isBillingPlanCode(subscription.plan)) {
    throw new Error('Cancel subscription response is invalid.');
  }

  return {
    plan: subscription.plan,
    subscriptionStatus:
      typeof subscription.subscriptionStatus === 'string' ? subscription.subscriptionStatus : 'inactive',
    currentPeriodEnd: typeof subscription.currentPeriodEnd === 'string' ? subscription.currentPeriodEnd : null,
  };
};

export const cancelSubscriptionAndDeleteAccountInBackend = async (
  confirmText: string,
): Promise<void> => {
  const requestUrl = buildApiUrl('/api/billing/cancel-and-delete-account');
  const authorization = await getAuthorizationHeader();
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({ confirmText }),
  });

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const payload = (await response.json()) as BillingCancelDeleteResponse;
  if (payload.success !== true) {
    throw new Error('Account deletion response is invalid.');
  }
};
