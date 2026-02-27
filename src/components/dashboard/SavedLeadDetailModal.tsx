import { type CSSProperties, useEffect, useState } from 'react';
import {
  AlertCircle,
  Copy,
  ExternalLink,
  Globe,
  Link as LinkIcon,
  Linkedin,
  Loader2,
  Mail,
  MapPinned,
  Phone,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { toFriendlyErrorFromUnknown, toFriendlyErrorMessage } from '../../lib/errorMessaging';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { AppAlertToast } from '../ui/AppAlertToast';
import { DashboardSelect } from './DashboardSelect';
import { STATUS_VISUALS, TIER_BADGE_STYLES } from './leadVisuals';
import { STATUS_OPTIONS } from './mockData';
import { WebsiteAnalysisModal } from './WebsiteAnalysisModal';
import { LeadStatus, SavedLead } from './types';
import type { AiContactSuggestionChannel } from './api';

const MODAL_OVERLAY_STYLE: CSSProperties = {
  backgroundColor: 'rgba(2, 6, 23, 0.64)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
};

const MODAL_CONTENT_STYLE: CSSProperties = {
  width: 'min(1320px, calc(100vw - 3rem))',
  maxHeight: '92vh',
  overflow: 'hidden',
  padding: 0,
  border: '1px solid rgba(255, 255, 255, 0.14)',
  borderRadius: '1.5rem',
  color: '#F8FAFC',
  background:
    'radial-gradient(120% 160% at 0% 0%, rgba(59, 130, 246, 0.18) 0%, rgba(11, 16, 32, 0.96) 42%), linear-gradient(145deg, rgba(18, 21, 33, 0.98), rgba(11, 16, 32, 0.98))',
  boxShadow: '0 32px 92px rgba(2, 6, 23, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
};

const MODAL_SCROLL_AREA_STYLE: CSSProperties = {
  maxHeight: '92vh',
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '1.6rem',
};

const MODAL_STACK_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const SECTION_CARD_STYLE: CSSProperties = {
  borderRadius: '1.1rem',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03))',
  boxShadow: '0 14px 42px rgba(2, 6, 23, 0.32)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  padding: '1.5rem',
};

const SECTION_LABEL_STYLE: CSSProperties = {
  fontSize: '0.75rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#94A3B8',
  marginBottom: '0.9rem',
  fontWeight: 600,
};

const SECTION_TITLE_STYLE: CSSProperties = {
  fontSize: '1.15rem',
  lineHeight: 1.25,
  fontWeight: 650,
  color: '#F8FAFC',
};

const ANALYSIS_PANEL_STYLE: CSSProperties = {
  marginTop: '1rem',
  borderRadius: '0.95rem',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'rgba(15, 23, 42, 0.48)',
  padding: '0.9rem 1rem',
};

const CONTACT_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '1.25rem',
};

const CONTACT_CARD_BASE_STYLE: CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.42)',
  backgroundColor: 'rgba(255, 255, 255, 0.09)',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.28)',
  transform: 'translateY(0)',
  transition: 'background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
  borderRadius: '0.9rem',
  minHeight: '4.25rem',
  padding: '0.75rem 0.95rem',
};

const CHANNEL_ICON_BOX_STYLE: CSSProperties = {
  width: '2.25rem',
  height: '2.25rem',
  borderRadius: '0.7rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  flexShrink: 0,
  marginRight: '15px',
};

const AI_PANEL_STYLE: CSSProperties = {
  borderRadius: '1rem',
  border: '1px solid rgba(34, 211, 238, 0.25)',
  background:
    'linear-gradient(145deg, rgba(15, 23, 42, 0.74), rgba(11, 16, 32, 0.74)), radial-gradient(110% 140% at 0% 0%, rgba(34, 211, 238, 0.14) 0%, rgba(0, 0, 0, 0) 45%)',
  padding: '1rem',
};

const AI_SUGGESTION_BOX_STYLE: CSSProperties = {
  marginTop: '0.85rem',
  borderRadius: '0.85rem',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  background: 'rgba(2, 6, 23, 0.48)',
  padding: '0.95rem',
};

const METADATA_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '0.85rem',
};

const METADATA_CARD_STYLE: CSSProperties = {
  borderRadius: '0.9rem',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'rgba(15, 23, 42, 0.42)',
  padding: '0.85rem 0.95rem',
};

const META_LABEL_STYLE: CSSProperties = {
  fontSize: '0.72rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#64748B',
  marginBottom: '0.35rem',
  fontWeight: 600,
};

const FIGMA_BUTTON_BASE_STYLE: CSSProperties = {
  minHeight: '2.5rem',
  padding: '0.55rem 1rem',
  borderRadius: '0.8rem',
  border: '1px solid transparent',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.45rem',
  fontSize: '0.78rem',
  fontWeight: 600,
  lineHeight: 1.2,
  transition: 'transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease, border-color 160ms ease, background 160ms ease',
};

