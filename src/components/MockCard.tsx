import { ExternalLink, MapPin, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { type CSSProperties, type ReactNode } from 'react';
import { useI18n } from '../i18n';

interface TagPillProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success';
}

const tagPillStyles: Record<NonNullable<TagPillProps['variant']>, CSSProperties> = {
  default: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    color: 'rgb(209, 213, 219)',
  },
  primary: {
    backgroundColor: 'rgba(59, 130, 246, 0.10)',
    borderColor: 'rgba(59, 130, 246, 0.30)',
    color: 'rgb(147, 197, 253)',
  },
  success: {
    backgroundColor: 'rgba(34, 197, 94, 0.10)',
    borderColor: 'rgba(34, 197, 94, 0.30)',
    color: 'rgb(134, 239, 172)',
  },
};

function TagPill({ children, variant = 'default' }: TagPillProps) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
      style={tagPillStyles[variant]}
    >
      {children}
    </span>
  );
}

interface MockCardProps {
  type: 'step1' | 'step2' | 'step3';
  delay?: number;
}

export function MockCard({ type, delay = 0 }: MockCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="w-full"
    >
      {type === 'step1' ? <Step1Card /> : null}
      {type === 'step2' ? <Step2Card /> : null}
      {type === 'step3' ? <Step3Card /> : null}
    </motion.div>
  );
}

function Step1Card() {
  const { raw, t } = useI18n();
  const businessCategories = raw<string[]>('demo.businessCategories');
  const problemSignals = raw<string[]>('demo.problemSignals');

  return (
    <div
      className="space-y-4 rounded-xl border border-white/10 p-6 backdrop-blur-sm"
      style={{
        background:
          'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
      }}
    >
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {t('demo.businessCategoryLabel')}
        </label>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white">
          {businessCategories[0]}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {t('demo.locationLabel')}
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span>{t('demo.locationPlaceholder')}</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {t('demo.problemSignalsLabel')}
        </label>

        <div className="space-y-2">
          {problemSignals.map((problemSignal) => (
            <div
              key={problemSignal}
              className="flex items-center gap-2 rounded-lg border px-4 py-2.5"
              style={{
                borderColor: 'rgba(239, 68, 68, 0.20)',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
              }}
            >
              <div
                className="flex h-4 w-4 items-center justify-center rounded border-2"
                style={{ borderColor: 'rgba(248, 113, 113, 0.50)' }}
              >
                <div
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: 'rgb(248, 113, 113)' }}
                />
              </div>
              <span className="text-sm text-gray-200">{problemSignal}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled
        className="mt-2 w-full rounded-lg px-6 py-3 font-medium text-white"
        style={{
          background: 'linear-gradient(90deg, rgb(59,130,246), rgb(147,51,234))',
          boxShadow: '0 10px 24px rgba(59,130,246,0.25)',
          cursor: 'not-allowed',
        }}
      >
        {t('demo.generateLeads')}
      </button>
    </div>
  );
}

function Step2Card() {
  const { raw } = useI18n();
  const exampleLeads = raw<
    Array<{
      businessName: string;
      category: string;
      city: string;
      problems: string[];
    }>
  >('results.exampleLeads');

  return (
    <div className="space-y-3">
      <div className="mb-4 flex flex-wrap gap-2">
        <TagPill variant="primary">Google Maps</TagPill>
        <TagPill variant="primary">LinkedIn</TagPill>
      </div>

      {exampleLeads.slice(0, 2).map((lead) => (
        <div
          key={lead.businessName}
          className="space-y-3 rounded-xl border border-white/10 p-5 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30"
          style={{
            background:
              'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
          }}
        >
          <div style={{ margin: '20px' }}>
            <h4 className="text-lg font-semibold text-white">{lead.businessName}</h4>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
              <span>{lead.category}</span>
              <span>·</span>
              <span>{lead.city}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" style={{ margin: '20px' }}>
            {lead.problems.map((problem) => {
              const hasRating = problem.toLowerCase().includes('rating');

              if (hasRating) {
                return (
                  <div
                    key={problem}
                    className="flex items-center gap-1 rounded-full border px-3 py-1"
                    style={{
                      borderColor: 'rgba(249, 115, 22, 0.30)',
                      backgroundColor: 'rgba(249, 115, 22, 0.10)',
                    }}
                  >
                    <Star
                      className="h-3 w-3"
                      style={{ color: 'rgb(251, 146, 60)', fill: 'rgb(251, 146, 60)' }}
                    />
                    <span className="text-xs font-medium" style={{ color: 'rgb(253, 186, 116)' }}>
                      {problem}
                    </span>
                  </div>
                );
              }

              return <TagPill key={problem}>{problem}</TagPill>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Step3Card() {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div className="mb-4 flex flex-wrap gap-2" style={{ margin: '20px' }}>
        <TagPill variant="success">{t('demo.step3BadgeTiers')}</TagPill>
        <TagPill variant="success">{t('demo.step3BadgeWebsiteAi')}</TagPill>
        <TagPill variant="success">{t('demo.step3BadgeContactAi')}</TagPill>
      </div>

      <div
        className="space-y-2 rounded-xl border p-5 backdrop-blur-sm"
        style={{
          borderColor: 'rgba(34, 197, 94, 0.30)',
          background: 'linear-gradient(160deg, rgba(34,197,94,0.10), rgba(16,185,129,0.05))',
        }}
      >
        <div style={{ margin: '20px' }}>
          <div className="flex items-center gap-2">
            <div
              className="rounded border px-2.5 py-1"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.20)',
                borderColor: 'rgba(34, 197, 94, 0.40)',
              }}
            >
              <span className="text-xs font-bold" style={{ color: 'rgb(134, 239, 172)' }}>
                Tier 1
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-300">{t('demo.step3TierOne')}</p>
        </div>
      </div>

      <div
        className="space-y-3 rounded-xl border border-white/10 p-5 backdrop-blur-sm"
        style={{
          background:
            'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
        }}
      >
        <div style={{ margin: '20px' }}>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400">
              {t('demo.step3StatusLabel')}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.10)',
                  borderColor: 'rgba(59, 130, 246, 0.30)',
                  color: 'rgb(147, 197, 253)',
                }}
              >
                New
              </span>
              <span className="text-gray-500">-&gt;</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-400">
                Contacted
              </span>
              <span className="text-gray-500">-&gt;</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-400">
                Won
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="space-y-2 rounded-xl border p-5 backdrop-blur-sm"
        style={{
          borderColor: 'rgba(168, 85, 247, 0.30)',
          background: 'linear-gradient(160deg, rgba(168,85,247,0.10), rgba(59,130,246,0.05))',
        }}
      >
        <div style={{ margin: '20px' }}>
          <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-purple-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
            {t('demo.step3NextActionLabel')}
          </label>
          <p className="text-sm text-gray-300">{t('demo.step3NextActionValue')}</p>
        </div>
      </div>

      <div className="flex justify-end" style={{ margin: '20px' }}>
        <ExternalLink className="h-4 w-4 text-gray-500" />
      </div>
    </div>
  );
}
