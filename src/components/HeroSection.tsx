import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import { LeadCard } from './LeadCard';

interface HeroExampleLead {
  businessName: string;
  category: string;
  city: string;
  problems: string[];
  explanation: string;
}

export function HeroSection() {
  const { raw, t } = useI18n();
  const exampleLeads = raw<HeroExampleLead[]>('hero.exampleLeads');

  return (
    <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
            {t('hero.titlePrefix')} —{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {t('hero.titleHighlight')}
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 leading-relaxed">{t('hero.description')}</p>

          <div className="flex flex-wrap gap-4">
            <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105">
              {t('hero.primaryCta')}
            </button>
            <button className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all border border-white/10 hover:border-white/20">
              {t('hero.secondaryCta')}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="space-y-4">
            {exampleLeads.map((lead, index) => (
              <motion.div
                key={`${lead.businessName}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              >
                <LeadCard lead={lead} compact />
              </motion.div>
            ))}
          </div>

          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl -z-10" />
        </motion.div>
      </div>
    </section>
  );
}