const FIGMA_BUTTON_VARIANTS = {
  primary: {
    borderColor: 'rgba(125, 211, 252, 0.6)',
    background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.92) 0%, rgba(168, 85, 247, 0.92) 100%)',
    color: '#ffffff',
    boxShadow: '0 10px 24px rgba(59, 130, 246, 0.34)',
  },
  secondary: {
    borderColor: 'rgba(148, 163, 184, 0.46)',
    background: 'rgba(15, 23, 42, 0.62)',
    color: '#e2e8f0',
    boxShadow: '0 8px 20px rgba(2, 6, 23, 0.34)',
  },
  danger: {
    borderColor: 'rgba(248, 113, 113, 0.58)',
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fee2e2',
    boxShadow: '0 8px 20px rgba(127, 29, 29, 0.3)',
  },
  selected: {
    borderColor: 'rgba(125, 211, 252, 0.72)',
    background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.32), rgba(168, 85, 247, 0.3))',
    color: '#e0f2fe',
    boxShadow: '0 10px 24px rgba(59, 130, 246, 0.28)',
  },
} as const;

const AI_CONTACT_CHANNELS: Array<{
  channel: AiContactSuggestionChannel;
  labelKey: string;
}> = [
  { channel: 'email', labelKey: 'dashboard.savedLeads.detailModal.aiContact.channels.email' },
  { channel: 'linkedin', labelKey: 'dashboard.savedLeads.detailModal.aiContact.channels.linkedin' },
  { channel: 'phone', labelKey: 'dashboard.savedLeads.detailModal.aiContact.channels.phone' },
];

const NO_WEBSITE_PROBLEM_KEYS = new Set(['no website', 'no website linked']);

const copyToClipboard = async (value: string): Promise<boolean> => {
  if (!value.trim()) {
    return false;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback below.
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
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
  canUseAiEvaluations?: boolean;
  websiteAnalysisLoading?: boolean;
  aiSummaryLoading?: boolean;
  aiContactSuggestionLoadingByChannel?: Partial<Record<AiContactSuggestionChannel, boolean>>;
  onClose: () => void;
  onStatusChange: (lead: SavedLead, status: LeadStatus) => void;
  onDelete: (savedLeadId: string) => void;
  onRunWebsiteAnalysis?: (lead: SavedLead) => Promise<void> | void;
  onRemoveWebsiteAnalysis?: (lead: SavedLead) => Promise<void> | void;
  onGenerateAiSummary?: (lead: SavedLead) => Promise<void> | void;
  onGenerateAiContactSuggestion?: (
    lead: SavedLead,
    channel: AiContactSuggestionChannel,
  ) => Promise<void> | void;
  onNavigateBilling?: () => void;
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

type FigmaButtonVariant = keyof typeof FIGMA_BUTTON_VARIANTS;

const getFigmaButtonStyle = (variant: FigmaButtonVariant): CSSProperties => ({
  ...FIGMA_BUTTON_BASE_STYLE,
  ...FIGMA_BUTTON_VARIANTS[variant],
});

const setFigmaButtonHoverState = (element: HTMLElement, isHover: boolean, variant: FigmaButtonVariant): void => {
  if (variant === 'danger') {
    element.style.background = isHover ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)';
    element.style.borderColor = isHover ? 'rgba(252, 165, 165, 0.85)' : 'rgba(248, 113, 113, 0.58)';
    element.style.boxShadow = isHover
      ? '0 14px 30px rgba(127, 29, 29, 0.38)'
      : '0 8px 20px rgba(127, 29, 29, 0.3)';
    element.style.transform = isHover ? 'translateY(-1px)' : 'translateY(0)';
    return;
  }

  if (variant === 'secondary') {
    element.style.background = isHover ? 'rgba(30, 41, 59, 0.84)' : 'rgba(15, 23, 42, 0.62)';
    element.style.borderColor = isHover ? 'rgba(191, 219, 254, 0.72)' : 'rgba(148, 163, 184, 0.46)';
    element.style.boxShadow = isHover
      ? '0 12px 26px rgba(15, 23, 42, 0.45)'
      : '0 8px 20px rgba(2, 6, 23, 0.34)';
    element.style.transform = isHover ? 'translateY(-1px)' : 'translateY(0)';
    return;
  }

  if (variant === 'selected') {
    element.style.background = isHover
      ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.4), rgba(168, 85, 247, 0.36))'
      : 'linear-gradient(90deg, rgba(59, 130, 246, 0.32), rgba(168, 85, 247, 0.3))';
    element.style.borderColor = isHover ? 'rgba(186, 230, 253, 0.88)' : 'rgba(125, 211, 252, 0.72)';
    element.style.boxShadow = isHover
      ? '0 14px 30px rgba(59, 130, 246, 0.36)'
      : '0 10px 24px rgba(59, 130, 246, 0.28)';
    element.style.transform = isHover ? 'translateY(-1px)' : 'translateY(0)';
    return;
  }

  element.style.background = isHover
    ? 'linear-gradient(90deg, rgba(59, 130, 246, 1) 0%, rgba(168, 85, 247, 1) 100%)'
    : 'linear-gradient(90deg, rgba(59, 130, 246, 0.92) 0%, rgba(168, 85, 247, 0.92) 100%)';
  element.style.borderColor = isHover ? 'rgba(186, 230, 253, 0.9)' : 'rgba(125, 211, 252, 0.6)';
  element.style.boxShadow = isHover
    ? '0 14px 30px rgba(59, 130, 246, 0.45)'
    : '0 10px 24px rgba(59, 130, 246, 0.34)';
  element.style.transform = isHover ? 'translateY(-1px)' : 'translateY(0)';
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

