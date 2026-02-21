import { type CSSProperties, useState } from 'react';
import { Globe, Link as LinkIcon, Linkedin, Loader2, Mail, MapPinned, Phone, Star } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { DashboardSelect } from './DashboardSelect';
import { STATUS_VISUALS, TIER_BADGE_STYLES } from './leadVisuals';
import { STATUS_OPTIONS } from './mockData';
import { WebsiteAnalysisModal } from './WebsiteAnalysisModal';
import { LeadStatus, SavedLead } from './types';

const MODAL_OVERLAY_STYLE: CSSProperties = {
  backgroundColor: 'rgba(8, 10, 14, 0.16)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
};

const MODAL_CONTENT_STYLE: CSSProperties = {
  backdropFilter: 'blur(22px) saturate(125%)',
  WebkitBackdropFilter: 'blur(22px) saturate(125%)',
  background: 'linear-gradient(160deg, rgba(44, 54, 70, 0.58), rgba(30, 38, 52, 0.56))',
  boxShadow: '0 24px 72px rgba(5, 10, 24, 0.36)',
};

const GLASS_PANEL = 'rounded-3xl bg-white/[0.08] backdrop-blur-xl';
const SECTION_TITLE_CLASS = 'text-base font-semibold text-white/90 mb-6';
const BLOCK_TITLE_CLASS = 'text-base font-semibold text-slate-100';
const META_LABEL_CLASS = 'text-sm font-medium text-slate-300';
const MAIN_TITLE_STYLE: CSSProperties = {
  fontSize: '2.6rem',
  lineHeight: 1.08,
  fontWeight: 700,
};
const SECTION_TITLE_STYLE: CSSProperties = {
  fontSize: '1.45rem',
  lineHeight: 1.2,
  fontWeight: 650,
  marginBottom: '1.25rem',
};
const BLOCK_TITLE_STYLE: CSSProperties = {
  fontSize: '1.22rem',
  lineHeight: 1.25,
  fontWeight: 650,
};
const METADATA_LABEL_STYLE: CSSProperties = {
  fontSize: '1.08rem',
  lineHeight: 1.25,
  fontWeight: 620,
};

const CONTACT_BUTTON_CLASS =
  'flex min-w-[260px] flex-1 items-start gap-3 rounded-xl border border-white/24 bg-white/[0.05] px-5 py-4 text-sm text-slate-100 transition-colors hover:border-white/38 hover:bg-white/[0.1]';
const CONTACT_VALUE_CLASS = 'block text-sm text-slate-300 break-all';
const PROBLEM_CHIP_CLASS = 'px-4 py-1.5 rounded-lg bg-red-500/10 text-red-300 text-sm font-medium border border-red-500/20';
const PROBLEM_CHIP_EMPTY_CLASS =
  'px-4 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-300 text-sm font-medium border border-emerald-400/20';
const OUTER_CONTENT_PADDING_STYLE: CSSProperties = { padding: '2.75rem' };
const STACK_12_STYLE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '3rem' };
const STACK_10_STYLE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '2.5rem' };
const STACK_6_STYLE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1.5rem' };
const STACK_4_STYLE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem' };
const PANEL_PADDING_STYLE: CSSProperties = { padding: '2.5rem' };
const TWO_COLUMN_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '4rem',
};
const DIVIDER_STYLE: CSSProperties = {
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  paddingTop: '2rem',
};
const SECTION_BREAK_STYLE: CSSProperties = {
  height: '1px',
  border: 0,
  background:
    'linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.58) 50%, rgba(255,255,255,0.12) 100%)',
};
const INTERACTIVE_BUTTON_STYLE: CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.42)',
  backgroundColor: 'rgba(255, 255, 255, 0.09)',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.28)',
  padding: '1rem 1.5rem',
  transform: 'translateY(0)',
  transition: 'background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
};
const ANALYSIS_VIEW_BUTTON_STYLE: CSSProperties = {
  border: '1px solid rgba(34, 211, 238, 0.68)',
  backgroundColor: 'rgba(6, 182, 212, 0.24)',
  color: 'rgb(207, 250, 254)',
  boxShadow: '0 12px 26px rgba(8, 145, 178, 0.34)',
};
const ANALYSIS_RUN_BUTTON_STYLE: CSSProperties = {
  border: '1px solid rgba(96, 165, 250, 0.72)',
  backgroundColor: 'rgba(37, 99, 235, 0.26)',
  color: 'rgb(219, 234, 254)',
  boxShadow: '0 12px 26px rgba(30, 64, 175, 0.34)',
};
const ANALYSIS_REMOVE_BUTTON_STYLE: CSSProperties = {
  border: '1px solid rgba(248, 113, 113, 0.68)',
  backgroundColor: 'rgba(239, 68, 68, 0.2)',
  color: 'rgb(254, 226, 226)',
  boxShadow: '0 12px 26px rgba(185, 28, 28, 0.32)',
};
const CONTACT_TEXT_STACK_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  paddingRight: '0.35rem',
};

