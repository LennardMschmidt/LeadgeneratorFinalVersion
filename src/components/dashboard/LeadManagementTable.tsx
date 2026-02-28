import {
  ChevronDown,
  Globe,
  Link as LinkIcon,
  Linkedin,
  Loader2,
  Mail,
  MapPinned,
  Phone,
  Search,
  Star,
} from 'lucide-react';
import {
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useI18n } from '../../i18n';
import { DashboardSelect } from './DashboardSelect';
import { STATUS_VISUALS, TIER_BADGE_STYLES } from './leadVisuals';
import { STATUS_OPTIONS, TIER_OPTIONS } from './mockData';
import { Lead, LeadFilters, LeadStatus } from './types';

interface LeadManagementTableProps {
  leads: Lead[];
  scoreDenominator: number;
  isLoading?: boolean;
  filters: LeadFilters;
  onTierFilterChange: (tier: LeadFilters['tier']) => void;
  onStatusFilterChange: (status: LeadFilters['status']) => void;
  onLeadStatusChange: (leadId: string, status: LeadStatus) => void;
  onExportExcel: () => void;
  onSaveVisibleLeads: () => void;
  onSaveLead: (leadId: string) => void;
  onViewWebsiteAnalysis: (leadId: string) => void;
  isSavingVisibleLeads?: boolean;
  savingLeadIds?: Record<string, boolean>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  problemCategoryOptions: string[];
  selectedProblemCategories: string[];
  onToggleProblemCategory: (problem: string) => void;
  onClearProblemCategories: () => void;
}

const CONTACT_BUTTON_CLASS =
  'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-sm text-slate-200 transition-colors hover:text-white sm:min-w-[210px] sm:flex-1';

const CONTACT_VALUE_CLASS = 'mt-0.5 block text-xs text-slate-400 truncate';

interface ParsedContactChannel {
  type: string;
  value: string;
}

const parseContactChannel = (channel: string): ParsedContactChannel => {
  const separatorIndex = channel.indexOf(':');

  if (separatorIndex === -1) {
    return {
      type: channel.trim().toLowerCase(),
      value: '',
    };
  }

  return {
    type: channel.slice(0, separatorIndex).trim().toLowerCase(),
    value: channel.slice(separatorIndex + 1).trim(),
  };
};

const ensureUrlProtocol = (value: string): string => {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
};

const truncateDisplayValue = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
};

const truncateMapsDisplayValue = (value: string): string => {
  const lower = value.toLowerCase();
  const marker = 'google.com';
  const idx = lower.indexOf(marker);
  if (idx === -1) {
    return truncateDisplayValue(value, 42);
  }
  return `${value.slice(0, idx + marker.length)}...`;
};

const toDisplayScore = (score: number, maxScore: number): number => {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
    return 0;
  }
  const normalized = Math.max(0, Math.min(100, (score / maxScore) * 100));
  return Math.round(normalized);
};

const LOADER_KEYFRAMES = `
  @keyframes leadLoaderSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes leadLoadingBar {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes leadCardFlash {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 1; }
  }
`;

