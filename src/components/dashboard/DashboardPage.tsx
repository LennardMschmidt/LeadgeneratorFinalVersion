import { useMemo, useRef, useState } from 'react';
import { cancelBackendSearch, generateLeadsFromBackend } from './api';
import { DashboardHeader } from './DashboardHeader';
import { LeadManagementTable } from './LeadManagementTable';
import { SearchConfigurationPanel } from './SearchConfigurationPanel';
import { INITIAL_SAVED_SEARCHES } from './mockData';
import { TierOverviewCards } from './TierOverviewCards';
import {
  Lead,
  LeadFilters,
  LeadSearchMeta,
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

const toDisplayScore = (score: number): number => {
  if (!Number.isFinite(score)) {
    return 0;
  }
  if (score <= 1) {
    return Math.round(score * 100);
  }
  return Math.round(score);
};

export function DashboardPage({
  onNavigateHome,
  onNavigateDashboard,
  onNavigateBusinessProfile,
  onLogout,
}: DashboardPageProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(INITIAL_SAVED_SEARCHES);
  const [selectedSavedSearchId, setSelectedSavedSearchId] = useState('');
  const [searchConfig, setSearchConfig] = useState<SearchConfiguration>({
    location: '',
    category: '',
    businessType: '',
    problemCategoriesSelected: [],
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
  const [searchMeta, setSearchMeta] = useState<LeadSearchMeta | null>(null);
  const activeSearchAbortControllerRef = useRef<AbortController | null>(null);

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

  const maxFoundNotice = useMemo(() => {
    if (!searchMeta) {
      return null;
    }

    const maxFound = searchMeta.max_found_leads;
    if (typeof maxFound !== 'number') {
      return null;
    }

    const requestedMax = searchMeta.requested_max_results;
    const stopReason = searchMeta.stop_reason;
    const reachedMaxAvailable =
      searchMeta.reached_max_available === true ||
      stopReason === 'google_maps_end_of_list' ||
      stopReason === 'idle_limit_reached';

    if (!reachedMaxAvailable) {
      return null;
    }

    if (typeof requestedMax === 'number' && requestedMax > maxFound) {
      return `Max found leads from ${searchMeta.source}: ${maxFound} (requested ${requestedMax}).`;
    }

    return `Max found leads from ${searchMeta.source}: ${maxFound}.`;
  }, [searchMeta]);

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
    const businessType = searchConfig.businessType.trim();

    if (!location || !category) {
      setSearchError('Location and business category are required.');
      return;
    }
    if (!businessType) {
      setSearchError('Business type is required.');
      return;
    }

    setSearchError(null);
    setSearchMeta(null);
    setIsRunningSearch(true);
    const controller = new AbortController();
    activeSearchAbortControllerRef.current = controller;

    try {
      const result = await generateLeadsFromBackend(searchConfig, {
        signal: controller.signal,
      });
      setLeads(result.leads);
      setSearchMeta(result.meta ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate leads.';
      setSearchError(message);
    } finally {
      activeSearchAbortControllerRef.current = null;
      setIsRunningSearch(false);
    }
  };

  const cancelSearch = async () => {
    if (!isRunningSearch) {
      return;
    }

    activeSearchAbortControllerRef.current?.abort();
    await cancelBackendSearch();
    setIsRunningSearch(false);
    setSearchError('Search cancelled.');
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
      businessType: savedSearch.config.businessType ?? '',
      problemCategoriesSelected:
        savedSearch.config.problemCategoriesSelected ?? savedSearch.config.problemFilters ?? [],
      problemFilters:
        savedSearch.config.problemCategoriesSelected ?? savedSearch.config.problemFilters ?? [],
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
      String(toDisplayScore(lead.score)),
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
            maxFoundNotice={maxFoundNotice}
          />
        </section>

        <section className="mt-[10px]" style={{marginBottom: "20px"}}>
          <SearchConfigurationPanel
            searchConfig={searchConfig}
            savedSearches={savedSearches}
            selectedSavedSearchId={selectedSavedSearchId}
            isRunningSearch={isRunningSearch}
            onSelectSavedSearch={selectSavedSearch}
            onUpdateSearchConfig={setSearchConfig}
            onSaveSearch={saveSearch}
            onRunSearch={runSearch}
            onCancelSearch={cancelSearch}
          />
        </section>

        {searchError ? (
          <section className="mt-4">
            <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {searchError}
            </div>
            <br/>
          </section>
        ) : null}
        <section className="mt-24">
          <LeadManagementTable
            leads={filteredLeads}
            isLoading={isRunningSearch}
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
