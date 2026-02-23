import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useI18n } from '../i18n';

interface PricingPlan {
  code: 'STANDARD' | 'PRO' | 'EXPERT';
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  badge?: string;
  highlighted: boolean;
}

const HOME_PRICING_PLANS: PricingPlan[] = [
  {
    code: 'STANDARD',
    name: 'Standard',
    price: '$29',
    period: 'per month',
    description: 'Essential tools for solo operators and early projects.',
    features: [
      '200 AI evaluation tokens/month',
      '180 tokens/day included',
      'Google Maps search',
      'Website analysis',
      'Basic lead management',
      'Saved leads',
      'Email support',
    ],
    cta: 'Choose Standard',
    highlighted: false,
  },
  {
    code: 'PRO',
    name: 'Pro',
    price: '$49',
    period: 'per month',
    description: 'Full access for growing teams',
    features: [
      '500 AI evaluation tokens/month',
      '380 tokens/day included',
      'LinkedIn + Google Maps search',
      'Advanced website analysis',
      'CSV & CRM export',
      'Saved searches',
      'Lead scoring & tiers',
      'Priority support',
    ],
    cta: 'Switch to Pro',
    badge: 'MOST POPULAR',
    highlighted: true,
  },
  {
    code: 'EXPERT',
    name: 'Expert',
    price: '$79',
    period: 'per month',
    description: 'Maximum volume and speed for high-output prospecting.',
    features: [
      '1200 AI evaluation tokens/month',
      '700 tokens/day included',
      'Highest daily throughput',
      'Priority execution lane',
      'All Pro features',
      'Advanced usage visibility',
      'Fast-track support',
      'API-ready workflow',
    ],
    cta: 'Upgrade to Expert',
    highlighted: false,
  },
];

export function PricingSection() {
  const { t } = useI18n();

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

      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
        {HOME_PRICING_PLANS.map((plan, index) => (
          <motion.div
            key={plan.code}
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
            {plan.badge ? (
              <div className="mb-4">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-medium">
                  {plan.badge === 'MOST POPULAR' ? t('pricing.popularBadge') : plan.badge}
                </span>
              </div>
            ) : null}

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
