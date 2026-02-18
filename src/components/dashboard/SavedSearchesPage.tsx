import { Loader2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import {
  deleteFilteredSavedLeadsFromBackend,
  deleteSavedLeadFromBackend,
  fetchSavedLeadsFromBackend,
  updateSavedLeadStatusInBackend,
} from './api';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSelect } from './DashboardSelect';
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

interface SavedSearchesPageProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateBusinessProfile: () => void;
  onNavigateSavedSearches: () => void;
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

export function SavedSearchesPage({
  onNavigateHome,
  onNavigateDashboard,
  onNavigateBusinessProfile,
  onNavigateSavedSearches,
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
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SavedLead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const canGoPrevious = offset > 0;
  const canGoNext = offset + savedLeads.length < total;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const scoreDenominator = useMemo(
    () => Math.max(1, savedLeads.reduce((currentMax, lead) => Math.max(currentMax, lead.score), 0)),
    [savedLeads],
  );

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

  return (
    <>
      <DashboardHeader
        onNavigateHome={onNavigateHome}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateBusinessProfile={onNavigateBusinessProfile}
        onNavigateSavedSearches={onNavigateSavedSearches}
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

                <button
                  type="button"
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                  disabled={isLoading || isBulkDeleting || total === 0}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-xs font-semibold transition disabled:cursor-not-allowed"
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

          <section>
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

          {errorMessage ? (
            <section>
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
            ) : savedLeads.length === 0 ? (
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
                    {savedLeads.map((lead) => (
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
            <p className="text-sm text-gray-400">
              {t('dashboard.savedLeads.paginationSummary', {
                total,
                page: currentPage,
                totalPages,
              })}
            </p>

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
        onClose={closeLeadDetail}
        onStatusChange={changeStatus}
        onDelete={deleteSavedLead}
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
    </>
  );
}
