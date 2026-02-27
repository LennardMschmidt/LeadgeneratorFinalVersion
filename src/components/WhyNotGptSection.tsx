import { motion } from 'motion/react';
import { Bot, CheckCircle2, Target } from 'lucide-react';
import { useI18n } from '../i18n';

interface WhyNotGptPoint {
  title: string;
  description: string;
}

export function WhyNotGptSection() {
  const { raw, t } = useI18n();
  const points = raw<WhyNotGptPoint[]>('whyNotGpt.points');
  const genericPoints = raw<string[]>('whyNotGpt.genericGptPoints');
  const leadGeneratorPoints = raw<string[]>('whyNotGpt.leadGeneratorPoints');
  const icons = [Bot, Target, CheckCircle2] as const;

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="mb-12 text-center"
      >
        <h2 className="mb-4 text-4xl font-bold">{t('whyNotGpt.title')}</h2>
        <p className="text-xl text-gray-400">{t('whyNotGpt.subtitle')}</p>
      </motion.div>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        {points.map((point, index) => {
          const Icon = icons[index] ?? Target;
          return (
            <motion.div
              key={`${point.title}-${index}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/6 to-white/[0.02] p-6 backdrop-blur-sm"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/15">
                <Icon className="h-5 w-5 text-blue-300" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{point.title}</h3>
              <p className="text-sm leading-relaxed text-gray-300">{point.description}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-r from-blue-500/10 via-slate-900/80 to-purple-500/10 p-6"
      >
        <h3 className="text-xl font-semibold text-white" style={{ marginBottom: '10px' }}>
          {t('whyNotGpt.comparisonTitle')}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-300">
              {t('whyNotGpt.genericGptTitle')}
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              {genericPoints.map((point) => (
                <li key={point}>• {point}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-300">
              {t('whyNotGpt.leadGeneratorTitle')}
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              {leadGeneratorPoints.map((point) => (
                <li key={point}>• {point}</li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
