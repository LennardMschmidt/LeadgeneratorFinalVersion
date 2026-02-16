import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import { DashboardSelect } from './DashboardSelect';
import { STATUS_OPTIONS, TIER_OPTIONS } from './mockData';
import { Lead, LeadFilters, LeadStatus } from './types';

interface LeadManagementTableProps {
  leads: Lead[];
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

export function LeadManagementTable({
  leads,
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

  const toggleAllLeads = () => {
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
          <p className="text-sm text-gray-400">{leads.length} visible leads</p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAllLeads}
              className="flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors"
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
        {leads.map((lead) => {
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

                  <div className="grid gap-3 md:grid-cols-[auto_auto_1fr_auto] pt-4 border-t border-white/5 items-center">
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
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {lead.contactChannels.map((channel) => (
                        <span
                          key={`${lead.id}-channel-${channel}`}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-300"
                        >
                          {channel}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-200 hover:bg-white/10 transition-colors"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onLeadStatusChange(lead.id, 'Archived')}
                        className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-200 hover:bg-white/10 transition-colors"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
