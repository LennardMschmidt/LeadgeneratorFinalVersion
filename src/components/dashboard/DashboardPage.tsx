import { useMemo, useState } from 'react';
import { generateLeadsFromBackend } from './api';
import { DashboardHeader } from './DashboardHeader';
import { LeadManagementTable } from './LeadManagementTable';
import { SearchConfigurationPanel } from './SearchConfigurationPanel';
import { getBusinessProfile } from './businessProfileStorage';
import { INITIAL_SAVED_SEARCHES } from './mockData';
import { TierOverviewCards } from './TierOverviewCards';
import {
  BusinessProfile,
  Lead,
  LeadFilters,
  LeadStatus,
  SavedSearch,
  SearchConfiguration,
} from './types';

interface DashboardPageProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateBusinessProfile: () => void;
  onLogout: () => void;
}

export function DashboardPage({
  onNavigateHome,
  onNavigateDashboard,
  onNavigateBusinessProfile,
  onLogout,
}: DashboardPageProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(INITIAL_SAVED_SEARCHES);
  const [selectedSavedSearchId, setSelectedSavedSearchId] = useState('');
  const [businessProfile] = useState<BusinessProfile | null>(() => getBusinessProfile());
  const [useBusinessProfile, setUseBusinessProfile] = useState(false);
  const [searchConfig, setSearchConfig] = useState<SearchConfiguration>({
    location: '',
    category: '',
    problemFilters: [],
    contactPreference: 'Any',
    maxResults: 20,
  });
  const [activeTier, setActiveTier] = useState<LeadFilters['tier']>('All');
  const [filters, setFilters] = useState<LeadFilters>({
    tier: 'All',
    status: 'All',
  });
  const [isRunningSearch, setIsRunningSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const applyBusinessProfile = (enabled: boolean) => {
    setUseBusinessProfile(enabled);

    if (!enabled || !businessProfile) {
      return;
    }

    setSearchConfig((currentConfig) => ({
      ...currentConfig,
      category: businessProfile.businessCategory,
      location: businessProfile.businessLocation,
      profileServiceDescription: businessProfile.serviceDescription,
      profileTargetCustomerType: businessProfile.targetCustomerType,
    }));
  };

  const tierCounts = useMemo(
    () => ({
      'Tier 1': leads.filter((lead) => lead.tier === 'Tier 1').length,
      'Tier 2': leads.filter((lead) => lead.tier === 'Tier 2').length,
      'Tier 3': leads.filter((lead) => lead.tier === 'Tier 3').length,
    }),
    [leads],
  );

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        const tierMatches = filters.tier === 'All' ? true : lead.tier === filters.tier;
        const statusMatches = filters.status === 'All' ? true : lead.status === filters.status;
        return tierMatches && statusMatches;
      }),
    [leads, filters],
  );

  const updateTierFilter = (tier: LeadFilters['tier']) => {
    setActiveTier(tier);
    setFilters((currentFilters) => ({
      ...currentFilters,
      tier,
    }));
  };

  const updateStatusFilter = (status: LeadFilters['status']) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      status,
    }));
  };

  const updateLeadStatus = (leadId: string, nextStatus: LeadStatus) => {
    setLeads((currentLeads) =>
      currentLeads.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead)),
    );
  };

  const runSearch = async () => {
    const location = searchConfig.location.trim();
    const category = searchConfig.category.trim();

    if (!location || !category) {
      setSearchError('Location and business category are required.');
      return;
    }

    setSearchError(null);
    setIsRunningSearch(true);

    try {
      const nextLeads = await generateLeadsFromBackend(searchConfig);
      setLeads(nextLeads);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate leads.';
      setSearchError(message);
    } finally {
      setIsRunningSearch(false);
    }
  };

  const saveSearch = () => {
    const normalizedLocation = searchConfig.location.trim();
    const normalizedCategory = searchConfig.category.trim();
    const labelBase = normalizedCategory || normalizedLocation ? `${normalizedCategory || 'Any category'} - ${normalizedLocation || 'Any location'}` : 'Custom Search';

    const newSavedSearch: SavedSearch = {
      id: `saved-${Date.now()}`,
      name: `${labelBase}`,
      config: { ...searchConfig },
    };

    setSavedSearches((currentSearches) => [newSavedSearch, ...currentSearches]);
    setSelectedSavedSearchId(newSavedSearch.id);
  };

  const selectSavedSearch = (savedSearchId: string) => {
    setSelectedSavedSearchId(savedSearchId);

    if (!savedSearchId) {
      return;
    }

    const savedSearch = savedSearches.find((item) => item.id === savedSearchId);
    if (!savedSearch) {
      return;
    }

    setSearchConfig({
      ...savedSearch.config,
      maxResults: savedSearch.config.maxResults ?? 20,
    });
  };

  const exportCsv = () => {
    const headers = ['Business Name', 'Location', 'Category', 'Tier', 'Score', 'Status', 'Contact Channels'];
    const rows = filteredLeads.map((lead) => [
      lead.businessName,
      lead.location,
      lead.category,
      lead.tier,
      String(lead.score),
      lead.status,
      lead.contactChannels.join('|'),
    ]);

    const escapeCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csvText = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsvValue(cell)).join(','))
      .join('\n');

    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'lead-signal-dashboard-export.csv';
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const exportPdf = () => {
    console.log('PDF export placeholder. Current filtered leads:', filteredLeads);
  };

  return (
    <>
      <DashboardHeader
        onNavigateHome={onNavigateHome}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateBusinessProfile={onNavigateBusinessProfile}
        onLogout={onLogout}
      />

      <main className="relative max-w-7xl mx-auto px-6 py-20">
        <section className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-bold">Dashboard</h1>
        </section>

        <section className="mt-16" style={{marginBottom: "20px"}}>
          <TierOverviewCards
            counts={tierCounts}
            totalLeads={leads.length}
            activeTier={activeTier}
            onSelectTier={updateTierFilter}
          />
        </section>

        <section className="mt-[10px]" style={{marginBottom: "20px"}}>
          <SearchConfigurationPanel
            searchConfig={searchConfig}
            savedSearches={savedSearches}
            selectedSavedSearchId={selectedSavedSearchId}
            businessProfile={businessProfile}
            useBusinessProfile={useBusinessProfile}
            isRunningSearch={isRunningSearch}
            onSelectSavedSearch={selectSavedSearch}
            onUpdateSearchConfig={setSearchConfig}
            onUseBusinessProfileChange={applyBusinessProfile}
            onNavigateBusinessProfile={onNavigateBusinessProfile}
            onSaveSearch={saveSearch}
            onRunSearch={runSearch}
          />
        </section>

        {searchError ? (
          <section className="mt-4">
            <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {searchError}
            </div>
          </section>
        ) : null}

        <section className="mt-24">
          <LeadManagementTable
            leads={filteredLeads}
            filters={filters}
            onTierFilterChange={updateTierFilter}
            onStatusFilterChange={updateStatusFilter}
            onLeadStatusChange={updateLeadStatus}
            onExportCsv={exportCsv}
            onExportPdf={exportPdf}
          />
        </section>
      </main>
    </>
  );
}
