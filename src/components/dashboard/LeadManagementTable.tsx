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
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { DashboardSelect } from './DashboardSelect';
import { STATUS_OPTIONS, TIER_OPTIONS } from './mockData';
import { Lead, LeadFilters, LeadStatus } from './types';

interface LeadManagementTableProps {
  leads: Lead[];
  isLoading?: boolean;
  filters: LeadFilters;
  onTierFilterChange: (tier: LeadFilters['tier']) => void;
  onStatusFilterChange: (status: LeadFilters['status']) => void;
  onLeadStatusChange: (leadId: string, status: LeadStatus) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
}

const TIER_LABELS: Record<Lead['tier'], string> = {
  'Tier 1': 'Most Valuable',
  'Tier 2': 'Probable',
  'Tier 3': 'Raw',
};

const TIER_BADGE_STYLES: Record<Lead['tier'], string> = {
  'Tier 1': 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  'Tier 2': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  'Tier 3': 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
};

const STATUS_VISUALS: Record<
  LeadStatus,
  {
    triggerStyle: CSSProperties;
    optionClassName: string;
  }
> = {
  New: {
    triggerStyle: {
      borderColor: 'rgba(45, 212, 191, 0.42)',
      backgroundColor: 'rgba(20, 184, 166, 0.16)',
      color: 'rgb(153, 246, 228)',
    },
    optionClassName: '!text-teal-300',
  },
  Pending: {
    triggerStyle: {
      borderColor: 'rgba(251, 191, 36, 0.42)',
      backgroundColor: 'rgba(245, 158, 11, 0.16)',
      color: 'rgb(253, 230, 138)',
    },
    optionClassName: '!text-amber-300',
  },
  Contacted: {
    triggerStyle: {
      borderColor: 'rgba(96, 165, 250, 0.42)',
      backgroundColor: 'rgba(59, 130, 246, 0.16)',
      color: 'rgb(147, 197, 253)',
    },
    optionClassName: '!text-blue-300',
  },
  Won: {
    triggerStyle: {
      borderColor: 'rgba(74, 222, 128, 0.42)',
      backgroundColor: 'rgba(34, 197, 94, 0.16)',
      color: 'rgb(134, 239, 172)',
    },
    optionClassName: '!text-green-300',
  },
  Lost: {
    triggerStyle: {
      borderColor: 'rgba(248, 113, 113, 0.42)',
      backgroundColor: 'rgba(239, 68, 68, 0.16)',
      color: 'rgb(252, 165, 165)',
    },
    optionClassName: '!text-red-300',
  },
  Archived: {
    triggerStyle: {
      borderColor: 'rgba(196, 181, 253, 0.42)',
      backgroundColor: 'rgba(139, 92, 246, 0.16)',
      color: 'rgb(216, 180, 254)',
    },
    optionClassName: '!text-purple-300',
  },
};

const CONTACT_BUTTON_CLASS =
  'flex min-w-[210px] flex-1 items-start gap-2 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-2 text-sm text-gray-300 hover:text-white transition-all group-hover:scale-105';

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

