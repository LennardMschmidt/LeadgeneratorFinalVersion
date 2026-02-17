import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import { LeadCard } from './LeadCard';

interface ResultLead {
  businessName: string;
  category: string;
  city: string;
  problems: string[];
  explanation: string;
  tier: 'Most Valuable' | 'Probable';
}

export function ResultsSection() {
  const { raw, t } = useI18n();
  const exampleResults = raw<ResultLead[]>('results.exampleLeads');

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl font-bold mb-4">{t('results.title')}</h2>
        <p className="text-xl text-gray-400">{t('results.subtitle')}</p>
      </motion.div>

      <div className="grid gap-6">
        {exampleResults.map((lead, index) => (
          <motion.div
            key={`${lead.businessName}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <LeadCard lead={lead} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