export function LeadManagementTable({
  leads,
  scoreDenominator,
  isLoading = false,
  filters,
  onTierFilterChange,
  onStatusFilterChange,
  onLeadStatusChange,
  onExportExcel,
  onSaveVisibleLeads,
  onSaveLead,
  onViewWebsiteAnalysis,
  isSavingVisibleLeads = false,
  savingLeadIds = {},
  searchQuery,
  onSearchQueryChange,
  problemCategoryOptions,
  selectedProblemCategories,
  onToggleProblemCategory,
  onClearProblemCategories,
}: LeadManagementTableProps) {
  const { t, tm } = useI18n();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [leadExpandedStates, setLeadExpandedStates] = useState<Record<string, boolean>>({});
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const exportDropdownItemClass =
    'block w-full cursor-pointer whitespace-nowrap px-5 py-3 text-left text-sm text-gray-300 transition-all duration-150';

  const isLeadExpanded = (leadId: string) => leadExpandedStates[leadId] ?? true;
  const hasAnyExpandedLead = leads.some((lead) => isLeadExpanded(lead.id));
  const canExpandOrCollapse = !isLoading && leads.length > 0;
  const sortedProblemCategoryOptions = useMemo(
    () => [...problemCategoryOptions].sort((left, right) => left.localeCompare(right)),
    [problemCategoryOptions],
  );

  const contactMeta = (
    channel: ParsedContactChannel,
  ): { label: string; href?: string; icon: ComponentType<{ className?: string }> } => {
    if (channel.type === 'email') {
      return { label: t('leadCard.email'), href: `mailto:${channel.value}`, icon: Mail };
    }

    if (channel.type === 'phone') {
      return {
        label: t('leadCard.phone'),
        href: `tel:${channel.value.replace(/\s+/g, '')}`,
        icon: Phone,
      };
    }

    if (channel.type === 'website') {
      return {
        label: t('leadCard.website'),
        href: ensureUrlProtocol(channel.value),
        icon: Globe,
      };
    }

    if (channel.type === 'maps') {
      return { label: 'Maps', href: ensureUrlProtocol(channel.value), icon: MapPinned };
    }

    if (channel.type === 'linkedin') {
      return { label: 'LinkedIn', href: ensureUrlProtocol(channel.value), icon: Linkedin };
    }

    return {
      label: channel.type ? channel.type[0].toUpperCase() + channel.type.slice(1) : t('dashboard.leadTable.contactFallback'),
      href: channel.value ? ensureUrlProtocol(channel.value) : undefined,
      icon: LinkIcon,
    };
  };

  const toggleAllLeads = () => {
    if (!canExpandOrCollapse) {
      return;
    }

    const expandAll = !hasAnyExpandedLead;
    setLeadExpandedStates((currentState) => {
      const nextState = { ...currentState };
      leads.forEach((lead) => {
        nextState[lead.id] = expandAll;
      });
      return nextState;
    });
  };

  const toggleLead = (leadId: string) => {
    setLeadExpandedStates((currentState) => ({
      ...currentState,
      [leadId]: !(currentState[leadId] ?? true),
    }));
  };

  const handleLeadCardClick = (leadId: string, event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-no-toggle="true"]')) {
      return;
    }
    toggleLead(leadId);
  };

  const handleExportItemMouseEnter = (event: ReactMouseEvent<HTMLElement>) => {
    event.currentTarget.style.transform = 'scale(1.02)';
    event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
  };

  const handleExportItemMouseLeave = (event: ReactMouseEvent<HTMLElement>) => {
    event.currentTarget.style.transform = 'scale(1)';
    event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.025)';
  };

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

  return (
    <section
      className="rounded-2xl border p-6 space-y-6"
      style={{
        borderColor: 'rgba(125, 211, 252, 0.22)',
        background:
          'linear-gradient(145deg, rgba(15, 23, 42, 0.88), rgba(30, 41, 59, 0.72) 44%, rgba(14, 116, 144, 0.14))',
        boxShadow: '0 16px 36px rgba(2, 6, 23, 0.28)',
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div>
            <label htmlFor="filter-tier" className="mb-2 block text-xs uppercase tracking-wider text-sky-200/70">
              {t('dashboard.leadTable.filterByTier')}
            </label>
            <DashboardSelect
              id="filter-tier"
              value={filters.tier}
              onValueChange={(value) => onTierFilterChange(value as LeadFilters['tier'])}
              options={TIER_OPTIONS.map((tier) => ({
                value: tier,
                label: tier === 'All' ? t('common.all') : tm('leadTiers', tier),
              }))}
              triggerClassName="rounded-lg py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="filter-status" className="mb-2 block text-xs uppercase tracking-wider text-violet-200/70">
              {t('dashboard.leadTable.filterByStatus')}
            </label>
            <DashboardSelect
              id="filter-status"
              value={filters.status}
              onValueChange={(value) => onStatusFilterChange(value as LeadFilters['status'])}
              options={[
                { value: 'All', label: t('common.all') },
                ...STATUS_OPTIONS.map((status) => ({
                  value: status,
                  label: tm('leadStatuses', status),
                })),
              ]}
              triggerClassName="rounded-lg py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 lg:justify-end">
          <p className="text-sm text-slate-300">
            {isLoading
              ? t('dashboard.leadTable.searchingLeads')
              : t('dashboard.leadTable.visibleLeads', { count: leads.length })}
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleAllLeads}
              disabled={!canExpandOrCollapse}
              className="flex items-center rounded-lg border border-sky-300/35 bg-sky-500/[0.12] px-4 py-2 text-sm text-sky-100 transition-colors enabled:hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {hasAnyExpandedLead ? t('dashboard.leadTable.collapseAll') : t('dashboard.leadTable.expandAll')}
            </button>

            <div className="flex flex-col items-start">
              <button
                type="button"
                onClick={onSaveVisibleLeads}
                disabled={isLoading || isSavingVisibleLeads || leads.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all enabled:hover:from-blue-600 enabled:hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingVisibleLeads ? (
                  <>
                    <Loader2 className="spin-loader h-4 w-4" />
                    {t('dashboard.leadTable.savingLeads')}
                  </>
                ) : (
                  t('dashboard.leadTable.saveLeads')
                )}
              </button>
            </div>

            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((current) => !current)}
                aria-expanded={isExportMenuOpen}
                className="inline-flex items-center gap-2 rounded-lg border px-5 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#e5e7eb',
                }}
              >
                {t('dashboard.leadTable.export')}
                <ChevronDown
                  className="h-4 w-4 transition-transform duration-200"
                  style={{ color: '#9ca3af', transform: isExportMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {isExportMenuOpen ? (
                <div
                  className="absolute right-0 z-50 mt-3 overflow-hidden rounded-xl border border-white/10 shadow-2xl"
                  style={{
                    marginTop: '0.9rem',
                    width: 'min(19rem, calc(100vw - 1rem))',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(25, 25, 28, 1)',
                    WebkitBackdropFilter: 'blur(26px)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onExportExcel();
                      setIsExportMenuOpen(false);
                    }}
                    onMouseEnter={handleExportItemMouseEnter}
                    onMouseLeave={handleExportItemMouseLeave}
                    className={exportDropdownItemClass}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255, 255, 255, 0.025)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
                    }}
                  >
                    {t('dashboard.leadTable.exportExcel')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <section
          className="rounded-xl border p-4"
          style={{
            borderColor: 'rgba(56, 189, 248, 0.24)',
            background: 'linear-gradient(135deg, rgba(8, 47, 73, 0.32), rgba(15, 23, 42, 0.56))',
          }}
        >
          <label
            htmlFor="dashboard-lead-search"
            className="mb-2 block text-xs uppercase tracking-wider text-sky-100/70"
          >
            {t('dashboard.leadTable.searchLabel')}
          </label>
          <div className="flex h-11 items-center gap-2 rounded-lg border border-sky-300/20 bg-slate-900/50 px-3">
            <Search className="h-4 w-4 shrink-0 text-sky-200/70" />
            <input
              id="dashboard-lead-search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder={t('dashboard.leadTable.searchPlaceholder')}
              className="h-full w-full bg-transparent pr-1 text-sm leading-5 text-white placeholder:text-slate-500 outline-none"
            />
          </div>
        </section>

        <section
          className="rounded-xl border p-4"
          style={{
            borderColor: 'rgba(168, 85, 247, 0.24)',
            background: 'linear-gradient(135deg, rgba(49, 46, 129, 0.2), rgba(15, 23, 42, 0.58))',
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wider text-violet-100/75">
              {t('dashboard.leadTable.problemFilterLabel')}
            </p>
            {selectedProblemCategories.length > 0 ? (
              <button
                type="button"
                onClick={onClearProblemCategories}
                className="text-xs text-cyan-300 underline decoration-cyan-300/70 underline-offset-2 transition-colors hover:text-cyan-200"
              >
                {t('dashboard.leadTable.problemFilterClear')}
              </button>
            ) : null}
          </div>

          {sortedProblemCategoryOptions.length === 0 ? (
            <p className="text-xs text-slate-400">{t('dashboard.leadTable.problemFilterEmpty')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sortedProblemCategoryOptions.map((problem) => {
                const isSelected = selectedProblemCategories.includes(problem);
                return (
                  <button
                    key={problem}
                    type="button"
                    onClick={() => onToggleProblemCategory(problem)}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-all"
                    style={{
                      borderColor: isSelected
                        ? 'rgba(34, 211, 238, 0.68)'
                        : 'rgba(255, 255, 255, 0.18)',
                      backgroundColor: isSelected
                        ? 'rgba(34, 211, 238, 0.16)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected
                        ? 'rgba(165, 243, 252, 0.96)'
                        : 'rgba(209, 213, 219, 1)',
                    }}
                  >
                    {tm('problemCategories', problem)}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-6 space-y-5">
            <style>{LOADER_KEYFRAMES}</style>

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-blue-200">
                <Loader2
                  className="h-4 w-4"
                  style={{
                    animation: 'leadLoaderSpin 900ms linear infinite',
                    transformOrigin: 'center',
                  }}
                />
                {t('dashboard.leadTable.runningSearchLoader')}
              </p>
              <br />
            </div>

            <div className="space-y-3">
              {[0, 1].map((placeholderIndex) => (
                <div
                  key={`lead-loading-${placeholderIndex}`}
                  className="rounded-xl p-4"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    backgroundColor: 'rgba(148, 163, 184, 0.18)',
                    animation: 'leadCardFlash 1.8s ease-in-out infinite',
                    animationDelay: `${placeholderIndex * 220}ms`,
                  }}
                >
                  <div
                    className="h-4 w-1/3 rounded"
                    style={{ backgroundColor: 'rgba(226, 232, 240, 0.55)' }}
                  />
                  <div
                    className="mt-3 h-3 w-2/3 rounded"
                    style={{ backgroundColor: 'rgba(226, 232, 240, 0.35)' }}
                  />
                  <div className="mt-4 flex gap-2">
                    <div
                      className="h-6 w-28 rounded-full"
                      style={{ backgroundColor: 'rgba(226, 232, 240, 0.3)' }}
                    />
                    <div
                      className="h-6 w-24 rounded-full"
                      style={{ backgroundColor: 'rgba(226, 232, 240, 0.3)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-2xl border border-slate-300/20 bg-slate-900/45 p-8 text-center">
            <p className="text-base text-slate-100">{t('dashboard.leadTable.noLeadsTitle')}</p>
            <p className="mt-2 text-sm text-slate-300">{t('dashboard.leadTable.noLeadsSubtitle')}</p>
          </div>
        ) : (
          leads.map((lead) => {
            const isExpanded = isLeadExpanded(lead.id);

            return (
              <div
                key={lead.id}
                className="group rounded-2xl border-2 p-6 backdrop-blur-sm transition-all"
                style={{
                  borderColor: 'rgba(96, 165, 250, 0.82)',
                  background:
                    'linear-gradient(140deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8) 48%, rgba(12, 74, 110, 0.34))',
                  boxShadow:
                    '0 0 0 1px rgba(56, 189, 248, 0.36), 0 16px 32px rgba(2, 6, 23, 0.5)',
                }}
                onClick={(event) => handleLeadCardClick(lead.id, event)}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = 'rgba(147, 197, 253, 0.98)';
                  event.currentTarget.style.boxShadow =
                    '0 0 0 1px rgba(125, 211, 252, 0.5), 0 18px 36px rgba(2, 6, 23, 0.56)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.82)';
                  event.currentTarget.style.boxShadow =
                    '0 0 0 1px rgba(56, 189, 248, 0.36), 0 16px 32px rgba(2, 6, 23, 0.5)';
                }}
              >
                <div className={`flex flex-wrap items-start justify-between gap-3 ${isExpanded ? 'mb-4' : ''}`}>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{lead.businessName}</h3>
                    <p className="text-sm text-slate-300">
                      {lead.category} • {lead.location}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {t('dashboard.leadTable.source')}:{' '}
                      <span className="text-slate-300">
                        {lead.source ?? t('dashboard.leadTable.defaultSource')}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${TIER_BADGE_STYLES[lead.tier]}`}>
                      {tm('leadTierLabels', lead.tier)} ({tm('leadTiers', lead.tier)})
                    </span>
                    <button
                      type="button"
                      onClick={() => onSaveLead(lead.id)}
                      data-no-toggle="true"
                      disabled={!!savingLeadIds[lead.id]}
                      className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-500/24 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        borderColor: 'rgba(110, 231, 183, 0.75)',
                        background: 'rgba(16, 185, 129, 0.22)',
                        boxShadow: 'inset 0 0 0 1px rgba(6, 95, 70, 0.34)',
                      }}
                    >
                      {savingLeadIds[lead.id] ? (
                        <>
                          <Loader2 className="spin-loader h-3.5 w-3.5" />
                          <span>{t('dashboard.leadTable.savingLead')}</span>
                        </>
                      ) : (
                        <span>{t('dashboard.leadTable.saveLead')}</span>
                      )}
                    </button>
                    {lead.websiteUrl && lead.websiteAnalysis ? (
                        <button
                          type="button"
                          onClick={() => onViewWebsiteAnalysis(lead.id)}
                          data-no-toggle="true"
                          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 shadow-sm shadow-cyan-900/30 transition-colors hover:bg-cyan-500/25"
                        >
                          {t('dashboard.websiteAnalysis.view')}
                        </button>
                      ) : null}
                    <button
                      type="button"
                      onClick={() => toggleLead(lead.id)}
                      aria-expanded={isExpanded}
                      data-no-toggle="true"
                      className={`flex flex-row items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition-all ${
                        isExpanded
                          ? 'border-blue-300/80 bg-blue-500/24 text-blue-100 hover:bg-blue-500/30'
                          : 'border-slate-300/60 bg-slate-800/65 text-gray-200 hover:border-slate-200/85 hover:bg-slate-700/75'
                      }`}
                    >
                      <ChevronDown
                        className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      />
                      <span>{isExpanded ? t('dashboard.leadTable.collapse') : t('dashboard.leadTable.expand')}</span>
                    </button>
                  </div>
                </div>
                {isExpanded ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lead.problems.map((problem) => (
                        <span
                          key={`${lead.id}-${problem}`}
                          className="px-3 py-1 rounded-lg border text-xs font-medium text-red-100"
                          style={{
                            borderColor: 'rgba(248, 113, 113, 0.78)',
                            background: 'rgba(239, 68, 68, 0.22)',
                            boxShadow: '0 0 0 1px rgba(127, 29, 29, 0.28)',
                          }}
                        >
                          {tm('problemCategories', problem)}
                        </span>
                      ))}
                    </div>

                    <div
                      className="mb-4 rounded-lg border p-4"
                      style={{
                        borderColor: 'rgba(96, 165, 250, 0.66)',
                        background: 'rgba(37, 99, 235, 0.16)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">{t('leadCard.reasonTitle')}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-200">{lead.explanation}</p>
                    </div>

                    <div
                      className="space-y-3 border-t pt-4"
                      style={{ borderTopColor: 'rgba(148, 163, 184, 0.52)' }}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-sm text-slate-200">
                          <span className="mr-2 text-slate-400">{t('dashboard.leadTable.score')}</span>
                          <span className="font-medium text-white">{toDisplayScore(lead.score, scoreDenominator)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-400">{t('dashboard.leadTable.status')}</span>
                          <div data-no-toggle="true">
                            <DashboardSelect
                              value={lead.status}
                              onValueChange={(value) => onLeadStatusChange(lead.id, value as LeadStatus)}
                              options={STATUS_OPTIONS.map((status) => ({
                                value: status,
                                label: tm('leadStatuses', status),
                              }))}
                              size="compact"
                              triggerClassName="min-w-[124px]"
                              contentClassName="min-w-[164px]"
                              triggerStyleOverride={STATUS_VISUALS[lead.status].triggerStyle}
                              getOptionClassName={(status) =>
                                STATUS_VISUALS[status as LeadStatus]?.optionClassName ?? ''
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-200">
                          <span className="text-slate-400">{t('dashboard.leadTable.rating')}</span>
                          {typeof lead.rating === 'number' ? (
                            <span className="font-medium text-white inline-flex items-center gap-1">
                              {lead.rating.toFixed(1)}/5
                              <Star className="h-4 w-4 text-amber-300" />
                              {typeof lead.reviewCount === 'number' ? (
                                <span className="text-xs text-slate-400">({lead.reviewCount})</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-slate-400">{t('common.notAvailable')}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex w-full flex-wrap items-stretch gap-3">
                        {lead.contactChannels.map((rawChannel) => {
                          const parsedChannel = parseContactChannel(rawChannel);
                          const { label, href, icon: Icon } = contactMeta(parsedChannel);
                          const key = `${lead.id}-channel-${rawChannel}`;
                          const valueText =
                            parsedChannel.value.trim().length > 0
                              ? parsedChannel.value
                              : t('dashboard.leadTable.noValueProvided');
                          const displayValue =
                            parsedChannel.type === 'maps'
                              ? truncateMapsDisplayValue(valueText)
                              : valueText;

                          if (!href) {
                            return (
                              <button
                                key={key}
                                type="button"
                                data-no-toggle="true"
                                className={CONTACT_BUTTON_CLASS}
                                style={{
                                  borderColor: 'rgba(125, 211, 252, 0.58)',
                                  background: 'rgba(15, 23, 42, 0.58)',
                                }}
                              >
                                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                                <span className="min-w-0 text-left">
                                  <span className="block leading-none">{label}</span>
                                  <span className={CONTACT_VALUE_CLASS} title={valueText}>
                                    {displayValue}
                                  </span>
                                </span>
                              </button>
                            );
                          }

                          return (
                            <a
                              key={key}
                              href={href}
                              target="_blank"
                              rel="noreferrer noopener"
                              data-no-toggle="true"
                              className={CONTACT_BUTTON_CLASS}
                              style={{
                                borderColor: 'rgba(125, 211, 252, 0.58)',
                                background: 'rgba(15, 23, 42, 0.58)',
                              }}
                            >
                              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                              <span className="min-w-0 text-left">
                                <span className="block leading-none">{label}</span>
                                <span className={CONTACT_VALUE_CLASS} title={valueText}>
                                  {displayValue}
                                </span>
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
