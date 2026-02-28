import { useI18n } from '../../i18n';
import { LeadTier } from './types';

interface TierOverviewCardsProps {
  counts: Record<LeadTier, number>;
  totalLeads: number;
  activeTier: LeadTier | 'All';
  onSelectTier: (tier: LeadTier | 'All') => void;
  maxFoundNotice?: string | null;
}

const getTierTitleKey = (tier: LeadTier): string => {
  if (tier === 'Tier 1') {
    return 'dashboard.tierCards.tier1Title';
  }

  if (tier === 'Tier 2') {
    return 'dashboard.tierCards.tier2Title';
  }

  return 'dashboard.tierCards.tier3Title';
};

const getTierSubtitleKey = (tier: LeadTier): string => {
  if (tier === 'Tier 1') {
    return 'dashboard.tierCards.tier1Subtitle';
  }

  if (tier === 'Tier 2') {
    return 'dashboard.tierCards.tier2Subtitle';
  }

  return 'dashboard.tierCards.tier3Subtitle';
};

const getTierDefinitionKey = (tier: LeadTier): string => {
  if (tier === 'Tier 1') {
    return 'dashboard.tierCards.tier1Definition';
  }

  if (tier === 'Tier 2') {
    return 'dashboard.tierCards.tier2Definition';
  }

  return 'dashboard.tierCards.tier3Definition';
};

export function TierOverviewCards({
  counts,
  totalLeads,
  activeTier,
  onSelectTier,
  maxFoundNotice,
}: TierOverviewCardsProps) {
  const { t } = useI18n();
  const tiers: LeadTier[] = ['Tier 1', 'Tier 2', 'Tier 3'];
  const tierStyles: Record<
    LeadTier,
    {
      chip: string;
      topTextColor: string;
      borderColor: string;
      glowRgb: string;
    }
  > = {
    'Tier 1': {
      chip: 'text-purple-300',
      topTextColor: 'rgba(233, 213, 255, 0.82)',
      borderColor: '#c084fc',
      glowRgb: '168,85,247',
    },
    'Tier 2': {
      chip: 'text-blue-300',
      topTextColor: 'rgba(191, 219, 254, 0.82)',
      borderColor: '#60a5fa',
      glowRgb: '59,130,246',
    },
    'Tier 3': {
      chip: 'text-cyan-300',
      topTextColor: 'rgba(165, 243, 252, 0.82)',
      borderColor: '#67e8f9',
      glowRgb: '34,211,238',
    },
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const isActive = activeTier === tier;
          const glowStrength = isActive ? 0.95 : 0.45;
          const glowRadius = isActive ? 30 : 16;

          return (
            <button
              key={tier}
              type="button"
              onClick={() => onSelectTier(isActive ? 'All' : tier)}
              style={{
                borderColor: tierStyles[tier].borderColor,
                boxShadow: `0 0 0 1px rgba(${tierStyles[tier].glowRgb}, ${glowStrength}), 0 0 ${glowRadius}px rgba(${tierStyles[tier].glowRgb}, ${glowStrength})`,
              }}
              className={`relative text-left rounded-2xl border-2 p-6 transition-all ${
                isActive ? 'bg-white/10 animate-pulse' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 rounded-2xl ${
                  isActive ? 'opacity-100' : 'opacity-60'
                }`}
                style={{
                  boxShadow: `inset 0 0 0 1px rgba(${tierStyles[tier].glowRgb}, ${isActive ? 0.7 : 0.35})`,
                }}
              />
              <p className="relative z-10 text-sm" style={{ color: tierStyles[tier].topTextColor }}>
                {t(getTierSubtitleKey(tier))}
              </p>
              <p
                className="relative z-10 mt-2 text-sm leading-relaxed"
                style={{ color: tierStyles[tier].topTextColor }}
              >
                {t(getTierDefinitionKey(tier))}
              </p>
              <p className={`relative z-10 mt-3 text-sm ${tierStyles[tier].chip}`}>{t(getTierTitleKey(tier))}</p>
              <div className="relative z-10 py-2">
                <p className="text-4xl font-bold leading-none text-white">{counts[tier]}</p>
              </div>
              <p className="relative z-10 text-sm leading-relaxed text-gray-400">
                {t('dashboard.tierCards.infoPopulate')}
              </p>
              <p className="relative z-10 mt-1 text-sm leading-relaxed text-gray-400">
                {t('dashboard.tierCards.infoFilter')}
              </p>
            </button>
          );
        })}
      </section>

      <div>
        <p className="text-sm text-gray-400">
          {t('dashboard.tierCards.totalLeads')}:{' '}
          <span className="font-semibold text-white">{totalLeads}</span>
        </p>
        {maxFoundNotice ? <p className="mt-1 text-xs text-amber-300">{maxFoundNotice}</p> : null}
      </div>
    </div>
  );
}