interface ParsedContactChannel {
  type: string;
  value: string;
}

interface SavedLeadDetailModalProps {
  lead: SavedLead | null;
  open: boolean;
  scoreDenominator: number;
  statusUpdating: boolean;
  deleting: boolean;
  websiteAnalysisLoading?: boolean;
  onClose: () => void;
  onStatusChange: (lead: SavedLead, status: LeadStatus) => void;
  onDelete: (savedLeadId: string) => void;
  onRunWebsiteAnalysis?: (lead: SavedLead) => Promise<void> | void;
  onRemoveWebsiteAnalysis?: (lead: SavedLead) => Promise<void> | void;
}

interface DirectLink {
  key: string;
  label: string;
  value: string;
  icon: typeof Globe;
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

const formatChannelDisplayValue = (type: string, value: string): string => {
  if (!value) {
    return value;
  }

  if (type === 'maps') {
    const mapsPathIndex = value.indexOf('/maps');
    if (mapsPathIndex !== -1) {
      return `${value.slice(0, mapsPathIndex + '/maps'.length)}...`;
    }
    return value.length > 42 ? `${value.slice(0, 42)}...` : value;
  }

  return value.length > 60 ? `${value.slice(0, 60)}...` : value;
};

const setInteractiveHoverState = (element: HTMLElement, isHover: boolean): void => {
  element.style.backgroundColor = isHover ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.09)';
  element.style.borderColor = isHover ? 'rgba(191, 219, 254, 0.72)' : 'rgba(148, 163, 184, 0.42)';
  element.style.boxShadow = isHover
    ? '0 14px 30px rgba(59, 130, 246, 0.22)'
    : '0 10px 24px rgba(15, 23, 42, 0.28)';
  element.style.transform = isHover ? 'translateY(-1px)' : 'translateY(0)';
};
const setAnalysisButtonHoverState = (
  element: HTMLElement,
  isHover: boolean,
  mode: 'view' | 'run' | 'remove',
): void => {
  if (mode === 'view') {
    element.style.backgroundColor = isHover ? 'rgba(6, 182, 212, 0.34)' : 'rgba(6, 182, 212, 0.24)';
    element.style.borderColor = isHover ? 'rgba(103, 232, 249, 0.82)' : 'rgba(34, 211, 238, 0.68)';
    return;
  }
  if (mode === 'remove') {
    element.style.backgroundColor = isHover ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)';
    element.style.borderColor = isHover ? 'rgba(252, 165, 165, 0.88)' : 'rgba(248, 113, 113, 0.68)';
    return;
  }

  element.style.backgroundColor = isHover ? 'rgba(37, 99, 235, 0.35)' : 'rgba(37, 99, 235, 0.26)';
  element.style.borderColor = isHover ? 'rgba(147, 197, 253, 0.86)' : 'rgba(96, 165, 250, 0.72)';
};

const toDisplayScore = (score: number, maxScore: number): number => {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
    return 0;
  }
  const normalized = Math.max(0, Math.min(100, (score / maxScore) * 100));
  return Math.round(normalized);
};

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

