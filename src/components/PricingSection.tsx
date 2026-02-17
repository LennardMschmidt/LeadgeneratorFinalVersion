import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useI18n } from '../i18n';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

export function PricingSection() {
  const { raw, t } = useI18n();
  const plans = raw<PricingPlan[]>('pricing.plans');

  return (
    <section id="pricing" className="max-w-6xl mx-auto px-6 py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl font-bold mb-4">{t('pricing.title')}</h2>
        <p className="text-xl text-gray-400">{t('pricing.subtitle')}</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan, index) => (
          <motion.div
            key={`${plan.name}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`rounded-3xl p-8 border transition-all ${
              plan.highlighted
                ? 'bg-gradient-to-br from-white/10 to-white/[0.02] border-blue-500/30 shadow-xl shadow-blue-500/10 scale-105'
                : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10'
            }`}
          >
            {plan.highlighted && (
              <div className="mb-4">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-medium">
                  {t('pricing.popularBadge')}
                </span>
              </div>
            )}

            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-bold">{plan.price}</span>
              <span className="text-gray-400">/{plan.period}</span>
            </div>
            <p className="text-gray-400 mb-8">{plan.description}</p>

            <button
              className={`w-full px-6 py-3 rounded-xl font-medium transition-all mb-8 ${
                plan.highlighted
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
              }`}
            >
              {plan.cta}
            </button>

            <ul className="space-y-4">
              {plan.features.map((feature, idx) => (
                <li key={`${feature}-${idx}`} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      plan.highlighted ? 'bg-blue-500/20' : 'bg-white/5'
                    }`}
                  >
                    <Check className={`w-3 h-3 ${plan.highlighted ? 'text-blue-400' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
