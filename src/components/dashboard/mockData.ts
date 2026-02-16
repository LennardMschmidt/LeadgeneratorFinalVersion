import { LeadStatus, LeadTier, SavedSearch } from './types';

export const PROBLEM_FILTER_OPTIONS = [
  'No website',
  'Low rating',
  'No social presence',
  'Outdated website',
  'No booking system',
];

export const CONTACT_PREFERENCE_OPTIONS = ['Any', 'Email', 'Phone', 'LinkedIn'] as const;

export const STATUS_OPTIONS: LeadStatus[] = ['New', 'Pending', 'Contacted', 'Won', 'Lost', 'Archived'];

export const TIER_OPTIONS: Array<LeadTier | 'All'> = ['All', 'Tier 1', 'Tier 2', 'Tier 3'];

export const TIER_META: Record<LeadTier, { title: string; subtitle: string }> = {
  'Tier 1': {
    title: 'Most Valuable Leads (Tier 1)',
    subtitle: 'High priority opportunities',
  },
  'Tier 2': {
    title: 'Probable Leads (Tier 2)',
    subtitle: 'Strong opportunities to nurture',
  },
  'Tier 3': {
    title: 'Raw Leads (Tier 3)',
    subtitle: 'Early-stage opportunities',
  },
};

export const INITIAL_SAVED_SEARCHES: SavedSearch[] = [
  {
    id: 'saved-1',
    name: 'Seattle Cafes',
    config: {
      location: 'Seattle, WA',
      category: 'Cafe',
      problemFilters: ['No website', 'Low rating'],
      contactPreference: 'Email',
      maxResults: 20,
    },
  },
  {
    id: 'saved-2',
    name: 'Dental Prospects',
    config: {
      location: 'California',
      category: 'Dental Clinic',
      problemFilters: ['No booking system'],
      contactPreference: 'Phone',
      maxResults: 20,
    },
  },
];
