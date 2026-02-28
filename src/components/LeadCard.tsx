import { Globe, Mail, MapPinned, Phone, Star } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useI18n } from '../i18n';

type LeadTier = 'Most Valuable' | 'Probable';
type LeadContactType = 'phone' | 'website' | 'maps';

interface Lead {
  businessName: string;
  category: string;
  city: string;
  problems: string[];
  explanation: string;
  tier?: LeadTier;
  score?: number;
  contacts?: Array<{
    type: LeadContactType;
    value: string;
  }>;
}

interface LeadCardProps {
  lead: Lead;
  compact?: boolean;
}

export function LeadCard({ lead, compact = false }: LeadCardProps) {
  const { t } = useI18n();
  const compactContacts = (lead.contacts ?? []).slice(0, 3);
  const cardClassName = compact
    ? 'rounded-2xl bg-[#0d1527]/88 transition-none overflow-hidden'
    : 'bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all group';
  const compactCardStyle: CSSProperties | undefined = compact
    ? {
        background:
          'linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.78) 48%, rgba(37, 99, 235, 0.18))',
        border: '1px solid rgba(125, 211, 252, 0.34)',
        boxShadow:
          '0 0 0 1px rgba(59, 130, 246, 0.18), 0 18px 40px rgba(2, 6, 23, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(56, 189, 248, 0.18)',
        padding: '24px',
      }
    : undefined;

  return (
    <div className={cardClassName} style={compactCardStyle}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">{lead.businessName}</h3>
          <p className="text-sm text-gray-400">
            {lead.category} • {lead.city}
          </p>
        </div>
        {lead.tier && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              lead.tier === 'Most Valuable'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}
          >
            {t(`leadCard.tiers.${lead.tier}`)}
          </span>
        )}
      </div>

      {lead.problems.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {lead.problems.map((problem, index) => (
            <span
              key={`${problem}-${index}`}
              className="px-3 py-1 rounded-lg bg-red-500/10 text-red-300 text-xs font-medium border border-red-500/20"
            >
              {problem}
            </span>
          ))}
        </div>
      ) : (
        <div className="mb-4">
          <span className="inline-flex rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            {t('leadCard.noActiveProblems')}
          </span>
        </div>
      )}

      {compact && (lead.tier || typeof lead.score === 'number') ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          {lead.tier ? (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                lead.tier === 'Most Valuable'
                  ? 'border border-purple-500/35 bg-purple-500/15 text-purple-200'
                  : 'border border-blue-500/35 bg-blue-500/15 text-blue-200'
              }`}
            >
              {t(`leadCard.tiers.${lead.tier}`)}
            </span>
          ) : null}
          {typeof lead.score === 'number' ? (
            <span className="text-xs text-gray-300">
              <span className="text-gray-400">{t('dashboard.leadTable.score')} </span>
              <span className="font-semibold text-white">{lead.score}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      {compact && compactContacts.length > 0 ? (
        <div className="mb-1 grid gap-2 sm:grid-cols-3">
          {compactContacts.map((contact, index) => {
            const Icon =
              contact.type === 'phone' ? Phone : contact.type === 'maps' ? MapPinned : Globe;
            const label =
              contact.type === 'phone'
                ? t('leadCard.phone')
                : contact.type === 'maps'
                  ? 'Maps'
                  : t('leadCard.website');

            return (
              <div
                key={`${contact.type}-${contact.value}-${index}`}
                className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </div>
                <p className="truncate text-xs text-gray-200">{contact.value}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {!compact && (
        <>
          <div className="mb-4 p-4 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">{t('leadCard.reasonTitle')}</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{lead.explanation}</p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-white/5">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition-all group-hover:scale-105">
              <Mail className="w-4 h-4" />
              {t('leadCard.email')}
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition-all group-hover:scale-105">
              <Phone className="w-4 h-4" />
              {t('leadCard.phone')}
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition-all group-hover:scale-105">
              <Globe className="w-4 h-4" />
              {t('leadCard.website')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
