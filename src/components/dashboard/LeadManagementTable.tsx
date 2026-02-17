import {
  ChevronDown,
  Globe,
  Link as LinkIcon,
  Linkedin,
  Loader2,
  Mail,
  MapPinned,
  Phone,
  Star,
} from 'lucide-react';
import {
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  useEffect,
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
  onExportCsv: () => void;
  onExportPdf: () => void;
  onSaveVisibleLeads: () => void;
  onSaveLead: (leadId: string) => void;
  isSavingVisibleLeads?: boolean;
  savingLeadIds?: Record<string, boolean>;
}

const CONTACT_BUTTON_CLASS =
  'flex min-w-[210px] flex-1 items-start gap-2 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors';

const CONTACT_VALUE_CLASS = 'mt-0.5 block text-xs text-gray-400 truncate';

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
  onExportCsv,
  onExportPdf,
  onSaveVisibleLeads,
  onSaveLead,
  isSavingVisibleLeads = false,
  savingLeadIds = {},
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
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <label htmlFor="filter-tier" className="block text-xs uppercase tracking-wider text-gray-500">
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

          <div className="space-y-1">
            <label htmlFor="filter-status" className="block text-xs uppercase tracking-wider text-gray-500">
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

        <div className="flex items-center justify-between lg:justify-end gap-4">
          <p className="text-sm text-gray-400">
            {isLoading
              ? t('dashboard.leadTable.searchingLeads')
              : t('dashboard.leadTable.visibleLeads', { count: leads.length })}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAllLeads}
              disabled={!canExpandOrCollapse}
              className="flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 transition-colors enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {hasAnyExpandedLead ? t('dashboard.leadTable.collapseAll') : t('dashboard.leadTable.expandAll')}
            </button>

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

            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((current) => !current)}
                aria-expanded={isExportMenuOpen}
                className="flex items-center gap-3 rounded-xl border px-5 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    width: '19rem',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(25, 25, 28, 1)',
                    WebkitBackdropFilter: 'blur(26px)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onExportCsv();
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
                    {t('dashboard.leadTable.exportCsv')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onExportPdf();
                      setIsExportMenuOpen(false);
                    }}
                    onMouseEnter={handleExportItemMouseEnter}
                    onMouseLeave={handleExportItemMouseLeave}
                    className={exportDropdownItemClass}
                    style={{ cursor: 'pointer', backgroundColor: 'rgba(255, 255, 255, 0.025)' }}
                  >
                    {t('dashboard.leadTable.exportPdf')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
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
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-base text-gray-200">{t('dashboard.leadTable.noLeadsTitle')}</p>
            <p className="mt-2 text-sm text-gray-400">{t('dashboard.leadTable.noLeadsSubtitle')}</p>
          </div>
        ) : (
          leads.map((lead) => {
            const isExpanded = isLeadExpanded(lead.id);

            return (
              <div
                key={lead.id}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all group"
                onClick={(event) => handleLeadCardClick(lead.id, event)}
              >
                <div className={`flex flex-wrap items-start justify-between gap-3 ${isExpanded ? 'mb-4' : ''}`}>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{lead.businessName}</h3>
                    <p className="text-sm text-gray-400">
                      {lead.category} • {lead.location}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {t('dashboard.leadTable.source')}:{' '}
                      <span className="text-gray-400">
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
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <button
                      type="button"
                      onClick={() => toggleLead(lead.id)}
                      aria-expanded={isExpanded}
                      data-no-toggle="true"
                      className={`flex flex-row items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition-all ${
                        isExpanded
                          ? 'border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20'
                          : 'border-white/10 bg-white/5 text-gray-200 hover:border-white/20 hover:bg-white/10'
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
                          className="px-3 py-1 rounded-lg bg-red-500/10 text-red-300 text-xs font-medium border border-red-500/20"
                        >
                          {tm('problemCategories', problem)}
                        </span>
                      ))}
                    </div>

                    <div className="mb-4 p-4 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">{t('leadCard.reasonTitle')}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{lead.explanation}</p>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-sm text-gray-300">
                          <span className="text-gray-500 mr-2">{t('dashboard.leadTable.score')}</span>
                          <span className="font-medium text-white">{toDisplayScore(lead.score, scoreDenominator)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{t('dashboard.leadTable.status')}</span>
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

                        <div className="text-sm text-gray-300 flex items-center gap-2">
                          <span className="text-gray-500">{t('dashboard.leadTable.rating')}</span>
                          {typeof lead.rating === 'number' ? (
                            <span className="font-medium text-white inline-flex items-center gap-1">
                              {lead.rating.toFixed(1)}/5
                              <Star className="h-4 w-4 text-amber-300" />
                              {typeof lead.reviewCount === 'number' ? (
                                <span className="text-xs text-gray-400">({lead.reviewCount})</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-gray-400">{t('common.notAvailable')}</span>
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
