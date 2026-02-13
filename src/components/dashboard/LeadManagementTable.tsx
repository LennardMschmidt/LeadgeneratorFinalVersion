import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Star } from 'lucide-react';
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
            <select
              id="filter-tier"
              value={filters.tier}
              onChange={(event) => onTierFilterChange(event.target.value as LeadFilters['tier'])}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
            >
              {TIER_OPTIONS.map((tier) => (
                <option key={tier} value={tier} className="text-black">
                  {tier}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="filter-status" className="block text-xs uppercase tracking-wider text-gray-500">
              Filter by Status
            </label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(event) => onStatusFilterChange(event.target.value as LeadFilters['status'])}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
            >
              <option value="All" className="text-black">
                All
              </option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status} className="text-black">
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-4">
          <p className="text-sm text-gray-400">{leads.length} visible leads</p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAllLeads}
              className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors"
            >
              {hasAnyExpandedLead ? 'Collapse all' : 'Expand all'}
            </button>

            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors"
              >
                Export
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {isExportMenuOpen ? (
                <div className="absolute right-0 mt-2 w-40 rounded-xl border border-white/10 bg-[#10111a] shadow-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      onExportCsv();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onExportPdf();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 transition-colors"
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
                    className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    {isExpanded ? 'Collapse' : 'Expand'}
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
                      <select
                        value={lead.status}
                        onChange={(event) => onLeadStatusChange(lead.id, event.target.value as LeadStatus)}
                        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-blue-400/80"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status} className="text-black">
                            {status}
                          </option>
                        ))}
                      </select>
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
