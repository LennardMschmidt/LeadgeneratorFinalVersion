import { BarChart3, Brain, Search } from 'lucide-react';
import { useI18n } from '../i18n';
import { SummaryCard } from './SummaryCard';

interface Step {
  title: string;
  description: string;
}

const STEP_ICONS = [Search, BarChart3, Brain] as const;

export function HowItWorksSection() {
  const { raw } = useI18n();
  const steps = raw<Step[]>('howItWorks.steps');

  return (
    <section id="how-it-works" className="relative px-6 py-24">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-px"
        style={{
          width: '66.666667%',
          transform: 'translateX(-50%)',
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.00), rgba(255,255,255,0.10), rgba(255,255,255,0.00))',
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.slice(0, 3).map((step, index) => {
            const Icon = STEP_ICONS[index] ?? Search;

            return (
              <SummaryCard
                key={`${step.title}-${index}`}
                icon={Icon}
                title={step.title}
                description={step.description}
                delay={0.1 + index * 0.1}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
