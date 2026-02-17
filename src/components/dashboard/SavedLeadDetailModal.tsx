import type { CSSProperties } from 'react';
import { Globe, Link as LinkIcon, Linkedin, Mail, MapPinned, Phone, Star } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { DashboardSelect } from './DashboardSelect';
import { STATUS_VISUALS, TIER_BADGE_STYLES } from './leadVisuals';
import { STATUS_OPTIONS } from './mockData';
import { LeadStatus, SavedLead } from './types';

const MODAL_OVERLAY_STYLE: CSSProperties = {
  backgroundColor: 'rgba(8, 10, 14, 0.16)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
};

const MODAL_CONTENT_STYLE: CSSProperties = {
  backdropFilter: 'blur(22px) saturate(125%)',
  WebkitBackdropFilter: 'blur(22px) saturate(125%)',
  background: 'linear-gradient(160deg, rgba(24, 27, 32, 0.72), rgba(16, 19, 24, 0.74))',
  boxShadow:
    '0 34px 96px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 rgba(255, 255, 255, 0.06)',
};

const SECTION_CLASS =
  'my-2 rounded-[28px] border border-white/24 bg-white/[0.055] px-7 py-7 sm:px-9 sm:py-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]';
const SUB_PANEL_CLASS = 'my-3 rounded-2xl border border-white/20 bg-black/24 px-6 py-6';
const SECTION_TITLE_CLASS = 'text-xs font-semibold uppercase tracking-[0.18em] text-slate-300';
const BLOCK_TITLE_CLASS = 'text-sm font-semibold text-slate-100';
const META_LABEL_CLASS = 'text-[11px] uppercase tracking-[0.14em] text-slate-300';

const CONTACT_BUTTON_CLASS =
  'my-1 flex min-w-[220px] flex-1 items-start gap-3.5 rounded-xl border border-white/24 bg-black/30 px-4 py-3.5 text-sm text-slate-100 transition-colors hover:border-white/38 hover:bg-black/40';