const getChannelIconStyle = (channelType: string): CSSProperties => {
  if (channelType === 'email') {
    return {
      ...CHANNEL_ICON_BOX_STYLE,
      borderColor: 'rgba(96, 165, 250, 0.35)',
      background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.22), rgba(168, 85, 247, 0.2))',
      color: '#bfdbfe',
    };
  }
  if (channelType === 'phone') {
    return {
      ...CHANNEL_ICON_BOX_STYLE,
      borderColor: 'rgba(52, 211, 153, 0.35)',
      background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.2), rgba(34, 211, 238, 0.2))',
      color: '#6ee7b7',
    };
  }
  if (channelType === 'linkedin') {
    return {
      ...CHANNEL_ICON_BOX_STYLE,
      borderColor: 'rgba(59, 130, 246, 0.35)',
      background: 'linear-gradient(145deg, rgba(37, 99, 235, 0.2), rgba(59, 130, 246, 0.2))',
      color: '#93c5fd',
    };
  }
  if (channelType === 'maps') {
    return {
      ...CHANNEL_ICON_BOX_STYLE,
      borderColor: 'rgba(251, 113, 133, 0.35)',
      background: 'linear-gradient(145deg, rgba(244, 63, 94, 0.2), rgba(251, 146, 60, 0.2))',
      color: '#fda4af',
    };
  }

  return {
    ...CHANNEL_ICON_BOX_STYLE,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    background: 'rgba(148, 163, 184, 0.18)',
    color: '#cbd5e1',
  };
};