export function SavedLeadDetailModal({
  lead,
  open,
  scoreDenominator,
  statusUpdating,
  deleting,
  websiteAnalysisLoading = false,
  onClose,
  onStatusChange,
  onDelete,
  onRunWebsiteAnalysis,
  onRemoveWebsiteAnalysis,
}: SavedLeadDetailModalProps) {
  const { t, tm } = useI18n();
  const [isWebsiteAnalysisOpen, setIsWebsiteAnalysisOpen] = useState(false);

  if (!lead) {
    return null;
  }

  const directLinks = [
    lead.websiteUrl
      ? { key: 'website', label: t('leadCard.website'), value: lead.websiteUrl, icon: Globe }
      : null,
    lead.mapsUrl
      ? { key: 'maps', label: 'Maps', value: lead.mapsUrl, icon: MapPinned }
      : null,
    lead.reviewsUrl
      ? {
          key: 'reviews',
          label: t('dashboard.savedLeads.detailModal.reviews'),
          value: lead.reviewsUrl,
          icon: Star,
        }
      : null,
    lead.phone?.telUri
      ? { key: 'phone', label: t('leadCard.phone'), value: lead.phone.telUri, icon: Phone }
      : null,
  ].filter((item): item is DirectLink => item !== null);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        overlayStyle={MODAL_OVERLAY_STYLE}
        className="max-h-[92vh] overflow-y-auto p-0 text-white sm:max-w-[1120px]"
        style={MODAL_CONTENT_STYLE}
      >
        <div className="relative" style={OUTER_CONTENT_PADDING_STYLE}>
          <div style={{ ...STACK_12_STYLE, margin: '20px' }}>
            <section style={STACK_10_STYLE}>
              <p className={SECTION_TITLE_CLASS} style={SECTION_TITLE_STYLE}>{t('dashboard.savedLeads.columns.business')}</p>
              <DialogHeader className="text-left" style={STACK_6_STYLE}>
                <DialogTitle className="text-3xl font-semibold tracking-tight text-white sm:text-4xl" style={MAIN_TITLE_STYLE}>
                  {lead.businessName}
                </DialogTitle>
                <DialogDescription className="text-lg leading-relaxed text-slate-200">
                  {lead.category} • {lead.location}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center" style={{ gap: '1rem' }}>
                <span
                  className={`rounded-full px-4 text-sm font-medium ${TIER_BADGE_STYLES[lead.tier]}`}
                  style={{
                    minHeight: '2.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {tm('leadTierLabels', lead.tier)} ({tm('leadTiers', lead.tier)})
                </span>
                <span
                  className="rounded-full border border-white/20 bg-white/[0.08] px-4 text-sm text-slate-100"
                  style={{
                    minHeight: '2.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1.2,
                    fontWeight: 500,
                  }}
                >
                  {t('dashboard.leadTable.score')}: {toDisplayScore(lead.score, scoreDenominator)}
                </span>
                <div className="min-w-[240px]">
                  <DashboardSelect
                    value={lead.status}
                    onValueChange={(value) => onStatusChange(lead, value as LeadStatus)}
                    options={STATUS_OPTIONS.map((status) => ({
                      value: status,
                      label: tm('leadStatuses', status),
                    }))}
                    size="compact"
                    triggerClassName="min-w-[180px] rounded-lg text-sm"
                    contentClassName="min-w-[180px]"
                    triggerStyleOverride={{
                      ...STATUS_VISUALS[lead.status].triggerStyle,
                      minWidth: '180px',
                      borderRadius: '0.65rem',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.875rem',
                      lineHeight: 1.2,
                    }}
                    getOptionClassName={(status) =>
                      STATUS_VISUALS[status as LeadStatus]?.optionClassName ?? ''
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(lead.savedLeadId)}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[11px] font-medium transition disabled:cursor-not-allowed"
                  style={{
                    border: '1px solid rgba(248, 113, 113, 0.55)',
                    backgroundColor: 'rgba(239, 68, 68, 0.13)',
                    color: 'rgb(254, 226, 226)',
                    lineHeight: 1.2,
                    opacity: deleting ? 0.6 : 1,
                  }}
                  onMouseEnter={(event) => {
                    if (deleting) {
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
                  {deleting ? (
                    <>
                      <Loader2 className="spin-loader h-3.5 w-3.5" />
                      {t('dashboard.savedLeads.removing')}
                    </>
                  ) : (
                    <>{t('dashboard.savedLeads.remove')}</>
                  )}
                </button>
              </div>
              {statusUpdating ? (
                <p className="text-base text-slate-300">{t('dashboard.savedLeads.updatingStatus')}</p>
              ) : null}
              {lead.websiteUrl ? (
                <div className="flex items-center gap-3">
                  {lead.websiteAnalysis ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsWebsiteAnalysisOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition"
                        style={ANALYSIS_VIEW_BUTTON_STYLE}
                        onMouseEnter={(event) =>
                          setAnalysisButtonHoverState(event.currentTarget, true, 'view')
                        }
                        onMouseLeave={(event) =>
                          setAnalysisButtonHoverState(event.currentTarget, false, 'view')
                        }
                      >
                        {t('dashboard.websiteAnalysis.view')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onRunWebsiteAnalysis) {
                            void onRunWebsiteAnalysis(lead);
                          }
                        }}
                        disabled={websiteAnalysisLoading || !onRunWebsiteAnalysis}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                        style={ANALYSIS_RUN_BUTTON_STYLE}
                        onMouseEnter={(event) =>
                          setAnalysisButtonHoverState(event.currentTarget, true, 'run')
                        }
                        onMouseLeave={(event) =>
                          setAnalysisButtonHoverState(event.currentTarget, false, 'run')
                        }
                      >
                        {websiteAnalysisLoading ? (
                          <>
                            <Loader2 className="spin-loader h-3.5 w-3.5" />
                            {t('dashboard.websiteAnalysis.running')}
                          </>
                        ) : (
                          t('dashboard.websiteAnalysis.rerun')
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onRemoveWebsiteAnalysis) {
                            void onRemoveWebsiteAnalysis(lead);
                          }
                        }}
                        disabled={websiteAnalysisLoading || !onRemoveWebsiteAnalysis}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                        style={ANALYSIS_REMOVE_BUTTON_STYLE}
                        onMouseEnter={(event) =>
                          setAnalysisButtonHoverState(event.currentTarget, true, 'remove')
                        }
                        onMouseLeave={(event) =>
                          setAnalysisButtonHoverState(event.currentTarget, false, 'remove')
                        }
                      >
                        {websiteAnalysisLoading ? (
                          <>
                            <Loader2 className="spin-loader h-3.5 w-3.5" />
                            {t('dashboard.websiteAnalysis.removing')}
                          </>
                        ) : (
                          t('dashboard.websiteAnalysis.removeAnalysis')
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (onRunWebsiteAnalysis) {
                          void onRunWebsiteAnalysis(lead);
                        }
                      }}
                      disabled={websiteAnalysisLoading || !onRunWebsiteAnalysis}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                      style={ANALYSIS_RUN_BUTTON_STYLE}
                      onMouseEnter={(event) =>
                        setAnalysisButtonHoverState(event.currentTarget, true, 'run')
                      }
                      onMouseLeave={(event) =>
                        setAnalysisButtonHoverState(event.currentTarget, false, 'run')
                      }
                    >
                      {websiteAnalysisLoading ? (
                        <>
                          <Loader2 className="spin-loader h-3.5 w-3.5" />
                          {t('dashboard.websiteAnalysis.running')}
                        </>
                      ) : (
                        t('dashboard.websiteAnalysis.run')
                      )}
                    </button>
                  )}
                </div>
              ) : null}
            </section>

            <section className={GLASS_PANEL} style={{ ...STACK_10_STYLE, ...PANEL_PADDING_STYLE }}>
              <h1 className={SECTION_TITLE_CLASS} style={SECTION_TITLE_STYLE}>{t('dashboard.savedLeads.detailModal.contactAndLinks')}</h1>
              <div className="xl:divide-x xl:divide-white/10" style={TWO_COLUMN_GRID_STYLE}>
                <div style={STACK_6_STYLE}>
                  <h1 className={BLOCK_TITLE_CLASS} style={BLOCK_TITLE_STYLE}>{t('dashboard.savedLeads.detailModal.problemsAndReason')}</h1>
                  <div className="flex flex-wrap" style={{ gap: '1rem' }}>
                    {lead.problems.length > 0 ? (
                      lead.problems.map((problem) => (
                        <span key={`${lead.savedLeadId}-${problem}`} className={PROBLEM_CHIP_CLASS}>
                          {tm('problemCategories', problem)}
                        </span>
                      ))
                    ) : (
                      <span className={PROBLEM_CHIP_EMPTY_CLASS}>
                        {t('dashboard.savedLeads.detailModal.noProblemsDetected')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-100">
                    {lead.explanation || t('common.notAvailable')}
                  </p>
                </div>

                <div className="xl:pl-10" style={STACK_6_STYLE}>
                  <h3 className={BLOCK_TITLE_CLASS} style={BLOCK_TITLE_STYLE}>{t('dashboard.savedLeads.detailModal.contactAndLinks')}</h3>

                  {lead.contactChannels.length > 0 ? (
                    <div className="flex w-full flex-wrap" style={{ gap: '2rem' }}>
                      {lead.contactChannels.map((rawChannel) => {
                        const parsed = parseContactChannel(rawChannel);
                        const channelType = parsed.type.toLowerCase();
                        const value = parsed.value.trim();
                        const label =
                          channelType === 'email'
                            ? t('leadCard.email')
                            : channelType === 'phone'
                              ? t('leadCard.phone')
                              : channelType === 'website'
                                ? t('leadCard.website')
                                : channelType === 'maps'
                                  ? 'Maps'
                                  : channelType === 'linkedin'
                                    ? 'LinkedIn'
                                    : channelType
                                      ? channelType[0].toUpperCase() + channelType.slice(1)
                                      : t('dashboard.leadTable.contactFallback');

                        const Icon =
                          channelType === 'email'
                            ? Mail
                            : channelType === 'phone'
                              ? Phone
                              : channelType === 'website'
                                ? Globe
                                : channelType === 'maps'
                                  ? MapPinned
                                  : channelType === 'linkedin'
                                    ? Linkedin
                                    : LinkIcon;

                        const href =
                          channelType === 'email'
                            ? `mailto:${value}`
                            : channelType === 'phone'
                              ? `tel:${value.replace(/\s+/g, '')}`
                              : value
                                ? ensureUrlProtocol(value)
                                : undefined;
                        const displayValue = formatChannelDisplayValue(channelType, value);

                        if (!href) {
                          return (
                            <button
                              key={`${lead.savedLeadId}-${rawChannel}`}
                              type="button"
                              className={CONTACT_BUTTON_CLASS}
                              style={INTERACTIVE_BUTTON_STYLE}
                              onMouseEnter={(event) => setInteractiveHoverState(event.currentTarget, true)}
                              onMouseLeave={(event) => setInteractiveHoverState(event.currentTarget, false)}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 text-left" style={CONTACT_TEXT_STACK_STYLE}>
                                <span className="block text-sm leading-none">{label}</span>
                                <span className={CONTACT_VALUE_CLASS}>
                                  {displayValue || t('dashboard.leadTable.noValueProvided')}
                                </span>
                              </span>
                            </button>
                          );
                        }

                        return (
                          <a
                            key={`${lead.savedLeadId}-${rawChannel}`}
                            href={href}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={CONTACT_BUTTON_CLASS}
                            style={INTERACTIVE_BUTTON_STYLE}
                            onMouseEnter={(event) => setInteractiveHoverState(event.currentTarget, true)}
                            onMouseLeave={(event) => setInteractiveHoverState(event.currentTarget, false)}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 text-left" style={CONTACT_TEXT_STACK_STYLE}>
                              <span className="block text-sm leading-none">{label}</span>
                              <span className={CONTACT_VALUE_CLASS}>
                                {displayValue || t('dashboard.leadTable.noValueProvided')}
                              </span>
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-base text-slate-300">{t('common.notAvailable')}</p>
                  )}

                  {lead.contactChannels.length === 0 && directLinks.length > 0 ? (
                    <div className="flex flex-wrap" style={{ gap: '1.5rem' }}>
                      {directLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <a
                            key={`${lead.savedLeadId}-${link.key}`}
                            href={ensureUrlProtocol(link.value)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-3 rounded-lg border border-white/22 bg-white/[0.08] px-5 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/[0.16]"
                            style={INTERACTIVE_BUTTON_STYLE}
                            onMouseEnter={(event) => setInteractiveHoverState(event.currentTarget, true)}
                            onMouseLeave={(event) => setInteractiveHoverState(event.currentTarget, false)}
                          >
                            <Icon className="h-4 w-4" />
                            {link.label}
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
            <hr aria-hidden="true" style={SECTION_BREAK_STYLE} />

            <section className={GLASS_PANEL} style={{ ...STACK_10_STYLE, ...PANEL_PADDING_STYLE }}>
              <p className={SECTION_TITLE_CLASS} style={SECTION_TITLE_STYLE}>{t('dashboard.savedLeads.detailModal.metadata')}</p>
              <div className="grid gap-16 lg:grid-cols-2 lg:divide-x lg:divide-white/10">
                <div style={STACK_6_STYLE}>
                  <div style={STACK_4_STYLE}>
                    <p className={META_LABEL_CLASS} style={METADATA_LABEL_STYLE}>
                      {t('dashboard.savedLeads.columns.savedAt')}
                    </p>
                    <p className="text-lg leading-relaxed text-slate-100">{formatDateTime(lead.savedAt)}</p>
                  </div>

                  <div style={{ ...STACK_4_STYLE, ...DIVIDER_STYLE }}>
                    <p className={META_LABEL_CLASS} style={METADATA_LABEL_STYLE}>
                      {t('dashboard.savedLeads.detailModal.updatedAt')}
                    </p>
                    <p className="text-lg leading-relaxed text-slate-100">{formatDateTime(lead.updatedAt)}</p>
                  </div>

                  <div style={{ ...STACK_4_STYLE, ...DIVIDER_STYLE }}>
                    <p className={META_LABEL_CLASS} style={METADATA_LABEL_STYLE}>
                      {t('dashboard.leadTable.source')}
                    </p>
                    <p className="text-lg leading-relaxed text-slate-100">
                      {lead.source || t('dashboard.leadTable.defaultSource')}
                    </p>
                  </div>

                  {typeof lead.rating === 'number' ? (
                    <div style={{ ...STACK_4_STYLE, ...DIVIDER_STYLE }}>
                      <p className={META_LABEL_CLASS} style={METADATA_LABEL_STYLE}>
                        {t('dashboard.leadTable.rating')}
                      </p>
                      <p className="text-lg leading-relaxed text-slate-100">
                        {lead.rating.toFixed(1)}
                        {typeof lead.reviewCount === 'number' ? ` (${lead.reviewCount})` : ''}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="lg:pl-10" style={STACK_6_STYLE}>
                  <div style={STACK_4_STYLE}>
                    <p className={META_LABEL_CLASS} style={METADATA_LABEL_STYLE}>
                      {t('dashboard.savedLeads.detailModal.address')}
                    </p>
                    <p className="text-lg leading-relaxed text-slate-100">
                      {lead.address?.full || t('common.notAvailable')}
                    </p>
                    {lead.geo ? (
                      <p className="text-sm leading-relaxed text-slate-300">
                        Lat: {lead.geo.lat.toFixed(5)} • Lng: {lead.geo.lng.toFixed(5)}
                      </p>
                    ) : null}
                  </div>

                  {lead.hours ? (
                    <div style={{ ...STACK_4_STYLE, ...DIVIDER_STYLE }}>
                      <p className={META_LABEL_CLASS} style={METADATA_LABEL_STYLE}>
                        {t('dashboard.savedLeads.detailModal.hours')}
                      </p>
                      {lead.hours.statusSummary ? <p className="text-sm text-slate-100">{lead.hours.statusSummary}</p> : null}
                      {lead.hours.statusText ? <p className="text-sm text-slate-300">{lead.hours.statusText}</p> : null}
                      {lead.hours.weeklyHours.map((entry, index) => (
                        <p key={`${lead.savedLeadId}-hours-${index}`} className="text-sm text-slate-200">
                          <span className="font-medium text-slate-100">{entry.day || t('common.notAvailable')}</span>
                          : {entry.hours.join(', ') || t('common.notAvailable')}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {lead.attributes ? (
                    <div style={{ ...STACK_4_STYLE, ...DIVIDER_STYLE }}>
                      <p className={META_LABEL_CLASS} style={METADATA_LABEL_STYLE}>
                        {t('dashboard.savedLeads.detailModal.attributes')}
                      </p>
                      {Object.entries(lead.attributes).map(([key, values]) => (
                        <p key={`${lead.savedLeadId}-attribute-${key}`} className="text-sm text-slate-200">
                          <span className="font-medium text-slate-100">{key}: </span>
                          {values.join(', ')}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
      <WebsiteAnalysisModal
        open={isWebsiteAnalysisOpen}
        onClose={() => setIsWebsiteAnalysisOpen(false)}
        analysis={lead.websiteAnalysis ?? null}
        businessName={lead.businessName}
      />
    </Dialog>
  );
}
