import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import {
  BackendApiError,
  cancelBackendSearch,
  createSavedSearchInBackend,
  deleteSavedSearchFromBackend,
  fetchBillingUsageFromBackend,
  fetchSavedSearchesFromBackend,
  generateAiSummaryForSavedLead,
  generateLeadsFromBackend,
  saveLeadToBackend,
  saveVisibleLeadsToBackend,
} from './api';
import type { SearchJobUpdate } from './api';
import { DashboardHeader } from './DashboardHeader';
import { getProblemCategoriesForBusinessType } from './businessTypeProblemCatalog';
import { exportRowsToExcel } from './exportUtils';
import { AppAlertToast } from '../ui/AppAlertToast';
import { LeadManagementTable } from './LeadManagementTable';
import { SearchConfigurationPanel } from './SearchConfigurationPanel';
import { TierOverviewCards } from './TierOverviewCards';
import { WebsiteAnalysisModal } from './WebsiteAnalysisModal';
import { toFriendlyErrorFromUnknown } from '../../lib/errorMessaging';
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
  onNavigateBilling: () => void;
  onNavigateAccountSettings: () => void;
  onLogout: () => void;
}

const DASHBOARD_GUIDE_SEEN_STORAGE_KEY = 'dashboard_guide_seen_v1';

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
  onNavigateBilling,
  onNavigateAccountSettings,
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
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [dashboardProblemAny, setDashboardProblemAny] = useState<string[]>([]);
  const [websiteAnalysisModalLeadId, setWebsiteAnalysisModalLeadId] = useState<string | null>(null);
  const [websiteAiSummaryLoadingLeadId, setWebsiteAiSummaryLoadingLeadId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [saveSuccessHint, setSaveSuccessHint] = useState<string | null>(null);
  const [canUseLinkedInSearch, setCanUseLinkedInSearch] = useState(false);
  const [canUseAiEvaluations, setCanUseAiEvaluations] = useState(false);
  const [isFirstRunGuideOpen, setIsFirstRunGuideOpen] = useState(false);
  const [activeJobUpdate, setActiveJobUpdate] = useState<SearchJobUpdate | null>(null);
  const [searchLogs, setSearchLogs] = useState<string[]>([]);
  const [isSearchLogVisible, setIsSearchLogVisible] = useState(false);
  const [isSearchLogMounted, setIsSearchLogMounted] = useState(false);
  const [hasSearchLogSessionStarted, setHasSearchLogSessionStarted] = useState(false);
  const [isSearchLogAutoFollowEnabled, setIsSearchLogAutoFollowEnabled] = useState(true);
  const activeSearchAbortControllerRef = useRef<AbortController | null>(null);
  const searchLogViewportRef = useRef<HTMLDivElement | null>(null);
  const hideSearchLogTimeoutRef = useRef<number | null>(null);
  const showSearchLogAnimationFrameRef = useRef<number | null>(null);
  const latestQueuePositionRef = useRef<number | null>(null);

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
          setSearchError(toFriendlyErrorFromUnknown(error));
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const hasSeenGuide =
        window.localStorage.getItem(DASHBOARD_GUIDE_SEEN_STORAGE_KEY) === 'true';
      if (!hasSeenGuide) {
        setIsFirstRunGuideOpen(true);
      }
    } catch {
      setIsFirstRunGuideOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!saveSuccessHint) {
      return;
    }

    const clearHintTimeout = window.setTimeout(() => {
      setSaveSuccessHint(null);
    }, 4000);

    return () => window.clearTimeout(clearHintTimeout);
  }, [saveSuccessHint]);

  useEffect(() => {
    return () => {
      if (hideSearchLogTimeoutRef.current !== null) {
        window.clearTimeout(hideSearchLogTimeoutRef.current);
      }
      if (showSearchLogAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(showSearchLogAnimationFrameRef.current);
      }
    };
  }, []);

  const openSearchLogPanel = () => {
    if (hideSearchLogTimeoutRef.current !== null) {
      window.clearTimeout(hideSearchLogTimeoutRef.current);
      hideSearchLogTimeoutRef.current = null;
    }

    if (showSearchLogAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(showSearchLogAnimationFrameRef.current);
      showSearchLogAnimationFrameRef.current = null;
    }

    if (!isSearchLogMounted) {
      setIsSearchLogMounted(true);
      setIsSearchLogVisible(false);
      showSearchLogAnimationFrameRef.current = window.requestAnimationFrame(() => {
        showSearchLogAnimationFrameRef.current = window.requestAnimationFrame(() => {
          setIsSearchLogVisible(true);
          showSearchLogAnimationFrameRef.current = null;
        });
      });
      return;
    }

    setIsSearchLogVisible(true);
  };

  const closeSearchLogPanel = () => {
    if (showSearchLogAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(showSearchLogAnimationFrameRef.current);
      showSearchLogAnimationFrameRef.current = null;
    }

    if (hideSearchLogTimeoutRef.current !== null) {
      window.clearTimeout(hideSearchLogTimeoutRef.current);
    }

    setIsSearchLogVisible(false);
    hideSearchLogTimeoutRef.current = window.setTimeout(() => {
      setIsSearchLogMounted(false);
      setHasSearchLogSessionStarted(false);
      hideSearchLogTimeoutRef.current = null;
    }, 520);
  };

  useEffect(() => {
    if (!hasSearchLogSessionStarted) {
      setIsSearchLogVisible(false);
      setIsSearchLogMounted(false);
      return;
    }

    const status = activeJobUpdate?.status;
    const isActiveStatus = status === 'queued' || status === 'running';

    if (isRunningSearch || isActiveStatus) {
      openSearchLogPanel();
      return;
    }

    closeSearchLogPanel();
  }, [activeJobUpdate?.status, hasSearchLogSessionStarted, isRunningSearch, isSearchLogMounted]);

  useEffect(() => {
    const viewport = searchLogViewportRef.current;
    if (!viewport || !isSearchLogVisible || !isSearchLogAutoFollowEnabled) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [searchLogs, isSearchLogVisible, isSearchLogAutoFollowEnabled]);

  useEffect(() => {
    let isMounted = true;

    const loadEntitlements = async () => {
      try {
        const usage = await fetchBillingUsageFromBackend();
        if (!isMounted) {
          return;
        }

        setCanUseLinkedInSearch(usage.entitlements.canUseLinkedInSearch);
        setCanUseAiEvaluations(usage.entitlements.canUseAiEvaluations);
      } catch {
        if (!isMounted) {
          return;
        }
        setCanUseLinkedInSearch(false);
        setCanUseAiEvaluations(false);
      }
    };

    void loadEntitlements();
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

  const availableDashboardProblemCategories = useMemo(
    () => getProblemCategoriesForBusinessType(searchConfig.businessType),
    [searchConfig.businessType],
  );

  useEffect(() => {
    setDashboardProblemAny((current) =>
      current.filter((problem) => availableDashboardProblemCategories.includes(problem)),
    );
  }, [availableDashboardProblemCategories]);

  const filteredLeads = useMemo(
    () => {
      const normalizedQuery = dashboardSearchQuery.trim().toLowerCase();
      return leads.filter((lead) => {
        const tierMatches = filters.tier === 'All' ? true : lead.tier === filters.tier;
        const statusMatches = filters.status === 'All' ? true : lead.status === filters.status;
        const queryMatches =
          normalizedQuery.length === 0
            ? true
            : [
                lead.businessName,
                lead.category,
                lead.location,
                lead.source ?? '',
                lead.explanation,
                lead.contactChannels.join(' '),
              ]
                .join(' ')
                .toLowerCase()
                .includes(normalizedQuery);
        const problemMatches =
          dashboardProblemAny.length === 0
            ? true
            : lead.problems.some((problem) => dashboardProblemAny.includes(problem));
        return tierMatches && statusMatches && queryMatches && problemMatches;
      });
    },
    [leads, filters, dashboardSearchQuery, dashboardProblemAny],
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

  const setGuideModalOpen = (open: boolean) => {
    setIsFirstRunGuideOpen(open);
    if (open || typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(DASHBOARD_GUIDE_SEEN_STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage errors in restricted environments.
    }
  };

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

  const toggleDashboardProblemFilter = (problem: string) => {
    setDashboardProblemAny((current) =>
      current.includes(problem)
        ? current.filter((item) => item !== problem)
        : [...current, problem],
    );
  };

  const updateLeadStatus = (leadId: string, nextStatus: LeadStatus) => {
    setLeads((currentLeads) =>
      currentLeads.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead)),
    );
  };

  const runSearch = async (configOverride?: SearchConfiguration) => {
    const currentConfig = configOverride ?? searchConfig;
    const location = currentConfig.location.trim();
    const category = currentConfig.category.trim();
    const businessType = currentConfig.businessType.trim();
    const isGoogleMapsSource = currentConfig.searchSource === 'google_maps';

    if (!location || !category) {
      setSearchError(t('dashboard.errors.locationAndCategoryRequired'));
      return;
    }

    if (isGoogleMapsSource && !businessType) {
      setSearchError(t('dashboard.errors.businessTypeRequired'));
      return;
    }

    if (!currentConfig.searchSource) {
      setSearchError(t('dashboard.errors.searchSourceRequired'));
      return;
    }

    if (currentConfig.searchSource === 'linkedin' && !canUseLinkedInSearch) {
      setSearchError(t('dashboard.errors.linkedinRequiresPro'));
      setActionNotice(t('dashboard.errors.upgradeForLinkedIn'));
      return;
    }

    setSearchError(null);
    setSearchMeta(null);
    setActionNotice(null);
    setSearchLogs([]);
    latestQueuePositionRef.current = null;
    setActiveJobUpdate(null);
    setIsSearchLogAutoFollowEnabled(true);
    setHasSearchLogSessionStarted(true);
    openSearchLogPanel();
    const selectedProblemCount = isGoogleMapsSource
      ? new Set(
          currentConfig.problemFilters.map((item) => item.trim().toLowerCase()).filter(Boolean),
        ).size
      : 0;
    setLastSearchSelectedProblemCount(selectedProblemCount);

    setIsRunningSearch(true);
    const controller = new AbortController();
    activeSearchAbortControllerRef.current = controller;

    try {
      const result = await generateLeadsFromBackend(currentConfig, {
        signal: controller.signal,
        onJobStatusChange: (status) => {
          if (status === 'queued') {
            setActionNotice('Search queued. Waiting for an available scraper worker...');
            return;
          }

          if (status === 'running') {
            setActionNotice('Search is running now.');
          }
        },
        onJobUpdate: (update) => {
          setActiveJobUpdate(update);

          const queuePositionChanged =
            update.status === 'queued' &&
            typeof update.queuePosition === 'number' &&
            update.queuePosition !== latestQueuePositionRef.current;

          setSearchLogs(() => {
            const nextLogs = [...update.logs];
            if (queuePositionChanged) {
              nextLogs.push(
                `[${new Date().toISOString()}] Queue position update: #${update.queuePosition}`,
              );
            }
            return nextLogs;
          });

          if (update.status === 'queued' && typeof update.queuePosition === 'number') {
            latestQueuePositionRef.current = update.queuePosition;
          } else if (update.status !== 'queued') {
            latestQueuePositionRef.current = null;
          }

          if (update.status === 'queued' && typeof update.queuePosition === 'number') {
            setActionNotice(`Search queued. Position in queue: ${update.queuePosition}.`);
          }
        },
      });
      setLeads(result.leads);
      setSearchMeta(result.meta ?? null);
      setActionNotice(null);
    } catch (error) {
      if (error instanceof Error) {
        if (error instanceof BackendApiError && error.code === 'FEATURE_NOT_IN_PLAN') {
          setSearchError(t('dashboard.errors.linkedinRequiresPro'));
          setActionNotice(t('dashboard.errors.upgradeForLinkedIn'));
          return;
        }

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
          setSearchError(toFriendlyErrorFromUnknown(error));
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
    setActiveJobUpdate((current) =>
      current
        ? {
            ...current,
            status: 'cancelled',
            queuePosition: null,
          }
        : null,
    );
    setActionNotice(null);
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
        setSearchError(toFriendlyErrorFromUnknown(error));
      } else {
        setSearchError('Failed to save search.');
      }
    } finally {
      setIsSavingSearch(false);
    }
  };

  const applySavedSearchById = (savedSearchId: string): SearchConfiguration | null => {
    setSelectedSavedSearchId(savedSearchId);

    if (!savedSearchId) {
      return null;
    }

    const savedSearch = savedSearches.find((item) => item.id === savedSearchId);
    if (!savedSearch) {
      return null;
    }

    const requestedSearchSource = savedSearch.config.searchSource ?? '';
    const normalizedSearchSource =
      requestedSearchSource === 'linkedin' && !canUseLinkedInSearch
        ? 'google_maps'
        : requestedSearchSource;

    if (requestedSearchSource === 'linkedin' && !canUseLinkedInSearch) {
      setActionNotice(t('dashboard.errors.upgradeForLinkedIn'));
    }

    const normalizedConfig: SearchConfiguration = {
      ...savedSearch.config,
      searchSource: normalizedSearchSource,
      businessType: savedSearch.config.businessType ?? '',
      problemCategoriesSelected:
        savedSearch.config.problemCategoriesSelected ?? savedSearch.config.problemFilters ?? [],
      problemFilters:
        savedSearch.config.problemCategoriesSelected ?? savedSearch.config.problemFilters ?? [],
      maxResults: savedSearch.config.maxResults ?? 20,
    };

    setSearchConfig(normalizedConfig);
    return normalizedConfig;
  };

  const selectSavedSearch = (savedSearchId: string) => {
    void applySavedSearchById(savedSearchId);
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
        setSearchError(toFriendlyErrorFromUnknown(error));
      } else {
        setSearchError('Failed to delete saved search.');
      }
    } finally {
      setDeletingSavedSearchId(null);
    }
  };

  const exportExcel = () => {
    const headers = raw<string[]>('dashboard.csv.headers');
    const rows = filteredLeads.map((lead) => [
      lead.businessName,
      lead.location,
      lead.category,
      lead.tier,
      String(toDisplayScore(lead.score, scoreDenominator)),
      lead.status,
      lead.contactChannels.join(' ; '),
    ]);
    exportRowsToExcel(headers, rows, t('dashboard.csv.fileName').replace('.csv', '.xlsx'));
  };

  const saveVisibleLeads = async () => {
    if (isSavingVisibleLeads) {
      return;
    }

    if (filteredLeads.length === 0) {
      setActionNotice(null);
      setSaveSuccessHint(null);
      setSearchError(t('dashboard.savedLeads.noLeadsToSave'));
      return;
    }

    setIsSavingVisibleLeads(true);
    try {
      const summary = await saveVisibleLeadsToBackend(filteredLeads);
      setSearchError(null);
      setActionNotice(null);
      setSaveSuccessHint(
        t('dashboard.leadTable.savedHintWithCount', {
          count: summary.insertedOrUpdated,
        }),
      );
    } catch (error) {
      setActionNotice(null);
      setSaveSuccessHint(null);
      if (error instanceof Error) {
        setSearchError(toFriendlyErrorFromUnknown(error));
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
      const savedLead = await saveLeadToBackend(lead);
      setLeads((current) =>
        current.map((item) =>
          item.id === leadId
            ? {
                ...item,
                savedLeadId: savedLead.savedLeadId,
                websiteAnalysis: savedLead.websiteAnalysis,
                websiteAnalysisCreatedAt: savedLead.websiteAnalysisCreatedAt,
                websiteAiSummary: savedLead.websiteAiSummary,
                websiteAiGeneratedAt: savedLead.websiteAiGeneratedAt,
                contactAiSuggestions: savedLead.contactAiSuggestions,
                contactAiGeneratedAt: savedLead.contactAiGeneratedAt,
              }
            : item,
        ),
      );
      setSearchError(null);
      setActionNotice(null);
      setSaveSuccessHint(t('dashboard.leadTable.savedHint'));
    } catch (error) {
      setActionNotice(null);
      setSaveSuccessHint(null);
      if (error instanceof Error) {
        setSearchError(toFriendlyErrorFromUnknown(error));
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

  const viewWebsiteAnalysis = (leadId: string) => {
    setWebsiteAnalysisModalLeadId(leadId);
  };

  const selectedWebsiteAnalysisLead = websiteAnalysisModalLeadId
    ? leads.find((lead) => lead.id === websiteAnalysisModalLeadId) ?? null
    : null;
  const canGenerateModalAiSummary = !!selectedWebsiteAnalysisLead?.savedLeadId && canUseAiEvaluations;

  const generateModalAiSummary = async () => {
    if (!selectedWebsiteAnalysisLead?.savedLeadId || !canUseAiEvaluations) {
      setActionNotice(t('dashboard.errors.upgradeForAi'));
      return;
    }

    const savedLeadId = selectedWebsiteAnalysisLead.savedLeadId;
    setWebsiteAiSummaryLoadingLeadId(selectedWebsiteAnalysisLead.id);
    try {
      const updated = await generateAiSummaryForSavedLead(savedLeadId);
      setLeads((current) =>
        current.map((item) =>
          item.savedLeadId === updated.savedLeadId
            ? {
                ...item,
                websiteAiSummary: updated.websiteAiSummary,
                websiteAiGeneratedAt: updated.websiteAiGeneratedAt,
                contactAiSuggestions: updated.contactAiSuggestions,
                contactAiGeneratedAt: updated.contactAiGeneratedAt,
                websiteAnalysis: updated.websiteAnalysis ?? item.websiteAnalysis,
                websiteAnalysisCreatedAt:
                  updated.websiteAnalysisCreatedAt ?? item.websiteAnalysisCreatedAt,
              }
            : item,
        ),
      );
      setSearchError(null);
      setActionNotice(t('dashboard.savedLeads.aiSummary.success'));
    } catch (error) {
      setActionNotice(null);
      if (error instanceof Error) {
        setSearchError(toFriendlyErrorFromUnknown(error));
      } else {
        setSearchError(t('dashboard.savedLeads.aiSummary.failed'));
      }
      throw error;
    } finally {
      setWebsiteAiSummaryLoadingLeadId(null);
    }
  };

  const getSearchLogLineClassName = (line: string): string => {
    const normalized = line.toLowerCase();

    if (normalized.includes('error') || normalized.includes('failed')) {
      return 'text-rose-300';
    }

    if (normalized.includes('completed') || normalized.includes('success')) {
      return 'text-emerald-300';
    }

    if (normalized.includes('queued') || normalized.includes('running')) {
      return 'text-amber-200';
    }

    if (normalized.includes('[scrape') || normalized.includes('[worker')) {
      return 'text-cyan-200';
    }

    return 'text-slate-200';
  };

  const handleSearchLogScroll = () => {
    const viewport = searchLogViewportRef.current;
    if (!viewport) {
      return;
    }

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    setIsSearchLogAutoFollowEnabled(distanceFromBottom <= 24);
  };

  return (
    <>
      <DashboardHeader
        onNavigateHome={onNavigateHome}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateBusinessProfile={onNavigateBusinessProfile}
        onNavigateSavedSearches={onNavigateSavedSearches}
        onNavigateBilling={onNavigateBilling}
        onNavigateAccountSettings={onNavigateAccountSettings}
        onLogout={onLogout}
      />

      <main
        className="relative mx-auto w-full max-w-7xl overflow-x-clip px-3 py-16 sm:px-6 sm:py-20"
        style={{ paddingBottom: 'calc(5rem + 20px)' }}
      >
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
            canUseLinkedInSearch={canUseLinkedInSearch}
            isGuideModalOpen={isFirstRunGuideOpen}
            onGuideModalOpenChange={setGuideModalOpen}
            onOpenGuide={() => setActionNotice(null)}
            onOpenProblemGuide={() => setActionNotice(null)}
            onNavigateBilling={onNavigateBilling}
            onSelectSavedSearch={selectSavedSearch}
            onDeleteSavedSearch={deleteSavedSearch}
            onUpdateSearchConfig={setSearchConfig}
            onSaveSearch={saveSearch}
            onRunSearch={runSearch}
            onCancelSearch={cancelSearch}
          />
        </section>

        {isSearchLogMounted ? (
          <section
            className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSearchLogVisible ? 'mt-8 max-h-[420px] opacity-100 translate-y-0 scale-100 blur-0' : 'mt-0 max-h-0 opacity-0 -translate-y-3 scale-[0.98] blur-[2px] pointer-events-none'}`}
            style={{ marginBottom: isSearchLogVisible ? '20px' : '0px' }}
            aria-hidden={!isSearchLogVisible}
          >
            <div
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
              style={{
                boxShadow:
                  '0 0 0 1px rgba(16, 185, 129, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 18px 36px rgba(2, 6, 23, 0.35)',
                background:
                  'linear-gradient(145deg, rgba(6, 78, 59, 0.3), rgba(7, 18, 24, 0.92) 46%, rgba(17, 24, 39, 0.95))',
              }}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-emerald-100">Search Log</h3>
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    borderColor:
                      activeJobUpdate?.status === 'failed'
                        ? 'rgba(248, 113, 113, 0.45)'
                        : activeJobUpdate?.status === 'completed'
                          ? 'rgba(52, 211, 153, 0.45)'
                          : 'rgba(96, 165, 250, 0.45)',
                    backgroundColor:
                      activeJobUpdate?.status === 'failed'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : activeJobUpdate?.status === 'completed'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(59, 130, 246, 0.12)',
                    color:
                      activeJobUpdate?.status === 'failed'
                        ? 'rgb(254, 202, 202)'
                        : activeJobUpdate?.status === 'completed'
                          ? 'rgb(167, 243, 208)'
                          : 'rgb(191, 219, 254)',
                  }}
                >
                  {activeJobUpdate?.status === 'queued'
                    ? `Queued${typeof activeJobUpdate.queuePosition === 'number' ? ` (#${activeJobUpdate.queuePosition})` : ''}`
                    : activeJobUpdate?.status === 'running'
                      ? 'Running'
                      : activeJobUpdate?.status === 'completed'
                        ? 'Completed'
                        : activeJobUpdate?.status === 'failed'
                          ? 'Failed'
                          : activeJobUpdate?.status === 'cancelled'
                            ? 'Cancelled'
                            : 'Idle'}
                </span>
              </div>

              <div
                ref={searchLogViewportRef}
                onScroll={handleSearchLogScroll}
                className="h-64 min-h-64 max-h-64 overflow-y-auto overflow-x-hidden rounded-xl border border-emerald-400/25 bg-[#050b0f] p-4 text-[11px] leading-relaxed touch-pan-y sm:text-xs"
                style={{
                  height: '16rem',
                  minHeight: '16rem',
                  maxHeight: '16rem',
                  overflowY: 'auto',
                  pointerEvents: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  fontFamily:
                    'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                }}
              >
                {searchLogs.length > 0 ? (
                  searchLogs.map((line, index) => (
                    <div
                      key={`${index}-${line.slice(0, 18)}`}
                      className={`mb-1 break-words ${getSearchLogLineClassName(line)}`}
                    >
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400">
                    {activeJobUpdate?.status === 'queued'
                      ? `You are almost there. Queue position: ${typeof activeJobUpdate.queuePosition === 'number' ? `#${activeJobUpdate.queuePosition}` : 'calculating...'}`
                      : activeJobUpdate?.status === 'running'
                        ? 'Scraper is starting up. Live logs will appear in a moment.'
                        : 'Preparing your search job...'}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-16">
          <LeadManagementTable
            leads={filteredLeads}
            scoreDenominator={scoreDenominator}
            isLoading={isRunningSearch}
            filters={filters}
            onTierFilterChange={updateTierFilter}
            onStatusFilterChange={updateStatusFilter}
            onLeadStatusChange={updateLeadStatus}
            onExportExcel={exportExcel}
            onSaveVisibleLeads={saveVisibleLeads}
            onSaveLead={saveLead}
            onViewWebsiteAnalysis={viewWebsiteAnalysis}
            isSavingVisibleLeads={isSavingVisibleLeads}
            savingLeadIds={savingLeadIds}
            saveSuccessHint={saveSuccessHint}
            onNavigateSavedSearches={onNavigateSavedSearches}
            searchQuery={dashboardSearchQuery}
            onSearchQueryChange={setDashboardSearchQuery}
            problemCategoryOptions={availableDashboardProblemCategories}
            selectedProblemCategories={dashboardProblemAny}
            onToggleProblemCategory={toggleDashboardProblemFilter}
            onClearProblemCategories={() => setDashboardProblemAny([])}
          />
        </section>
      </main>
      <WebsiteAnalysisModal
        open={!!selectedWebsiteAnalysisLead}
        onClose={() => setWebsiteAnalysisModalLeadId(null)}
        analysis={selectedWebsiteAnalysisLead?.websiteAnalysis ?? null}
        businessName={selectedWebsiteAnalysisLead?.businessName}
        aiSummary={selectedWebsiteAnalysisLead?.websiteAiSummary}
        aiSummaryLoading={
          !!selectedWebsiteAnalysisLead &&
          websiteAiSummaryLoadingLeadId === selectedWebsiteAnalysisLead.id
        }
        onGenerateAiSummary={canGenerateModalAiSummary ? generateModalAiSummary : undefined}
        aiSummaryLocked={!canUseAiEvaluations}
        onNavigateBilling={onNavigateBilling}
      />
      <AppAlertToast
        message={searchError}
        onClose={() => setSearchError(null)}
        variant="error"
      />
      <AppAlertToast
        message={actionNotice}
        onClose={() => setActionNotice(null)}
        variant="info"
      />
    </>
  );
}