export function SavedLeadDetailModal({
  lead,
  open,
  scoreDenominator,
  statusUpdating,
  deleting,
  canUseAiEvaluations = false,
  websiteAnalysisLoading = false,
  aiSummaryLoading = false,
  aiContactSuggestionLoadingByChannel,
  onClose,
  onStatusChange,
  onDelete,
  onRunWebsiteAnalysis,
  onRemoveWebsiteAnalysis,
  onGenerateAiSummary,
  onGenerateAiContactSuggestion,
  onNavigateBilling,
}: SavedLeadDetailModalProps) {
  const { t, tm } = useI18n();
  const [isWebsiteAnalysisOpen, setIsWebsiteAnalysisOpen] = useState(false);
  const [selectedAiChannel, setSelectedAiChannel] = useState<AiContactSuggestionChannel>('email');
  const [aiSuggestionError, setAiSuggestionError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [copySuccessMessage, setCopySuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedAiChannel('email');
    setAiSuggestionError(null);
    setShowUpgradePrompt(false);
    setCopySuccessMessage(null);
  }, [lead?.savedLeadId]);

  if (!lead) {
    return null;
  }

  const selectedSuggestion =
    typeof lead.contactAiSuggestions?.[selectedAiChannel] === 'string'
      ? lead.contactAiSuggestions[selectedAiChannel]
      : '';
  const hasWebsiteAnalysis = !!lead.websiteAnalysis;
  const canGenerateWithoutWebsiteAnalysis = lead.problems.some((problem) =>
    NO_WEBSITE_PROBLEM_KEYS.has(problem.trim().toLowerCase()),
  );
  const isAiPlanLocked = !canUseAiEvaluations;
  const canGenerateAiContact =
    (hasWebsiteAnalysis || canGenerateWithoutWebsiteAnalysis) &&
    !isAiPlanLocked &&
    typeof onGenerateAiContactSuggestion === 'function';
  const anyAiContactSuggestionLoading = Object.values(aiContactSuggestionLoadingByChannel ?? {}).some(Boolean);
  const isSelectedAiChannelLoading = !!aiContactSuggestionLoadingByChannel?.[selectedAiChannel];

  const requestAiSuggestion = async () => {
    const channel = selectedAiChannel;
    if (isAiPlanLocked) {
      setAiSuggestionError(t('dashboard.savedLeads.aiUpgradeRequired'));
      setShowUpgradePrompt(true);
      return;
    }

    if (
      !onGenerateAiContactSuggestion ||
      (!hasWebsiteAnalysis && !canGenerateWithoutWebsiteAnalysis)
    ) {
      return;
    }

    setAiSuggestionError(null);
    setCopySuccessMessage(null);
    setShowUpgradePrompt(false);
    try {
      await onGenerateAiContactSuggestion(lead, channel);
      setCopySuccessMessage(null);
    } catch (error) {
      const message = toFriendlyErrorFromUnknown(
        error,
        t('dashboard.savedLeads.detailModal.aiContact.errors.default'),
      );
      setAiSuggestionError(message);
      if (/insufficient|remaining|token|limit|feature|plan/i.test(message)) {
        setShowUpgradePrompt(true);
      }
    }
  };

  const handleCopySuggestion = async () => {
    const copied = await copyToClipboard(selectedSuggestion);
    if (copied) {
      setAiSuggestionError(null);
      setCopySuccessMessage(t('dashboard.savedLeads.detailModal.aiContact.copySuccess'));
      return;
    }
    setAiSuggestionError(
      toFriendlyErrorMessage(t('dashboard.savedLeads.detailModal.aiContact.errors.copyFailed')),
    );
  };

  const directLinks = [
    lead.websiteUrl
      ? { key: 'website', label: t('leadCard.website'), value: lead.websiteUrl, icon: Globe }
      : null,
    lead.mapsUrl ? { key: 'maps', label: 'Maps', value: lead.mapsUrl, icon: MapPinned } : null,
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
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <DialogContent overlayStyle={MODAL_OVERLAY_STYLE} className="text-white" style={MODAL_CONTENT_STYLE}>
        <div className="saved-lead-detail-scroll" style={MODAL_SCROLL_AREA_STYLE}>
          <div style={MODAL_STACK_STYLE}>
            <section style={SECTION_CARD_STYLE}>
              <p style={SECTION_LABEL_STYLE}>{t('dashboard.savedLeads.columns.business')}</p>

              <DialogHeader className="text-left" style={{ marginBottom: '1rem' }}>
                <DialogTitle className="font-semibold tracking-tight text-white" style={{ fontSize: '2rem', lineHeight: 1.15 }}>
                  {lead.businessName}
                </DialogTitle>
                <DialogDescription className="text-slate-300" style={{ fontSize: '1rem' }}>
                  {lead.category} • {lead.location}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center" style={{ gap: '0.65rem', marginBottom: '1rem' }}>
                <span
                  className={`rounded-full px-4 text-sm font-medium ${TIER_BADGE_STYLES[lead.tier]}`}
                  style={{
                    minHeight: '2.3rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {tm('leadTierLabels', lead.tier)} ({tm('leadTiers', lead.tier)})
                </span>
                <span
                  className="rounded-full border px-4 text-sm text-slate-100"
                  style={{
                    minHeight: '2.3rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1.2,
                    fontWeight: 500,
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.17), rgba(168, 85, 247, 0.17))',
                  }}
                >
                  {t('dashboard.leadTable.score')}: {toDisplayScore(lead.score, scoreDenominator)}
                </span>
              </div>

              <div className="flex flex-wrap items-center" style={{ gap: '0.75rem' }}>
                <div style={{ minWidth: '200px' }}>
                  <DashboardSelect
                    value={lead.status}
                    onValueChange={(value) => onStatusChange(lead, value as LeadStatus)}
                    options={STATUS_OPTIONS.map((status) => ({
                      value: status,
                      label: tm('leadStatuses', status),
                    }))}
                    size="compact"
                    triggerClassName="rounded-lg text-sm"
                    triggerStyleOverride={{
                      ...STATUS_VISUALS[lead.status].triggerStyle,
                      minWidth: '180px',
                      borderRadius: '0.65rem',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.875rem',
                      lineHeight: 1.2,
                    }}
                    contentStyleOverride={{
                      minWidth: '180px',
                    }}
                    getOptionClassName={(status) => STATUS_VISUALS[status as LeadStatus]?.optionClassName ?? ''}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(lead.savedLeadId)}
                  disabled={deleting}
                  className="inline-flex items-center rounded-lg text-xs font-medium transition disabled:cursor-not-allowed"
                  style={{
                    ...getFigmaButtonStyle('danger'),
                    minWidth: '7.5rem',
                    opacity: deleting ? 0.6 : 1,
                  }}
                  onMouseEnter={(event) => setFigmaButtonHoverState(event.currentTarget, true, 'danger')}
                  onMouseLeave={(event) => setFigmaButtonHoverState(event.currentTarget, false, 'danger')}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="spin-loader h-3.5 w-3.5" />
                      {t('dashboard.savedLeads.removing')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('dashboard.savedLeads.remove')}
                    </>
                  )}
                </button>
              </div>

              {statusUpdating ? (
                <p className="text-sm text-slate-300" style={{ marginTop: '0.7rem' }}>
                  {t('dashboard.savedLeads.updatingStatus')}
                </p>
              ) : null}

              {lead.websiteUrl ? (
                <div style={ANALYSIS_PANEL_STYLE}>
                  <div className="flex flex-wrap items-center justify-between" style={{ gap: '0.7rem' }}>
                    <div
                      className="inline-flex items-center text-sm text-slate-300"
                      style={{ gap: '0.5rem', maxWidth: '100%' }}
                    >
                      <Globe className="h-4 w-4" />
                      <span style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        {lead.websiteDisplay || lead.websiteUrl}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center" style={{ gap: '0' }}>
                      {lead.websiteAnalysis ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsWebsiteAnalysisOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                            style={{
                              ...getFigmaButtonStyle('primary'),
                              marginTop: '10px',
                              marginBottom: '10px',
                              marginRight: '10px',
                            }}
                            onMouseEnter={(event) => setFigmaButtonHoverState(event.currentTarget, true, 'primary')}
                            onMouseLeave={(event) => setFigmaButtonHoverState(event.currentTarget, false, 'primary')}
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
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                            style={{
                              ...getFigmaButtonStyle('primary'),
                              marginTop: '10px',
                              marginBottom: '10px',
                              marginRight: '10px',
                            }}
                            onMouseEnter={(event) => setFigmaButtonHoverState(event.currentTarget, true, 'primary')}
                            onMouseLeave={(event) => setFigmaButtonHoverState(event.currentTarget, false, 'primary')}
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
                          {!websiteAnalysisLoading ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onRemoveWebsiteAnalysis) {
                                  void onRemoveWebsiteAnalysis(lead);
                                }
                              }}
                              disabled={!onRemoveWebsiteAnalysis}
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                              style={{
                                ...getFigmaButtonStyle('danger'),
                                marginTop: '10px',
                                marginBottom: '10px',
                                marginRight: '10px',
                              }}
                              onMouseEnter={(event) => setFigmaButtonHoverState(event.currentTarget, true, 'danger')}
                              onMouseLeave={(event) => setFigmaButtonHoverState(event.currentTarget, false, 'danger')}
                            >
                              {t('dashboard.websiteAnalysis.removeAnalysis')}
                            </button>
                          ) : null}
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
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                          style={getFigmaButtonStyle('primary')}
                          onMouseEnter={(event) => setFigmaButtonHoverState(event.currentTarget, true, 'primary')}
                          onMouseLeave={(event) => setFigmaButtonHoverState(event.currentTarget, false, 'primary')}
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
                  </div>
                </div>
              ) : null}
            </section>

            <section style={SECTION_CARD_STYLE}>
              <h2 style={SECTION_TITLE_STYLE}>{t('dashboard.savedLeads.detailModal.contactAndLinks')}</h2>
              <div style={CONTACT_GRID_STYLE}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <h3 className="text-base font-semibold text-slate-100">
                    {t('dashboard.savedLeads.detailModal.problemsAndReason')}
                  </h3>

                  <div className="flex flex-wrap" style={{ gap: '0.55rem' }}>
                    {lead.problems.length > 0 ? (
                      lead.problems.map((problem) => (
                        <span
                          key={`${lead.savedLeadId}-${problem}`}
                          className="px-3 py-1 rounded-lg bg-red-500/10 text-red-300 text-xs font-medium border border-red-500/20"
                        >
                          {tm('problemCategories', problem)}
                        </span>
                      ))
                    ) : (
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs font-medium border border-emerald-500/20">
                        {t('dashboard.savedLeads.detailModal.noProblemsDetected')}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '0.85rem',
                      background: 'rgba(15, 23, 42, 0.42)',
                      padding: '0.85rem 0.95rem',
                    }}
                  >
                    <p className="text-sm leading-relaxed text-slate-100">
                      {lead.explanation || t('common.notAvailable')}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h3 className="text-base font-semibold text-slate-100">
                    {t('dashboard.savedLeads.detailModal.contactAndLinks')}
                  </h3>

                  {lead.contactChannels.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.55rem' }}>
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

                        const content = (
                          <>
                            <span style={getChannelIconStyle(channelType)}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 text-left" style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span className="text-xs text-slate-400">{label}</span>
                              <span className="text-sm text-slate-100 break-all">
                                {displayValue || t('dashboard.leadTable.noValueProvided')}
                              </span>
                            </span>
                            <ExternalLink className="h-4 w-4 text-slate-400" style={{ marginLeft: 'auto' }} />
                          </>
                        );

                        if (!href) {
                          return (
                            <button
                              key={`${lead.savedLeadId}-${rawChannel}`}
                              type="button"
                              className="inline-flex w-full items-center"
                              style={CONTACT_CARD_BASE_STYLE}
                              onMouseEnter={(event) => setInteractiveHoverState(event.currentTarget, true)}
                              onMouseLeave={(event) => setInteractiveHoverState(event.currentTarget, false)}
                            >
                              {content}
                            </button>
                          );
                        }

                        return (
                          <a
                            key={`${lead.savedLeadId}-${rawChannel}`}
                            href={href}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex w-full items-center"
                            style={CONTACT_CARD_BASE_STYLE}
                            onMouseEnter={(event) => setInteractiveHoverState(event.currentTarget, true)}
                            onMouseLeave={(event) => setInteractiveHoverState(event.currentTarget, false)}
                          >
                            {content}
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300">{t('common.notAvailable')}</p>
                  )}

                  {lead.contactChannels.length === 0 && directLinks.length > 0 ? (
                    <div className="flex flex-wrap" style={{ gap: '0.5rem' }}>
                      {directLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <a
                            key={`${lead.savedLeadId}-${link.key}`}
                            href={ensureUrlProtocol(link.value)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 transition"
                            style={CONTACT_CARD_BASE_STYLE}
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

            <section style={SECTION_CARD_STYLE}>
              <h2 style={{ ...SECTION_TITLE_STYLE, marginBottom: '20px' }}>
                {t('dashboard.savedLeads.detailModal.aiContact.title')}
              </h2>
              <div style={AI_PANEL_STYLE}>
                <div className="flex items-start justify-between" style={{ gap: '0.75rem' }}>
                  <div className="inline-flex items-start" style={{ gap: '0.65rem' }}>
                    <span
                      style={{
                        width: '1.95rem',
                        height: '1.95rem',
                        borderRadius: '0.65rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #3B82F6 0%, #A855F7 100%)',
                        boxShadow: '0 10px 24px rgba(59, 130, 246, 0.36)',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-cyan-50">
                        {t('dashboard.savedLeads.detailModal.aiContact.title')}
                      </h3>
                      <p className="text-xs text-cyan-100/80" style={{ marginTop: '0.2rem' }}>
                        {t('dashboard.savedLeads.detailModal.aiContact.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap" style={{ gap: '0.55rem', marginTop: '0.95rem' }}>
                  {AI_CONTACT_CHANNELS.map(({ channel, labelKey }) => {
                    const isSelected = selectedAiChannel === channel;
                    const buttonVariant: FigmaButtonVariant = isSelected ? 'selected' : 'secondary';

                    return (
                      <button
                        key={`${lead.savedLeadId}-ai-contact-${channel}`}
                        type="button"
                        disabled={
                          isAiPlanLocked ||
                          (!hasWebsiteAnalysis && !canGenerateWithoutWebsiteAnalysis) ||
                          anyAiContactSuggestionLoading
                        }
                        onClick={() => {
                          setSelectedAiChannel(channel);
                          setAiSuggestionError(null);
                          setCopySuccessMessage(null);
                        }}
                        title={
                          isAiPlanLocked
                            ? t('dashboard.savedLeads.aiUpgradeRequired')
                            : !hasWebsiteAnalysis && !canGenerateWithoutWebsiteAnalysis
                              ? t('dashboard.savedLeads.detailModal.aiContact.runWebsiteAnalysisFirst')
                              : undefined
                        }
                        className="inline-flex items-center rounded-lg text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55"
                        style={{
                          ...getFigmaButtonStyle(buttonVariant),
                          minWidth: '8.6rem',
                        }}
                        onMouseEnter={(event) =>
                          setFigmaButtonHoverState(event.currentTarget, true, buttonVariant)
                        }
                        onMouseLeave={(event) =>
                          setFigmaButtonHoverState(event.currentTarget, false, buttonVariant)
                        }
                      >
                        {t(labelKey)}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap" style={{ gap: '0.55rem', marginTop: '0.8rem' }}>
                  <button
                    type="button"
                    disabled={isAiPlanLocked || !canGenerateAiContact || anyAiContactSuggestionLoading}
                    onClick={() => {
                      void requestAiSuggestion();
                    }}
                    title={
                      isAiPlanLocked
                        ? t('dashboard.savedLeads.aiUpgradeRequired')
                        : !hasWebsiteAnalysis && !canGenerateWithoutWebsiteAnalysis
                          ? t('dashboard.savedLeads.detailModal.aiContact.runWebsiteAnalysisFirst')
                          : undefined
                    }
                    className="inline-flex items-center rounded-lg text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55"
                    style={{
                      ...getFigmaButtonStyle('primary'),
                      minWidth: '8.8rem',
                    }}
                    onMouseEnter={(event) => setFigmaButtonHoverState(event.currentTarget, true, 'primary')}
                    onMouseLeave={(event) => setFigmaButtonHoverState(event.currentTarget, false, 'primary')}
                  >
                    {isSelectedAiChannelLoading ? <Loader2 className="spin-loader h-3.5 w-3.5" /> : null}
                    {isSelectedAiChannelLoading ? 'Generating...' : 'Generate'}
                  </button>
                </div>

                {isAiPlanLocked ? (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      border: '1px solid rgba(167, 139, 250, 0.38)',
                      borderRadius: '0.75rem',
                      background:
                        'linear-gradient(120deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))',
                      padding: '0.6rem 0.7rem',
                    }}
                  >
                    <p className="text-xs text-violet-100">
                      {t('dashboard.savedLeads.aiUpgradeRequired')}
                    </p>
                  </div>
                ) : null}

                {!hasWebsiteAnalysis && !canGenerateWithoutWebsiteAnalysis ? (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      border: '1px solid rgba(251, 191, 36, 0.28)',
                      borderRadius: '0.75rem',
                      background: 'rgba(245, 158, 11, 0.08)',
                      padding: '0.55rem 0.7rem',
                    }}
                  >
                    <p className="text-xs text-amber-200">
                      {t('dashboard.savedLeads.detailModal.aiContact.runWebsiteAnalysisFirst')}
                    </p>
                  </div>
                ) : null}

                {!hasWebsiteAnalysis && canGenerateWithoutWebsiteAnalysis ? (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      border: '1px solid rgba(125, 211, 252, 0.34)',
                      borderRadius: '0.75rem',
                      background: 'rgba(14, 116, 144, 0.14)',
                      padding: '0.55rem 0.7rem',
                    }}
                  >
                    <p className="text-xs text-cyan-100">
                      {t('dashboard.savedLeads.detailModal.aiContact.noWebsiteMode')}
                    </p>
                  </div>
                ) : null}

                {(showUpgradePrompt || isAiPlanLocked) && onNavigateBilling ? (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      border: '1px solid rgba(167, 139, 250, 0.38)',
                      borderRadius: '0.75rem',
                      background:
                        'linear-gradient(120deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))',
                      padding: '0.6rem 0.7rem',
                    }}
                  >
                    <div className="inline-flex items-start" style={{ gap: '0.45rem' }}>
                      <AlertCircle className="h-4 w-4 text-violet-200" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                      <div>
                        <p className="text-xs text-violet-100" style={{ marginBottom: '0.45rem' }}>
                          {t('dashboard.savedLeads.detailModal.aiContact.upgradeCta')}
                        </p>
                        <button
                          type="button"
                          onClick={onNavigateBilling}
                          className="inline-flex items-center rounded-lg text-xs font-medium transition"
                          style={getFigmaButtonStyle('primary')}
                          onMouseEnter={(event) => setFigmaButtonHoverState(event.currentTarget, true, 'primary')}
                          onMouseLeave={(event) => setFigmaButtonHoverState(event.currentTarget, false, 'primary')}
                        >
                          {t('dashboard.savedLeads.detailModal.aiContact.upgradeCta')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div style={AI_SUGGESTION_BOX_STYLE}>
                  {selectedSuggestion ? (
                    <>
                      <div className="flex items-center justify-between" style={{ gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <span className="text-xs font-medium text-slate-300">
                          {t(
                            AI_CONTACT_CHANNELS.find((entry) => entry.channel === selectedAiChannel)?.labelKey ??
                              'dashboard.savedLeads.detailModal.aiContact.channels.email',
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void handleCopySuggestion();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition"
                          style={getFigmaButtonStyle('secondary')}
                          onMouseEnter={(event) => setFigmaButtonHoverState(event.currentTarget, true, 'secondary')}
                          onMouseLeave={(event) => setFigmaButtonHoverState(event.currentTarget, false, 'secondary')}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {t('dashboard.savedLeads.detailModal.aiContact.copy')}
                        </button>
                      </div>

                      <p className="text-sm text-slate-100" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {selectedSuggestion}
                      </p>

                      {copySuccessMessage ? (
                        <span className="text-xs text-emerald-200" style={{ display: 'inline-block', marginTop: '0.6rem' }}>
                          {copySuccessMessage}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-slate-300">
                      {t('dashboard.savedLeads.detailModal.aiContact.empty')}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section style={SECTION_CARD_STYLE}>
              <h2 style={SECTION_TITLE_STYLE}>{t('dashboard.savedLeads.detailModal.metadata')}</h2>
              <div style={METADATA_GRID_STYLE}>
                <div style={METADATA_CARD_STYLE}>
                  <p style={META_LABEL_STYLE}>{t('dashboard.savedLeads.columns.savedAt')}</p>
                  <p className="text-sm text-slate-100">{formatDateTime(lead.savedAt)}</p>
                </div>

                <div style={METADATA_CARD_STYLE}>
                  <p style={META_LABEL_STYLE}>{t('dashboard.savedLeads.detailModal.updatedAt')}</p>
                  <p className="text-sm text-slate-100">{formatDateTime(lead.updatedAt)}</p>
                </div>

                <div style={METADATA_CARD_STYLE}>
                  <p style={META_LABEL_STYLE}>{t('dashboard.leadTable.source')}</p>
                  <p className="text-sm text-slate-100">{lead.source || t('dashboard.leadTable.defaultSource')}</p>
                </div>

                {typeof lead.rating === 'number' ? (
                  <div style={METADATA_CARD_STYLE}>
                    <p style={META_LABEL_STYLE}>{t('dashboard.leadTable.rating')}</p>
                    <div className="inline-flex items-center" style={{ gap: '0.35rem' }}>
                      <Star className="h-4 w-4 text-amber-300" />
                      <span className="text-sm text-slate-100">
                        {lead.rating.toFixed(1)}
                        {typeof lead.reviewCount === 'number' ? ` (${lead.reviewCount})` : ''}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div style={{ ...METADATA_CARD_STYLE, gridColumn: '1 / -1' }}>
                  <p style={META_LABEL_STYLE}>{t('dashboard.savedLeads.detailModal.address')}</p>
                  <p className="text-sm text-slate-100">{lead.address?.full || t('common.notAvailable')}</p>
                  {lead.geo ? (
                    <p className="text-xs text-slate-300" style={{ marginTop: '0.3rem' }}>
                      Lat: {lead.geo.lat.toFixed(5)} • Lng: {lead.geo.lng.toFixed(5)}
                    </p>
                  ) : null}
                </div>

                {lead.hours ? (
                  <div style={{ ...METADATA_CARD_STYLE, gridColumn: '1 / -1' }}>
                    <p style={META_LABEL_STYLE}>{t('dashboard.savedLeads.detailModal.hours')}</p>
                    {lead.hours.statusSummary ? <p className="text-xs text-slate-100">{lead.hours.statusSummary}</p> : null}
                    {lead.hours.statusText ? (
                      <p className="text-xs text-slate-300" style={{ marginTop: '0.2rem' }}>
                        {lead.hours.statusText}
                      </p>
                    ) : null}
                    <div style={{ marginTop: '0.45rem', display: 'grid', gap: '0.2rem' }}>
                      {lead.hours.weeklyHours.map((entry, index) => (
                        <p key={`${lead.savedLeadId}-hours-${index}`} className="text-xs text-slate-200">
                          <span className="font-medium text-slate-100">{entry.day || t('common.notAvailable')}</span>
                          : {entry.hours.join(', ') || t('common.notAvailable')}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}

                {lead.attributes ? (
                  <div style={{ ...METADATA_CARD_STYLE, gridColumn: '1 / -1' }}>
                    <p style={META_LABEL_STYLE}>{t('dashboard.savedLeads.detailModal.attributes')}</p>
                    <div style={{ display: 'grid', gap: '0.2rem' }}>
                      {Object.entries(lead.attributes).map(([key, values]) => (
                        <p key={`${lead.savedLeadId}-attribute-${key}`} className="text-xs text-slate-200">
                          <span className="font-medium text-slate-100">{key}: </span>
                          {values.join(', ')}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>

        <style>{`
          .saved-lead-detail-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .saved-lead-detail-scroll::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 6px;
          }
          .saved-lead-detail-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.35);
            border-radius: 6px;
          }
          .saved-lead-detail-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(148, 163, 184, 0.5);
          }
        `}</style>
        </DialogContent>

        <WebsiteAnalysisModal
          open={isWebsiteAnalysisOpen}
          onClose={() => setIsWebsiteAnalysisOpen(false)}
          analysis={lead.websiteAnalysis ?? null}
          businessName={lead.businessName}
          aiSummary={lead.websiteAiSummary}
          aiSummaryLoading={aiSummaryLoading}
          aiSummaryLocked={!canUseAiEvaluations}
          onGenerateAiSummary={
            onGenerateAiSummary
              ? async () => {
                  await onGenerateAiSummary(lead);
                }
              : undefined
          }
          onNavigateBilling={onNavigateBilling}
        />
      </Dialog>
      <AppAlertToast
        message={aiSuggestionError}
        onClose={() => setAiSuggestionError(null)}
        variant="error"
      />
    </>
  );
}
