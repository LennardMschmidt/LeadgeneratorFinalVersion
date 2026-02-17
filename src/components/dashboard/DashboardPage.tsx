import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import {
  cancelBackendSearch,
  createSavedSearchInBackend,
  deleteSavedSearchFromBackend,
  fetchSavedSearchesFromBackend,
  generateLeadsFromBackend,
  saveLeadToBackend,
  saveVisibleLeadsToBackend,
} from './api';
import { DashboardHeader } from './DashboardHeader';
import { LeadManagementTable } from './LeadManagementTable';
import { SearchConfigurationPanel } from './SearchConfigurationPanel';
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
  onNavigateSavedSearches: () => void;
  onLogout: () => void;
}

const toDisplayScore = (score: number, maxScore: number): number => {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
    return 0;
  }
  const normalized = Math.max(0, Math.min(100, (score / maxScore) * 100));
  return Math.round(normalized);
};

export function DashboardPage({
  onNavigateHome,
  onNavigateDashboard,
  onNavigateBusinessProfile,
  onNavigateSavedSearches,
  onLogout,
}: DashboardPageProps) {
  const { raw, t } = useI18n();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [selectedSavedSearchId, setSelectedSavedSearchId] = useState('');
  const [searchConfig, setSearchConfig] = useState<SearchConfiguration>({
    location: '',
    category: '',
    searchSource: '',
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
  const [lastSearchSelectedProblemCount, setLastSearchSelectedProblemCount] = useState(0);
  const [isSavingSearch, setIsSavingSearch] = useState(false);
  const [deletingSavedSearchId, setDeletingSavedSearchId] = useState<string | null>(null);
  const [isSavingVisibleLeads, setIsSavingVisibleLeads] = useState(false);
  const [savingLeadIds, setSavingLeadIds] = useState<Record<string, boolean>>({});
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const activeSearchAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSavedSearches = async () => {
      try {
        const loadedSearches = await fetchSavedSearchesFromBackend();
        if (!isMounted) {
          return;
        }
        setSavedSearches(loadedSearches);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof Error) {
          setSearchError(error.message);
        } else {
          setSearchError('Failed to load saved searches.');
        }
      }
    };

    void loadSavedSearches();
    return () => {
      isMounted = false;
    };
  }, []);

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

  const maxRawScore = useMemo(
    () => leads.reduce((currentMax, lead) => Math.max(currentMax, lead.score), 0),
    [leads],
  );

  const scoreDenominator = useMemo(() => {
    if (lastSearchSelectedProblemCount > 0) {
      return lastSearchSelectedProblemCount;
    }
    return maxRawScore;
  }, [lastSearchSelectedProblemCount, maxRawScore]);

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
      return t('dashboard.maxFoundWithRequest', {
        source: searchMeta.source,
        maxFound,
        requestedMax,
      });
    }

    return t('dashboard.maxFound', {
      source: searchMeta.source,
      maxFound,
    });
  }, [searchMeta, t]);

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
      setSearchError(t('dashboard.errors.locationAndCategoryRequired'));
      return;
    }

    if (!businessType) {
      setSearchError(t('dashboard.errors.businessTypeRequired'));
      return;
    }

    if (!searchConfig.searchSource) {
      setSearchError(t('dashboard.errors.searchSourceRequired'));
      return;
    }

    setSearchError(null);
    setSearchMeta(null);
    const selectedProblemCount = new Set(
      searchConfig.problemFilters.map((item) => item.trim().toLowerCase()).filter(Boolean),
    ).size;
    setLastSearchSelectedProblemCount(selectedProblemCount);
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
      if (error instanceof Error) {
        const unreachablePrefix = 'Could not reach backend at ';
        const unreachableSuffix =
          '. Verify the backend is running and URL settings are correct.';

        if (error.message === 'Search cancelled.') {
          setSearchError(t('dashboard.errors.searchCancelled'));
        } else if (
          error.message.startsWith(unreachablePrefix) &&
          error.message.endsWith(unreachableSuffix)
        ) {
          const target = error.message.slice(
            unreachablePrefix.length,
            -unreachableSuffix.length,
          );
          setSearchError(t('dashboard.errors.backendUnreachable', { target }));
        } else {
          setSearchError(error.message);
        }
      } else {
        setSearchError(t('dashboard.errors.failedGenerate'));
      }
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
    setSearchError(t('dashboard.errors.searchCancelled'));
  };

  const saveSearch = async () => {
    const normalizedLocation = searchConfig.location.trim();
    const normalizedCategory = searchConfig.category.trim();
    const name =
      normalizedCategory || normalizedLocation
        ? `${normalizedCategory || t('dashboard.saveSearch.anyCategory')} - ${normalizedLocation || t('dashboard.saveSearch.anyLocation')}`
        : t('dashboard.saveSearch.customSearch');

    setIsSavingSearch(true);
    try {
      const created = await createSavedSearchInBackend(name, searchConfig);
      setSavedSearches((currentSearches) => [created, ...currentSearches]);
      setSelectedSavedSearchId(created.id);
    } catch (error) {
      if (error instanceof Error) {
        setSearchError(error.message);
      } else {
        setSearchError('Failed to save search.');
      }
    } finally {
      setIsSavingSearch(false);
    }
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
      searchSource: savedSearch.config.searchSource ?? '',
      businessType: savedSearch.config.businessType ?? '',
      problemCategoriesSelected:
        savedSearch.config.problemCategoriesSelected ?? savedSearch.config.problemFilters ?? [],
      problemFilters:
        savedSearch.config.problemCategoriesSelected ?? savedSearch.config.problemFilters ?? [],
      maxResults: savedSearch.config.maxResults ?? 20,
    });
  };

  const deleteSavedSearch = async (savedSearchId: string) => {
    if (!savedSearchId || deletingSavedSearchId) {
      return;
    }

    setDeletingSavedSearchId(savedSearchId);
    try {
      await deleteSavedSearchFromBackend(savedSearchId);
      setSavedSearches((currentSearches) =>
        currentSearches.filter((search) => search.id !== savedSearchId),
      );
      if (selectedSavedSearchId === savedSearchId) {
        setSelectedSavedSearchId('');
      }
    } catch (error) {
      if (error instanceof Error) {
        setSearchError(error.message);
      } else {
        setSearchError('Failed to delete saved search.');
      }
    } finally {
      setDeletingSavedSearchId(null);
    }
  };

  const exportCsv = () => {
    const headers = raw<string[]>('dashboard.csv.headers');
    const rows = filteredLeads.map((lead) => [
      lead.businessName,
      lead.location,
      lead.category,
      lead.tier,
      String(toDisplayScore(lead.score, scoreDenominator)),
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
    anchor.download = t('dashboard.csv.fileName');
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const exportPdf = () => {
    console.log('PDF export placeholder. Current filtered leads:', filteredLeads);
  };

  const saveVisibleLeads = async () => {
    if (isSavingVisibleLeads) {
      return;
    }

    if (filteredLeads.length === 0) {
      setActionNotice(null);
      setSearchError(t('dashboard.savedLeads.noLeadsToSave'));
      return;
    }

    setIsSavingVisibleLeads(true);
    try {
      const summary = await saveVisibleLeadsToBackend(filteredLeads);
      setSearchError(null);
      setActionNotice(
        t('dashboard.savedLeads.bulkSavedSuccess', {
          requested: summary.requested,
          saved: summary.insertedOrUpdated,
          skipped: summary.skipped,
        }),
      );
    } catch (error) {
      setActionNotice(null);
      if (error instanceof Error) {
        setSearchError(error.message);
      } else {
        setSearchError(t('dashboard.savedLeads.bulkSavedError'));
      }
    } finally {
      setIsSavingVisibleLeads(false);
    }
  };

  const saveLead = async (leadId: string) => {
    if (!leadId || savingLeadIds[leadId]) {
      return;
    }

    const lead = filteredLeads.find((item) => item.id === leadId);
    if (!lead) {
      return;
    }

    setSavingLeadIds((current) => ({ ...current, [leadId]: true }));
    try {
      await saveLeadToBackend(lead);
      setSearchError(null);
      setActionNotice(
        t('dashboard.savedLeads.singleSavedSuccess', {
          name: lead.businessName,
        }),
      );
    } catch (error) {
      setActionNotice(null);
      if (error instanceof Error) {
        setSearchError(error.message);
      } else {
        setSearchError(t('dashboard.savedLeads.singleSavedError'));
      }
    } finally {
      setSavingLeadIds((current) => {
        const next = { ...current };
        delete next[leadId];
        return next;
      });
    }
  };

  return (
    <>
      <DashboardHeader
        onNavigateHome={onNavigateHome}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateBusinessProfile={onNavigateBusinessProfile}
        onNavigateSavedSearches={onNavigateSavedSearches}
        onLogout={onLogout}
      />

      <main className="relative max-w-7xl mx-auto px-6 py-20">
        <section className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-bold">{t('dashboard.title')}</h1>
        </section>

        <section className="mt-16" style={{ marginBottom: '20px' }}>
          <TierOverviewCards
            counts={tierCounts}
            totalLeads={leads.length}
            activeTier={activeTier}
            onSelectTier={updateTierFilter}
            maxFoundNotice={maxFoundNotice}
          />
        </section>

        <section className="mt-[10px]" style={{ marginBottom: '20px' }}>
          <SearchConfigurationPanel
            searchConfig={searchConfig}
            savedSearches={savedSearches}
            selectedSavedSearchId={selectedSavedSearchId}
            deletingSavedSearchId={deletingSavedSearchId}
            isRunningSearch={isRunningSearch}
            isSavingSearch={isSavingSearch}
            onSelectSavedSearch={selectSavedSearch}
            onDeleteSavedSearch={deleteSavedSearch}
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
            <br />
          </section>
        ) : null}

        {actionNotice ? (
          <section className="mt-4">
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {actionNotice}
            </div>
          </section>
        ) : null}

        <section className="mt-24">
          <LeadManagementTable
            leads={filteredLeads}
            scoreDenominator={scoreDenominator}
            isLoading={isRunningSearch}
            filters={filters}
            onTierFilterChange={updateTierFilter}
            onStatusFilterChange={updateStatusFilter}
            onLeadStatusChange={updateLeadStatus}
            onExportCsv={exportCsv}
            onExportPdf={exportPdf}
            onSaveVisibleLeads={saveVisibleLeads}
            onSaveLead={saveLead}
            isSavingVisibleLeads={isSavingVisibleLeads}
            savingLeadIds={savingLeadIds}
          />
        </section>
      </main>
    </>
  );
}
