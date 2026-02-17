export type LeadTier = 'Tier 1' | 'Tier 2' | 'Tier 3';
export type BackendLeadTier = 'most_valuable' | 'probable' | 'raw';

export type LeadStatus = 'New' | 'Pending' | 'Contacted' | 'Won' | 'Lost' | 'Archived';

export type ContactPreference = 'Any' | 'Email' | 'Phone' | 'LinkedIn';
export type SearchSource = 'linkedin' | 'google_maps' | 'google' | 'instagram';
export type TargetCustomerType =
  | 'Local Services'
  | 'Restaurants'
  | 'Clinics'
  | 'E-commerce'
  | 'SaaS'
  | 'Agencies';
export type PreferredContactMethod = 'Email' | 'Phone' | 'Both';
export type PrimaryProblem =
  | 'No Website'
  | 'Low Google Rating'
  | 'Outdated Branding'
  | 'Low Review Count'
  | 'No Social Media'
  | 'Poor SEO';

export interface Lead {
  id: string;
  businessName: string;
  location: string;
  category: string;
  source?: string;
  problems: string[];
  explanation: string;
  tier: LeadTier;
  score: number;
  status: LeadStatus;
  contactChannels: string[];
  rating?: number;
  reviewCount?: number;
}

export interface BackendProblemSignal {
  type: string;
  severity: number;
}

export interface BackendContactChannel {
  type: string;
  value: string;
}

export interface BackendLead {
  id: string;
  businessName: string;
  category: string;
  location: string;
  source?: string;
  problems: BackendProblemSignal[];
  contactChannels: BackendContactChannel[];
  tier: BackendLeadTier;
  score: number;
  explanation: string;
  rating?: number;
  review_count?: number;
}

export interface LeadSearchMeta {
  source: string;
  max_found_leads?: number;
  requested_max_results?: number;
  stop_reason?: string;
  reached_max_available?: boolean;
}

export interface BackendLeadResponse {
  leads: BackendLead[];
  meta?: LeadSearchMeta;
}

export interface SearchConfiguration {
  location: string;
  category: string;
  searchSource: SearchSource | '';
  businessType: string;
  problemCategoriesSelected: string[];
  problemFilters: string[];
  contactPreference: ContactPreference;
  maxResults: number;
  profileServiceDescription?: string;
  profileTargetCustomerType?: TargetCustomerType;
}

export interface BusinessProfile {
  businessName: string;
  businessCategory: string;
  businessLocation: string;
  serviceDescription: string;
  targetCustomerType: TargetCustomerType;
  primaryProblemsYouSolve: PrimaryProblem[];
  preferredContactMethod: PreferredContactMethod;
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