const contactMeta = (
  channel: ParsedContactChannel,
): { label: string; href?: string; icon: ComponentType<{ className?: string }> } => {
  if (channel.type === 'email') {
    return { label: 'Email', href: `mailto:${channel.value}`, icon: Mail };
  }

  if (channel.type === 'phone') {
    return { label: 'Phone', href: `tel:${channel.value.replace(/\s+/g, '')}`, icon: Phone };
  }

  if (channel.type === 'website') {
    return { label: 'Website', href: ensureUrlProtocol(channel.value), icon: Globe };
  }

  if (channel.type === 'maps') {
    return { label: 'Maps', href: ensureUrlProtocol(channel.value), icon: MapPinned };
  }

  if (channel.type === 'linkedin') {
    return { label: 'LinkedIn', href: ensureUrlProtocol(channel.value), icon: Linkedin };
  }

  return {
    label: channel.type ? channel.type[0].toUpperCase() + channel.type.slice(1) : 'Contact',
    href: channel.value ? ensureUrlProtocol(channel.value) : undefined,
    icon: LinkIcon,
  };
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
  isLoading = false,
  filters,
  onTierFilterChange,
  onStatusFilterChange,
  onLeadStatusChange,
  onExportCsv,
  onExportPdf,
}: LeadManagementTableProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [leadExpandedStates, setLeadExpandedStates] = useState<Record<string, boolean>>({});
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const exportDropdownItemClass =
    'block w-full cursor-pointer whitespace-nowrap px-5 py-3 text-left text-sm text-gray-300 transition-all duration-150';

  const isLeadExpanded = (leadId: string) => leadExpandedStates[leadId] ?? true;
  const hasAnyExpandedLead = leads.some((lead) => isLeadExpanded(lead.id));
  const canExpandOrCollapse = !isLoading && leads.length > 0;

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
              Filter by Tier
            </label>
            <DashboardSelect
              id="filter-tier"
              value={filters.tier}
              onValueChange={(value) => onTierFilterChange(value as LeadFilters['tier'])}
              options={TIER_OPTIONS.map((tier) => ({
                value: tier,
                label: tier,
              }))}
              triggerClassName="rounded-lg py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="filter-status" className="block text-xs uppercase tracking-wider text-gray-500">
              Filter by Status
            </label>
            <DashboardSelect
              id="filter-status"
              value={filters.status}
              onValueChange={(value) => onStatusFilterChange(value as LeadFilters['status'])}
              options={[
                { value: 'All', label: 'All' },
                ...STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
              ]}
              triggerClassName="rounded-lg py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-4">
          <p className="text-sm text-gray-400">
            {isLoading ? 'Searching for leads...' : `${leads.length} visible leads`}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAllLeads}
              disabled={!canExpandOrCollapse}
              className="flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 transition-colors enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {hasAnyExpandedLead ? 'Collapse all' : 'Expand all'}
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
                Export
                <ChevronDown
                  className="h-4 w-4 transition-transform duration-200"
                  style={{ color: '#9ca3af', transform: isExportMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {isExportMenuOpen ? (
                <div
                  className="absolute right-0 z-50 mt-3 overflow-hidden rounded-xl border border-white/10 shadow-2xl"
                  style={{
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
                    Export CSV
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
                    Export PDF
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
                Running search and evaluating lead quality...
              </p>
              <br></br>
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
            <p className="text-base text-gray-200">No leads to display yet.</p>
            <p className="mt-2 text-sm text-gray-400">
              Configure your search above and run a search to populate the table.
            </p>
          </div>
        ) : (
          leads.map((lead) => {
            const isExpanded = isLeadExpanded(lead.id);

            return (
              <div
                key={lead.id}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className={`flex flex-wrap items-start justify-between gap-3 ${isExpanded ? 'mb-4' : ''}`}>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{lead.businessName}</h3>
                    <p className="text-sm text-gray-400">
                      {lead.category} • {lead.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${TIER_BADGE_STYLES[lead.tier]}`}>
                      {TIER_LABELS[lead.tier]} ({lead.tier})
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleLead(lead.id)}
                      aria-expanded={isExpanded}
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
                      <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
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
                          {problem}
                        </span>
                      ))}
                    </div>

                    <div className="mb-4 p-4 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">Why this is a good lead</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{lead.explanation}</p>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-sm text-gray-300">
                          <span className="text-gray-500 mr-2">Score</span>
                          <span className="font-medium text-white">{lead.score}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Status</span>
                          <DashboardSelect
                            value={lead.status}
                            onValueChange={(value) => onLeadStatusChange(lead.id, value as LeadStatus)}
                            options={STATUS_OPTIONS.map((status) => ({
                              value: status,
                              label: status,
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

                      <div className="flex w-full flex-wrap items-stretch gap-3">
                        {lead.contactChannels.map((rawChannel) => {
                          const parsedChannel = parseContactChannel(rawChannel);
                          const { label, href, icon: Icon } = contactMeta(parsedChannel);
                          const key = `${lead.id}-channel-${rawChannel}`;
                          const valueText =
                            parsedChannel.value.trim().length > 0
                              ? parsedChannel.value
                              : 'No value provided';

                          if (!href) {
                            return (
                              <button key={key} type="button" className={CONTACT_BUTTON_CLASS}>
                                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                                <span className="min-w-0 text-left">
                                  <span className="block leading-none">{label}</span>
                                  <span className={CONTACT_VALUE_CLASS} title={valueText}>
                                    {valueText}
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
                              className={CONTACT_BUTTON_CLASS}
                            >
                              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                              <span className="min-w-0 text-left">
                                <span className="block leading-none">{label}</span>
                                <span className={CONTACT_VALUE_CLASS} title={valueText}>
                                  {valueText}
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