const CONTACT_VALUE_CLASS = 'mt-2 block text-xs text-slate-300 break-all';
const PROBLEM_CHIP_CLASS = 'px-3 py-1 rounded-lg bg-red-500/10 text-red-300 text-xs font-medium border border-red-500/20';

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
  onClose: () => void;
  onStatusChange: (lead: SavedLead, status: LeadStatus) => void;
  onDelete: (savedLeadId: string) => void;
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
  onClose,
  onStatusChange,
  onDelete,
}: SavedLeadDetailModalProps) {
  const { t, tm } = useI18n();

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
        className="max-h-[92vh] overflow-y-auto border border-white/32 p-0 text-white sm:max-w-[1120px]"
        style={MODAL_CONTENT_STYLE}
      >
        <div className="relative p-8 sm:p-10 lg:p-12">
          <div className="space-y-10">
            <section className={SECTION_CLASS}>
              <p className={`${SECTION_TITLE_CLASS} mb-3`}>{t('dashboard.savedLeads.columns.business')}</p>
              <div className="mt-6 space-y-7">
                <DialogHeader className="space-y-4 text-left">
                  <DialogTitle className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {lead.businessName}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-lg leading-relaxed text-slate-200">
                    {lead.category} • {lead.location}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${TIER_BADGE_STYLES[lead.tier]}`}>
                    {tm('leadTierLabels', lead.tier)} ({tm('leadTiers', lead.tier)})
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/[0.08] px-3 py-1 text-xs text-slate-100">
                    {t('dashboard.leadTable.score')}: {toDisplayScore(lead.score, scoreDenominator)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_VISUALS[lead.status].badgeClassName}`}
                  >
                    {tm('leadStatuses', lead.status)}
                  </span>
                </div>

                <div className={`${SUB_PANEL_CLASS} space-y-6`}>
                  <p className={`${SECTION_TITLE_CLASS} mb-2`}>{t('dashboard.savedLeads.detailModal.quickActions')}</p>
                  <div className="flex flex-wrap items-end gap-5">
                    <div className="space-y-2.5">
                      <p className={META_LABEL_CLASS}>{t('dashboard.savedLeads.columns.status')}</p>
                      <DashboardSelect
                        value={lead.status}
                        onValueChange={(value) => onStatusChange(lead, value as LeadStatus)}
                        options={STATUS_OPTIONS.map((status) => ({
                          value: status,
                          label: tm('leadStatuses', status),
                        }))}
                        size="compact"
                        triggerClassName="min-w-[220px] rounded-xl px-4 py-2.5 text-sm"
                        contentClassName="min-w-[220px]"
                        triggerStyleOverride={STATUS_VISUALS[lead.status].triggerStyle}
                        getOptionClassName={(status) =>
                          STATUS_VISUALS[status as LeadStatus]?.optionClassName ?? ''
                        }
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onDelete(lead.savedLeadId)}
                      disabled={deleting}
                      className="inline-flex items-center justify-center rounded-xl border border-red-300/58 bg-red-500/14 px-6 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/26 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deleting ? t('dashboard.savedLeads.removing') : t('dashboard.savedLeads.remove')}
                    </button>
                  </div>
                  {statusUpdating ? (
                    <p className="text-xs text-slate-300">{t('dashboard.savedLeads.updatingStatus')}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className={SECTION_CLASS}>
              <p className={`${SECTION_TITLE_CLASS} mt-2 mb-7`}>{t('dashboard.savedLeads.detailModal.contactAndLinks')}</p>
              <div className="grid gap-7 xl:grid-cols-2">
                <div className={`${SUB_PANEL_CLASS} space-y-6`}>
                  <h3 className={BLOCK_TITLE_CLASS}>{t('dashboard.savedLeads.detailModal.problemsAndReason')}</h3>
                  <div className="flex flex-wrap gap-3">
                    {lead.problems.length > 0 ? (
                      lead.problems.map((problem) => (
                        <span
                          key={`${lead.savedLeadId}-${problem}`}
                          className={PROBLEM_CHIP_CLASS}
                        >
                          {tm('problemCategories', problem)}
                        </span>
                      ))
                    ) : (
                      <span className={PROBLEM_CHIP_CLASS}>
                        {t('dashboard.savedLeads.detailModal.noProblemsDetected')}
                      </span>
                    )}
                  </div>
                  <div className="rounded-xl border border-white/16 bg-black/22 px-5 py-4">
                    <p className="text-sm leading-relaxed text-slate-100">
                      {lead.explanation || t('common.notAvailable')}
                    </p>
                  </div>
                </div>

                <div className={`${SUB_PANEL_CLASS} space-y-6`}>
                  <h3 className={BLOCK_TITLE_CLASS}>{t('dashboard.savedLeads.detailModal.contactAndLinks')}</h3>

                  {lead.contactChannels.length > 0 ? (
                    <div className="flex w-full flex-wrap gap-6">
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

                        if (!href) {
                          return (
                            <button
                              key={`${lead.savedLeadId}-${rawChannel}`}
                              type="button"
                              className={CONTACT_BUTTON_CLASS}
                            >
                              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span className="min-w-0 text-left">
                                <span className="block text-sm leading-none">{label}</span>
                                <span className={CONTACT_VALUE_CLASS}>
                                  {value || t('dashboard.leadTable.noValueProvided')}
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
                          >
                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 text-left">
                              <span className="block text-sm leading-none">{label}</span>
                              <span className={CONTACT_VALUE_CLASS}>
                                {value || t('dashboard.leadTable.noValueProvided')}
                              </span>
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 mb-1 text-sm text-slate-300">{t('common.notAvailable')}</p>
                  )}

                  {lead.contactChannels.length === 0 && directLinks.length > 0 ? (
                    <div className="flex flex-wrap gap-4 pt-3">
                      {directLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <a
                            key={`${lead.savedLeadId}-${link.key}`}
                            href={ensureUrlProtocol(link.value)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-2 rounded-lg border border-white/22 bg-white/[0.08] px-3.5 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/[0.16]"
                          >
                            <Icon className="h-3 w-3" />
                            {link.label}
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className={SECTION_CLASS}>
              <p className={`${SECTION_TITLE_CLASS} mt-2 mb-7`}>{t('dashboard.savedLeads.detailModal.metadata')}</p>
              <div className="grid gap-7 lg:grid-cols-2">
                <div className="space-y-5">
                  <div className={SUB_PANEL_CLASS}>
                    <p className={META_LABEL_CLASS}>{t('dashboard.savedLeads.columns.savedAt')}</p>
                    <p className="mt-3 text-lg leading-relaxed text-slate-100">{formatDateTime(lead.savedAt)}</p>
                  </div>
                  <div className={SUB_PANEL_CLASS}>
                    <p className={META_LABEL_CLASS}>{t('dashboard.savedLeads.detailModal.updatedAt')}</p>
                    <p className="mt-3 text-lg leading-relaxed text-slate-100">{formatDateTime(lead.updatedAt)}</p>
                  </div>
                  <div className={SUB_PANEL_CLASS}>
                    <p className={META_LABEL_CLASS}>{t('dashboard.leadTable.source')}</p>
                    <p className="mt-3 text-lg leading-relaxed text-slate-100">
                      {lead.source || t('dashboard.leadTable.defaultSource')}
                    </p>
                  </div>
                  {typeof lead.rating === 'number' ? (
                    <div className={SUB_PANEL_CLASS}>
                      <p className={META_LABEL_CLASS}>{t('dashboard.leadTable.rating')}</p>
                      <p className="mt-3 text-lg leading-relaxed text-slate-100">
                        {lead.rating.toFixed(1)}
                        {typeof lead.reviewCount === 'number' ? ` (${lead.reviewCount})` : ''}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-5">
                  <div className={SUB_PANEL_CLASS}>
                    <p className={META_LABEL_CLASS}>{t('dashboard.savedLeads.detailModal.address')}</p>
                    <p className="mt-3 text-lg leading-relaxed text-slate-100">
                      {lead.address?.full || t('common.notAvailable')}
                    </p>
                    {lead.address?.addressLines?.length ? (
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">{lead.address.addressLines.join(' • ')}</p>
                    ) : null}
                    {lead.geo ? (
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">
                        Lat: {lead.geo.lat.toFixed(5)} • Lng: {lead.geo.lng.toFixed(5)}
                      </p>
                    ) : null}
                  </div>

                  {lead.rawRefs ? (
                    <div className={SUB_PANEL_CLASS}>
                      <p className={META_LABEL_CLASS}>Reference IDs</p>
                      {lead.rawRefs.knowledgeGraphId ? (
                        <p className="mt-3 text-sm leading-relaxed text-slate-200 break-all">KG: {lead.rawRefs.knowledgeGraphId}</p>
                      ) : null}
                      {lead.rawRefs.ownerOrProfileId ? (
                        <p className="mt-3 text-sm leading-relaxed text-slate-200 break-all">
                          Profile: {lead.rawRefs.ownerOrProfileId}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {(lead.hours || lead.attributes) ? (
                <div className="mt-7 grid gap-7 lg:grid-cols-2">
                  {lead.hours ? (
                    <div className={SUB_PANEL_CLASS}>
                      <p className={META_LABEL_CLASS}>{t('dashboard.savedLeads.detailModal.hours')}</p>
                      <div className="mt-4 space-y-3">
                        {lead.hours.statusSummary ? <p className="text-sm text-slate-100">{lead.hours.statusSummary}</p> : null}
                        {lead.hours.statusText ? <p className="text-sm text-slate-300">{lead.hours.statusText}</p> : null}
                        {lead.hours.weeklyHours.map((entry, index) => (
                          <p key={`${lead.savedLeadId}-hours-${index}`} className="text-sm text-slate-200">
                            <span className="font-medium text-slate-100">{entry.day || t('common.notAvailable')}</span>
                            : {entry.hours.join(', ') || t('common.notAvailable')}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {lead.attributes ? (
                    <div className={SUB_PANEL_CLASS}>
                      <p className={META_LABEL_CLASS}>{t('dashboard.savedLeads.detailModal.attributes')}</p>
                      <div className="mt-4 space-y-3">
                        {Object.entries(lead.attributes).map(([key, values]) => (
                          <p key={`${lead.savedLeadId}-attribute-${key}`} className="text-sm text-slate-200">
                            <span className="font-medium text-slate-100">{key}: </span>
                            {values.join(', ')}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
