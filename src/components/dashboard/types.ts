export type LeadTier = 'Tier 1' | 'Tier 2' | 'Tier 3';

export type LeadStatus = 'New' | 'Pending' | 'Contacted' | 'Won' | 'Lost' | 'Archived';

export type ContactPreference = 'Any' | 'Email' | 'Phone' | 'LinkedIn';

export interface Lead {
  id: string;
  businessName: string;
  location: string;
  category: string;
  problems: string[];
  explanation: string;
  tier: LeadTier;
  score: number;
  status: LeadStatus;
  contactChannels: string[];
}

export interface SearchConfiguration {
  location: string;
  category: string;
  problemFilters: string[];
  contactPreference: ContactPreference;
}

export interface SavedSearch {
  id: string;
  name: string;
  config: SearchConfiguration;
}

export interface LeadFilters {
  tier: LeadTier | 'All';
  status: LeadStatus | 'All';
}
