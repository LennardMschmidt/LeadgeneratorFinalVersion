import type { SearchSource } from './types';

type SearchSourceLabelKey =
  | 'dashboard.searchPanel.searchSourceLinkedIn'
  | 'dashboard.searchPanel.searchSourceGoogleMaps';

export const SEARCH_SOURCE_OPTIONS: Array<{
  value: SearchSource;
  labelKey: SearchSourceLabelKey;
}> = [
  { value: 'google_maps', labelKey: 'dashboard.searchPanel.searchSourceGoogleMaps' },
  { value: 'linkedin', labelKey: 'dashboard.searchPanel.searchSourceLinkedIn' },
];

const SEARCH_SOURCE_ALIASES: Record<string, SearchSource> = {
  google: 'google_maps',
  google_maps: 'google_maps',
  linkedin: 'linkedin',
};

export const canonicalizeSearchSource = (value: unknown): SearchSource | '' => {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim().toLowerCase();
  return SEARCH_SOURCE_ALIASES[normalized] ?? '';
};
