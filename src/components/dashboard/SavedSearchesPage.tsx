import { ChevronDown, Loader2, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import {
  deleteFilteredSavedLeadsFromBackend,
  removeWebsiteAnalysisForSavedLead,
  deleteSavedLeadFromBackend,
  fetchSavedLeadsFromBackend,
  generateAiContactSuggestionForSavedLead,
  generateAiSummaryForSavedLead,
  runWebsiteAnalysisForSavedLead,
  updateSavedLeadStatusInBackend,
} from './api';
import type { AiContactSuggestionChannel } from './api';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSelect } from './DashboardSelect';
import { exportRowsToExcel, exportRowsToPdf } from './exportUtils';
import { SavedLeadDetailModal } from './SavedLeadDetailModal';
import { STATUS_VISUALS, TIER_BADGE_STYLES } from './leadVisuals';
import { STATUS_OPTIONS } from './mockData';
import { TierOverviewCards } from './TierOverviewCards';
import { LeadStatus, LeadTier, SavedLead } from './types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface SavedSearchesPageProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateBusinessProfile: () => void;
  onNavigateSavedSearches: () => void;
  onNavigateBilling: () => void;
  onNavigateAccountSettings: () => void;
  onLogout: () => void;
}

const PAGE_SIZE = 25;

const formatSavedAt = (value: string): string => {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const SAVED_ACTION_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-semibold transition disabled:cursor-not-allowed';

export function SavedSearchesPage({
  onNavigateHome,
  onNavigateDashboard,
  onNavigateBusinessProfile,
  onNavigateSavedSearches,
  onNavigateBilling,
  onNavigateAccountSettings,
  onLogout,
}: SavedSearchesPageProps) {
  const { t, tm } = useI18n();
  const [savedLeads, setSavedLeads] = useState<SavedLead[]>([]);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'All'>('All');
  const [tierFilter, setTierFilter] = useState<LeadTier | 'All'>('All');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [tierCounts, setTierCounts] = useState<Record<LeadTier, number>>({
    'Tier 1': 0,
    'Tier 2': 0,
    'Tier 3': 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [statusUpdatingIds, setStatusUpdatingIds] = useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [websiteAnalysisLoadingIds, setWebsiteAnalysisLoadingIds] = useState<Record<string, boolean>>({});
  const [aiSummaryLoadingIds, setAiSummaryLoadingIds] = useState<Record<string, boolean>>({});
  const [aiContactLoadingByLead, setAiContactLoadingByLead] = useState<
    Record<string, Partial<Record<AiContactSuggestionChannel, boolean>>>
  >({});
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SavedLead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isWebsiteBlockedDialogOpen, setIsWebsiteBlockedDialogOpen] = useState(false);
  const [websiteBlockedDialogMessage, setWebsiteBlockedDialogMessage] = useState('');
  const [listSearchQuery, setListSearchQuery] = useState('');
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const canGoPrevious = offset > 0;
  const canGoNext = offset + savedLeads.length < total;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const scoreDenominator = useMemo(
    () => Math.max(1, savedLeads.reduce((currentMax, lead) => Math.max(currentMax, lead.score), 0)),
    [savedLeads],
  );
  const filteredSavedLeads = useMemo(() => {
    const normalizedQuery = listSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return savedLeads;
    }
    return savedLeads.filter((lead) => {
      const haystack = [
        lead.businessName,
        lead.category,
        lead.location,
        lead.source ?? '',
        lead.status,
        lead.explanation,
        lead.contactChannels.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [savedLeads, listSearchQuery]);

  const tierFilterLabel =
    tierFilter === 'All'
      ? null
      : `${tm('leadTierLabels', tierFilter)} (${tm('leadTiers', tierFilter)})`;

  const bulkDeleteScopeLabel =
    statusFilter === 'All' && tierFilter === 'All'
      ? t('dashboard.savedLeads.bulkDeleteScopeAll')
      : statusFilter !== 'All' && tierFilter === 'All'
        ? t('dashboard.savedLeads.bulkDeleteScopeStatus', {
            status: tm('leadStatuses', statusFilter),
          })
        : statusFilter === 'All' && tierFilter !== 'All'
          ? t('dashboard.savedLeads.bulkDeleteScopeTier', {
              tier: tierFilterLabel ?? '',
            })
          : t('dashboard.savedLeads.bulkDeleteScopeStatusTier', {
              status: tm('leadStatuses', statusFilter),
              tier: tierFilterLabel ?? '',
            });

  const bulkDeleteButtonLabel =
    statusFilter === 'All' && tierFilter === 'All'
      ? t('dashboard.savedLeads.bulkDeleteLabelAll')
      : statusFilter !== 'All' && tierFilter === 'All'
        ? t('dashboard.savedLeads.bulkDeleteLabelStatus', {
            status: tm('leadStatuses', statusFilter),
          })
        : statusFilter === 'All' && tierFilter !== 'All'
          ? t('dashboard.savedLeads.bulkDeleteLabelTier', {
              tier: tierFilterLabel ?? '',
            })
          : t('dashboard.savedLeads.bulkDeleteLabelStatusTier', {
              status: tm('leadStatuses', statusFilter),
              tier: tierFilterLabel ?? '',
            });

  const loadSavedLeads = async (
    nextOffset: number,
    nextStatus: LeadStatus | 'All',
    nextTier: LeadTier | 'All',
  ) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchSavedLeadsFromBackend({
        limit: PAGE_SIZE,
        offset: nextOffset,
        status: nextStatus,
        tier: nextTier,
      });

      setSavedLeads(response.items);
      setTotal(response.total);
      setTierCounts(response.tierCounts);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t('dashboard.savedLeads.loadError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSavedLeads(offset, statusFilter, tierFilter);
  }, [offset, statusFilter, tierFilter]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!exportMenuRef.current) {
        return;
      }

      if (!exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: t('common.all') },
      ...STATUS_OPTIONS.map((status) => ({
        value: status,
        label: tm('leadStatuses', status),
      })),
    ],
    [t, tm],
  );

  const closeLeadDetail = () => {
    setIsDetailOpen(false);
    setSelectedLead(null);
  };

  const mergeUpdatedLead = (updatedLead: SavedLead) => {
    setSavedLeads((current) =>
      current.map((item) => (item.savedLeadId === updatedLead.savedLeadId ? updatedLead : item)),
    );
    setSelectedLead((current) =>
      current && current.savedLeadId === updatedLead.savedLeadId ? updatedLead : current,
    );
  };

  const changeStatus = async (savedLead: SavedLead, status: LeadStatus) => {
    const savedLeadId = savedLead.savedLeadId;
    if (!savedLeadId || statusUpdatingIds[savedLeadId]) {
      return;
    }

    setStatusUpdatingIds((current) => ({ ...current, [savedLeadId]: true }));
    try {
      const updated = await updateSavedLeadStatusInBackend(savedLeadId, status);
      const shouldRemoveFromList = statusFilter !== 'All' && updated.status !== statusFilter;
      const wasLastRowOnPage = savedLeads.length === 1;

      setSavedLeads((current) => {
        if (shouldRemoveFromList) {
          return current.filter((item) => item.savedLeadId !== savedLeadId);
        }
        return current.map((item) => (item.savedLeadId === savedLeadId ? updated : item));
      });

      if (shouldRemoveFromList) {
        setTotal((current) => Math.max(0, current - 1));
        if (selectedLead?.savedLeadId === savedLeadId) {
          closeLeadDetail();
        }
        if (wasLastRowOnPage && offset > 0) {
          setOffset((current) => Math.max(0, current - PAGE_SIZE));
        }
      } else if (selectedLead?.savedLeadId === savedLeadId) {
        setSelectedLead(updated);
      }

      setNoticeMessage(t('dashboard.savedLeads.statusUpdated'));
      setErrorMessage(null);
    } catch (error) {
      setNoticeMessage(null);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t('dashboard.savedLeads.statusUpdateError'));
      }
    } finally {
      setStatusUpdatingIds((current) => {
        const next = { ...current };
        delete next[savedLeadId];
        return next;
      });
    }
  };

  const deleteSavedLead = async (savedLeadId: string) => {
    if (!savedLeadId || deletingIds[savedLeadId]) {
      return;
    }

    setDeletingIds((current) => ({ ...current, [savedLeadId]: true }));
    try {
      await deleteSavedLeadFromBackend(savedLeadId);
      const wasLastRowOnPage = savedLeads.length === 1;
      const removedLead = savedLeads.find((item) => item.savedLeadId === savedLeadId) ?? null;

      setSavedLeads((current) => current.filter((item) => item.savedLeadId !== savedLeadId));
      setTotal((current) => Math.max(0, current - 1));
      if (removedLead) {
        setTierCounts((current) => ({
          ...current,
          [removedLead.tier]: Math.max(0, current[removedLead.tier] - 1),
        }));
      }

      if (selectedLead?.savedLeadId === savedLeadId) {
        closeLeadDetail();
      }

      if (wasLastRowOnPage && offset > 0) {
        setOffset((current) => Math.max(0, current - PAGE_SIZE));
      }

      setNoticeMessage(t('dashboard.savedLeads.deletedSuccess'));
      setErrorMessage(null);
    } catch (error) {
      setNoticeMessage(null);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t('dashboard.savedLeads.deleteError'));
      }
    } finally {
      setDeletingIds((current) => {
        const next = { ...current };
        delete next[savedLeadId];
        return next;
      });
    }
  };

  const runWebsiteAnalysis = async (lead: SavedLead) => {
    const savedLeadId = lead.savedLeadId;
    if (!savedLeadId || websiteAnalysisLoadingIds[savedLeadId]) {
      return;
    }

    setWebsiteAnalysisLoadingIds((current) => ({ ...current, [savedLeadId]: true }));
    try {
      const updated = await runWebsiteAnalysisForSavedLead(savedLeadId);
      setSavedLeads((current) =>
        current.map((item) => (item.savedLeadId === savedLeadId ? updated : item)),
      );
      if (selectedLead?.savedLeadId === savedLeadId) {
        setSelectedLead(updated);
      }
      setNoticeMessage(t('dashboard.websiteAnalysis.completed'));
      setErrorMessage(null);
    } catch (error) {
      setNoticeMessage(null);
      if (error instanceof Error) {
        const blockedPattern =
          /blocked|forbidden|did not allow|didn't allow|access denied|captcha|challenge|security/i;
        if (blockedPattern.test(error.message)) {
          setWebsiteBlockedDialogMessage(
            "Sorry, I couldn't reach this website. Its security was too strong and it didn't allow me in.",
          );
          setIsWebsiteBlockedDialogOpen(true);
        }
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t('dashboard.websiteAnalysis.failed'));
      }
    } finally {
      setWebsiteAnalysisLoadingIds((current) => {
        const next = { ...current };
        delete next[savedLeadId];
        return next;
      });
    }
  };

  const removeWebsiteAnalysis = async (lead: SavedLead) => {
    const savedLeadId = lead.savedLeadId;
    if (!savedLeadId || websiteAnalysisLoadingIds[savedLeadId]) {
      return;
    }

    setWebsiteAnalysisLoadingIds((current) => ({ ...current, [savedLeadId]: true }));
    try {
      const updated = await removeWebsiteAnalysisForSavedLead(savedLeadId);
      setSavedLeads((current) =>
        current.map((item) => (item.savedLeadId === savedLeadId ? updated : item)),
      );
      if (selectedLead?.savedLeadId === savedLeadId) {
        setSelectedLead(updated);
      }
      setNoticeMessage(t('dashboard.websiteAnalysis.removed'));
      setErrorMessage(null);
    } catch (error) {
      setNoticeMessage(null);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t('dashboard.websiteAnalysis.removeFailed'));
      }
    } finally {
      setWebsiteAnalysisLoadingIds((current) => {
        const next = { ...current };
        delete next[savedLeadId];
        return next;
      });
    }
  };

  const generateAiSummary = async (lead: SavedLead) => {
    const savedLeadId = lead.savedLeadId;
    if (!savedLeadId || aiSummaryLoadingIds[savedLeadId]) {
      return;
    }

    setAiSummaryLoadingIds((current) => ({ ...current, [savedLeadId]: true }));
    try {
      const updated = await generateAiSummaryForSavedLead(savedLeadId);
      mergeUpdatedLead(updated);
      setNoticeMessage(t('dashboard.savedLeads.aiSummary.success'));
      setErrorMessage(null);
    } catch (error) {
      setNoticeMessage(null);
      const message =
        error instanceof Error ? error.message : t('dashboard.savedLeads.aiSummary.failed');
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setAiSummaryLoadingIds((current) => {
        const next = { ...current };
        delete next[savedLeadId];
        return next;
      });
    }
  };

  const generateAiContactSuggestion = async (
    lead: SavedLead,
    channel: AiContactSuggestionChannel,
  ) => {
    const savedLeadId = lead.savedLeadId;
    if (!savedLeadId || aiContactLoadingByLead[savedLeadId]?.[channel]) {
      return;
    }

    setAiContactLoadingByLead((current) => ({
      ...current,
      [savedLeadId]: {
        ...(current[savedLeadId] ?? {}),
        [channel]: true,
      },
    }));

    try {
      const updated = await generateAiContactSuggestionForSavedLead(savedLeadId, channel);
      mergeUpdatedLead(updated);
      setNoticeMessage(t('dashboard.savedLeads.aiContact.success'));
      setErrorMessage(null);
    } catch (error) {
      setNoticeMessage(null);
      const message =
        error instanceof Error ? error.message : t('dashboard.savedLeads.aiContact.failed');
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setAiContactLoadingByLead((current) => {
        const existing = current[savedLeadId];
        if (!existing) {
          return current;
        }
        const nextForLead = { ...existing };
        delete nextForLead[channel];
        const next = { ...current };
        if (Object.keys(nextForLead).length === 0) {
          delete next[savedLeadId];
        } else {
          next[savedLeadId] = nextForLead;
        }
        return next;
      });
    }
  };

  const deleteFilteredLeads = async () => {
    if (isBulkDeleting || total === 0) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const response = await deleteFilteredSavedLeadsFromBackend({
        status: statusFilter,
        tier: tierFilter,
      });
      const nextOffset = 0;
      setOffset(nextOffset);
      await loadSavedLeads(nextOffset, statusFilter, tierFilter);
      if (selectedLead) {
        closeLeadDetail();
      }
      setNoticeMessage(
        t('dashboard.savedLeads.bulkDeleteSuccess', {
          deleted: response.deleted,
          scope: bulkDeleteScopeLabel,
        }),
      );
      setErrorMessage(null);
    } catch (error) {
      setNoticeMessage(null);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t('dashboard.savedLeads.bulkDeleteError'));
      }
    } finally {
      setIsBulkDeleting(false);
      setIsBulkDeleteConfirmOpen(false);
    }
  };

  const exportSavedLeadsExcel = () => {
    if (savedLeads.length === 0) {
      return;
    }

    const headers = [
      t('dashboard.savedLeads.columns.business'),
      t('dashboard.savedLeads.columns.category'),
      t('dashboard.savedLeads.columns.location'),
      t('dashboard.savedLeads.columns.source'),
      t('dashboard.savedLeads.columns.tier'),
      t('dashboard.savedLeads.columns.score'),
      t('dashboard.savedLeads.columns.status'),
      t('dashboard.savedLeads.columns.contactChannels'),
      t('dashboard.savedLeads.columns.savedAt'),
    ];

    const rows = savedLeads.map((lead) => [
      lead.businessName,
      lead.category,
      lead.location,
      lead.source || t('dashboard.leadTable.defaultSource'),
      `${tm('leadTierLabels', lead.tier)} (${tm('leadTiers', lead.tier)})`,
      String(lead.score),
      tm('leadStatuses', lead.status),
      lead.contactChannels.join(' ; '),
      formatSavedAt(lead.savedAt),
    ]);

    exportRowsToExcel(headers, rows, 'saved-leads-current-view.xlsx');
  };

  const exportSavedLeadsPdf = () => {
    if (savedLeads.length === 0) {
      return;
    }

    const headers = [
      t('dashboard.savedLeads.columns.business'),
      t('dashboard.savedLeads.columns.category'),
      t('dashboard.savedLeads.columns.location'),
      t('dashboard.savedLeads.columns.source'),
      t('dashboard.savedLeads.columns.tier'),
      t('dashboard.savedLeads.columns.score'),
      t('dashboard.savedLeads.columns.status'),
      t('dashboard.savedLeads.columns.contactChannels'),
      t('dashboard.savedLeads.columns.savedAt'),
    ];

    const rows = savedLeads.map((lead) => [
      lead.businessName,
      lead.category,
      lead.location,
      lead.source || t('dashboard.leadTable.defaultSource'),
      `${tm('leadTierLabels', lead.tier)} (${tm('leadTiers', lead.tier)})`,
      String(lead.score),
      tm('leadStatuses', lead.status),
      lead.contactChannels.join(' ; '),
      formatSavedAt(lead.savedAt),
    ]);

    exportRowsToPdf(t('dashboard.savedLeads.title'), headers, rows);
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

      <main className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="space-y-8">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="space-y-3">
                <h1 className="text-4xl font-bold">{t('dashboard.savedLeads.title')}</h1>
                <p className="text-sm text-gray-400">{t('dashboard.savedLeads.subtitle')}</p>
              </div>

              <div className="flex w-full flex-wrap items-end justify-end gap-3 lg:w-auto">
                <div className="w-full max-w-[240px] space-y-3">
                  <label
                    htmlFor="saved-lead-status-filter"
                    className="block text-xs uppercase tracking-wider text-gray-500"
                  >
                    {t('dashboard.savedLeads.statusFilterLabel')}
                  </label>
                  <DashboardSelect
                    id="saved-lead-status-filter"
                    value={statusFilter}
                    onValueChange={(value) => {
                      setOffset(0);
                      setStatusFilter(value as LeadStatus | 'All');
                    }}
                    options={statusOptions}
                    triggerClassName="rounded-lg py-2 text-sm"
                  />
                </div>

                <div ref={exportMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsExportMenuOpen((current) => !current)}
                    aria-expanded={isExportMenuOpen}
                    disabled={isLoading || total === 0}
                    className={SAVED_ACTION_BUTTON_CLASS}
                    style={{
                      border: '1px solid rgba(96, 165, 250, 0.48)',
                      backgroundColor: 'rgba(37, 99, 235, 0.16)',
                      color: 'rgb(219, 234, 254)',
                      boxShadow: '0 10px 24px rgba(37, 99, 235, 0.16)',
                      lineHeight: 1.2,
                      opacity: isLoading || total === 0 ? 0.55 : 1,
                    }}
                    onMouseEnter={(event) => {
                      if (isLoading || total === 0) {
                        return;
                      }
                      event.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.26)';
                      event.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.7)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.16)';
                      event.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.48)';
                    }}
                  >
                    {t('dashboard.leadTable.export')}
                    <ChevronDown
                      className="h-4 w-4 transition-transform duration-200"
                      style={{ transform: isExportMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>

                  {isExportMenuOpen ? (
                    <div
                      className="absolute right-0 z-50 mt-3 overflow-hidden rounded-xl border border-white/10 shadow-2xl"
                      style={{
                        marginTop: '0.9rem',
                        width: '19rem',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        backgroundColor: 'rgba(25, 25, 28, 1)',
                        WebkitBackdropFilter: 'blur(26px)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          exportSavedLeadsExcel();
                          setIsExportMenuOpen(false);
                        }}
                        className="block w-full cursor-pointer whitespace-nowrap px-5 py-3 text-left text-sm text-gray-300 transition-all duration-150"
                        style={{
                          cursor: 'pointer',
                          backgroundColor: 'rgba(255, 255, 255, 0.025)',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
                        }}
                      >
                        {t('dashboard.leadTable.exportExcel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportSavedLeadsPdf();
                          setIsExportMenuOpen(false);
                        }}
                        className="block w-full cursor-pointer whitespace-nowrap px-5 py-3 text-left text-sm text-gray-300 transition-all duration-150"
                        style={{ cursor: 'pointer', backgroundColor: 'rgba(255, 255, 255, 0.025)' }}
                      >
                        {t('dashboard.leadTable.exportPdf')}
                      </button>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                  disabled={isLoading || isBulkDeleting || total === 0}
                  className={SAVED_ACTION_BUTTON_CLASS}
                  style={{
                    border: '1px solid rgba(248, 113, 113, 0.58)',
                    backgroundColor: 'rgba(239, 68, 68, 0.14)',
                    color: 'rgb(254, 226, 226)',
                    boxShadow: '0 10px 24px rgba(239, 68, 68, 0.18)',
                    lineHeight: 1.2,
                    opacity: isLoading || isBulkDeleting || total === 0 ? 0.55 : 1,
                  }}
                  onMouseEnter={(event) => {
                    if (isLoading || isBulkDeleting || total === 0) {
                      return;
                    }
                    event.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.24)';
                    event.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.72)';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.14)';
                    event.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.58)';
                  }}
                >
                  {isBulkDeleting ? (
                    <>
                      <Loader2 className="spin-loader h-3.5 w-3.5" />
                      {t('dashboard.savedLeads.bulkDeleting')}
                    </>
                  ) : (
                    <>{bulkDeleteButtonLabel}</>
                  )}
                </button>
              </div>
            </div>
          </section>

          <section style={{ marginTop: '20px' }}>
            <TierOverviewCards
              counts={tierCounts}
              totalLeads={tierCounts['Tier 1'] + tierCounts['Tier 2'] + tierCounts['Tier 3']}
              activeTier={tierFilter}
              onSelectTier={(nextTier) => {
                setOffset(0);
                setTierFilter(nextTier);
              }}
            />
          </section>

          <section
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
            style={{ marginBottom: '10px' }}
          >
            <label
              htmlFor="saved-lead-search"
              className="mb-2 block text-xs uppercase tracking-wider text-gray-500"
            >
              {t('dashboard.savedLeads.searchLabel')}
            </label>
            <div className="flex h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3">
              <Search className="h-4 w-4 shrink-0 text-gray-500" />
              <input
                id="saved-lead-search"
                value={listSearchQuery}
                onChange={(event) => setListSearchQuery(event.target.value)}
                placeholder={t('dashboard.savedLeads.searchPlaceholder')}
                className="h-full w-full bg-transparent pr-1 text-sm leading-5 text-white placeholder:text-gray-500 outline-none"
              />
            </div>
          </section>

          {errorMessage ? (
            <section style={{ marginTop: '10px', marginBottom: '10px' }}>
              <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            </section>
          ) : null}

          {noticeMessage ? (
            <section>
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {noticeMessage}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            {isLoading ? (
              <div className="flex items-center gap-3 py-10 text-sm text-gray-300">
                <Loader2 className="spin-loader h-5 w-5" />
                {t('dashboard.savedLeads.loading')}
              </div>
            ) : filteredSavedLeads.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                <p className="text-base text-gray-200">{t('dashboard.savedLeads.emptyTitle')}</p>
                <p className="mt-2 text-sm text-gray-400">{t('dashboard.savedLeads.emptySubtitle')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="border-b border-white/10 px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500">
                        {t('dashboard.savedLeads.columns.business')}
                      </th>
                      <th className="border-b border-white/10 px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500">
                        {t('dashboard.savedLeads.columns.category')}
                      </th>
                      <th className="border-b border-white/10 px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500">
                        {t('dashboard.savedLeads.columns.location')}
                      </th>
                      <th className="border-b border-white/10 px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500">
                        {t('dashboard.savedLeads.columns.source')}
                      </th>
                      <th className="border-b border-white/10 px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500">
                        {t('dashboard.savedLeads.columns.tier')}
                      </th>
                      <th className="border-b border-white/10 px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500">
                        {t('dashboard.savedLeads.columns.score')}
                      </th>
                      <th className="border-b border-white/10 px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500">
                        {t('dashboard.savedLeads.columns.status')}
                      </th>
                      <th className="border-b border-white/10 px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500">
                        {t('dashboard.savedLeads.columns.savedAt')}
                      </th>
                      <th className="border-b border-white/10 px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500">
                        {t('dashboard.savedLeads.columns.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSavedLeads.map((lead) => (
                      <tr
                        key={lead.savedLeadId}
                        className="group cursor-pointer align-top transition-colors hover:bg-white/[0.03]"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsDetailOpen(true);
                        }}
                      >
                        <td className="border-b border-white/5 px-3 py-4 text-sm text-gray-100">
                          {lead.businessName}
                        </td>
                        <td className="border-b border-white/5 px-3 py-4 text-sm text-gray-300">{lead.category}</td>
                        <td className="border-b border-white/5 px-3 py-4 text-sm text-gray-300">{lead.location}</td>
                        <td className="border-b border-white/5 px-3 py-4 text-sm text-gray-300">
                          {lead.source || t('dashboard.leadTable.defaultSource')}
                        </td>
                        <td className="border-b border-white/5 px-3 py-4 text-sm text-gray-300">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${TIER_BADGE_STYLES[lead.tier]}`}>
                            {tm('leadTierLabels', lead.tier)} ({tm('leadTiers', lead.tier)})
                          </span>
                        </td>
                        <td className="border-b border-white/5 px-3 py-4 text-sm text-gray-300">{lead.score}</td>
                        <td
                          className="border-b border-white/5 px-3 py-4 text-sm text-gray-300"
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <DashboardSelect
                            value={lead.status}
                            onValueChange={(value) => changeStatus(lead, value as LeadStatus)}
                            options={STATUS_OPTIONS.map((status) => ({
                              value: status,
                              label: tm('leadStatuses', status),
                            }))}
                            size="compact"
                            triggerClassName="min-w-[132px]"
                            contentClassName="min-w-[164px]"
                            triggerStyleOverride={STATUS_VISUALS[lead.status].triggerStyle}
                            getOptionClassName={(status) =>
                              STATUS_VISUALS[status as LeadStatus]?.optionClassName ?? ''
                            }
                          />
                          {statusUpdatingIds[lead.savedLeadId] ? (
                            <div className="mt-1 text-xs text-gray-500">{t('dashboard.savedLeads.updatingStatus')}</div>
                          ) : null}
                        </td>
                        <td className="border-b border-white/5 px-3 py-4 text-sm text-gray-300">
                          {formatSavedAt(lead.savedAt)}
                        </td>
                        <td
                          className="border-b border-white/5 px-3 py-4 text-sm text-gray-300"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => deleteSavedLead(lead.savedLeadId)}
                            disabled={!!deletingIds[lead.savedLeadId]}
                            aria-label="Remove lead"
                            title="Remove lead"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed"
                            style={{
                              border: '1px solid rgba(248, 113, 113, 0.55)',
                              backgroundColor: 'rgba(239, 68, 68, 0.13)',
                              color: 'rgb(254, 226, 226)',
                              opacity: deletingIds[lead.savedLeadId] ? 0.6 : 1,
                            }}
                            onMouseEnter={(event) => {
                              if (deletingIds[lead.savedLeadId]) {
                                return;
                              }
                              event.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.24)';
                              event.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.7)';
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.13)';
                              event.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.55)';
                            }}
                          >
                            {deletingIds[lead.savedLeadId] ? (
                              <Loader2 className="spin-loader h-3.5 w-3.5" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm text-gray-400">
                {t('dashboard.savedLeads.paginationSummary', {
                  total,
                  page: currentPage,
                  totalPages,
                })}
              </p>
              {listSearchQuery.trim() ? (
                <p className="text-xs text-gray-500">
                  {t('dashboard.savedLeads.searchMatchesOnPage', {
                    count: filteredSavedLeads.length,
                  })}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
                disabled={!canGoPrevious || isLoading}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 transition-colors enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('dashboard.savedLeads.previousPage')}
              </button>
              <button
                type="button"
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
                disabled={!canGoNext || isLoading}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 transition-colors enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('dashboard.savedLeads.nextPage')}
              </button>
            </div>
          </section>
        </div>
      </main>

      <SavedLeadDetailModal
        lead={selectedLead}
        open={isDetailOpen}
        scoreDenominator={scoreDenominator}
        statusUpdating={!!(selectedLead && statusUpdatingIds[selectedLead.savedLeadId])}
        deleting={!!(selectedLead && deletingIds[selectedLead.savedLeadId])}
        websiteAnalysisLoading={!!(selectedLead && websiteAnalysisLoadingIds[selectedLead.savedLeadId])}
        aiSummaryLoading={!!(selectedLead && aiSummaryLoadingIds[selectedLead.savedLeadId])}
        aiContactSuggestionLoadingByChannel={
          selectedLead ? aiContactLoadingByLead[selectedLead.savedLeadId] : undefined
        }
        onClose={closeLeadDetail}
        onStatusChange={changeStatus}
        onDelete={deleteSavedLead}
        onRunWebsiteAnalysis={runWebsiteAnalysis}
        onRemoveWebsiteAnalysis={removeWebsiteAnalysis}
        onGenerateAiSummary={generateAiSummary}
        onGenerateAiContactSuggestion={generateAiContactSuggestion}
        onNavigateBilling={onNavigateBilling}
      />

      <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <AlertDialogContent className="border border-red-400/35 bg-[#151219] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.savedLeads.bulkDeleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              {t('dashboard.savedLeads.bulkDeleteConfirmDescription', {
                count: total,
                scope: bulkDeleteScopeLabel,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter
            className="!flex !flex-row !items-center !justify-center gap-3"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              width: '100%',
              marginTop: '0.25rem',
            }}
          >
            <AlertDialogCancel
              className="min-w-[140px]"
              style={{
                minWidth: '140px',
                borderRadius: '0.65rem',
                border: '1px solid rgba(148, 163, 184, 0.42)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'rgb(226, 232, 240)',
                padding: '0.55rem 1rem',
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              {t('dashboard.savedLeads.bulkDeleteCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteFilteredLeads}
              className="inline-flex min-w-[170px] items-center justify-center gap-2"
              style={{
                minWidth: '170px',
                borderRadius: '0.65rem',
                border: '1px solid rgba(248, 113, 113, 0.62)',
                backgroundColor: 'rgba(239, 68, 68, 0.22)',
                color: 'rgb(254, 226, 226)',
                padding: '0.55rem 1rem',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="spin-loader h-4 w-4" />
                  {t('dashboard.savedLeads.bulkDeleting')}
                </>
              ) : (
                t('dashboard.savedLeads.bulkDeleteConfirmAction')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isWebsiteBlockedDialogOpen} onOpenChange={setIsWebsiteBlockedDialogOpen}>
        <DialogContent
          hideCloseButton
          overlayStyle={{
            zIndex: 500,
            backgroundColor: 'rgba(2, 6, 23, 0.72)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          style={{
            zIndex: 510,
            width: 'min(420px, calc(100% - 2rem))',
            maxHeight: '260px',
            borderRadius: '1rem',
            border: 'none',
            padding: '0.75rem',
            background: 'rgba(3, 8, 23, 0.94)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          className="overflow-hidden text-white sm:max-w-[420px]"
        >
          <button
            type="button"
            onClick={() => setIsWebsiteBlockedDialogOpen(false)}
            aria-label="Close blocked modal"
            className="absolute text-cyan-100/90 transition-colors hover:text-cyan-50"
            style={{ right: '10px', top: '10px', marginRight: '10px', marginTop: '10px' }}
          >
            <X
              className="h-6 w-6 transition-transform duration-300 ease-out"
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = 'rotate(90deg) scale(1.08)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = 'rotate(0deg) scale(1)';
              }}
            />
          </button>
          <div className="mx-auto flex w-full flex-col items-center justify-center gap-2 text-center">
            <DialogHeader className="space-y-4 text-center">
              <DialogTitle className="pr-8 text-xl font-semibold text-cyan-100">
                Oops. Website blocked me.
              </DialogTitle>
              <p className="text-sm text-slate-300">{websiteBlockedDialogMessage}</p>
            </DialogHeader>

            <img
              src="/images/website-blocked-neon-face.png"
              alt="Sad neon face"
              className="rounded-2xl"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
