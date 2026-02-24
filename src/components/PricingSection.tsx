import { useMemo } from 'react';
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

type PlanCode = PricingPlan['code'];

type SubscriptionPlanVisual = Omit<PricingPlan, 'code' | 'name' | 'highlighted'>;

const PLAN_ORDER: PlanCode[] = ['STANDARD', 'PRO', 'EXPERT'];

const PLAN_NAMES: Record<PlanCode, string> = {
  STANDARD: 'Standard',
  PRO: 'Pro',
  EXPERT: 'Expert',
};

const FALLBACK_SUBSCRIPTION_PLAN_VISUALS: Record<PlanCode, SubscriptionPlanVisual> = {
  STANDARD: {
    price: '€29',
    period: 'per month',
    description: 'Perfect to start local outreach with Google Maps and website checks.',
    cta: 'Choose Standard',
    features: [
      '180 search tokens/day',
      'AI evaluations not included',
      'Google Maps lead search',
      'Website analysis',
      'Save qualified leads and export them',
    ],
  },
  PRO: {
    price: '€49',
    period: 'per month',
    description:
      'Includes AI Website Analysis and direct AI suggestions, plus LinkedIn profile discovery for smarter outreach.',
    cta: 'Switch to Pro',
    badge: 'MOST POPULAR',
    features: [
      '380 search tokens/day',
      '500 AI evaluation tokens/month',
      'Google Maps lead search',
      'LinkedIn profile discovery',
      'Website analysis',
      'AI website summary',
      'AI contact suggestions (email, LinkedIn, phone)',
      'Save qualified leads and export them',
    ],
  },
  EXPERT: {
    price: '€79',
    period: 'per month',
    description: 'Maximum volume with AI Website Analysis and direct AI suggestions at scale.',
    cta: 'Upgrade to Expert',
    badge: 'BEST VALUE',
    features: [
      '700 search tokens/day',
      '1200 AI evaluation tokens/month',
      'Google Maps lead search',
      'LinkedIn profile discovery',
      'Website analysis',
      'AI website summary',
      'AI contact suggestions (email, LinkedIn, phone)',
      'Save qualified leads and export them',
    ],
  },
};

export function PricingSection() {
  const { t, raw } = useI18n();
  const subscriptionPlanVisuals =
    raw<Record<PlanCode, SubscriptionPlanVisual> | undefined>('subscriptionPlans.plans') ??
    FALLBACK_SUBSCRIPTION_PLAN_VISUALS;
  const homePricingPlans = useMemo<PricingPlan[]>(
    () =>
      PLAN_ORDER.map((code) => ({
        code,
        name: PLAN_NAMES[code],
        highlighted: code === 'PRO',
        ...subscriptionPlanVisuals[code],
      })),
    [subscriptionPlanVisuals],
  );

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
        {homePricingPlans.map((plan, index) => (
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
                  {plan.badge}
                </span>
              </div>
            ) : null}

            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-bold">{plan.price}</span>
              <span className="text-gray-400">{plan.period}</span>
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
