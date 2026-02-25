import { motion } from 'motion/react';
import { MockCard } from './MockCard';
import { StepBadge } from './StepBadge';

interface PracticeStepCardProps {
  step: number;
  title: string;
  description: string;
  mockType: 'step1' | 'step2' | 'step3';
  delay?: number;
}

export function PracticeStepCard({
  step,
  title,
  description,
  mockType,
  delay = 0,
}: PracticeStepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <StepBadge number={step} />
          <div className="flex-1 pt-2">
            <h3 className="mb-2 text-2xl font-semibold text-white">{title}</h3>
            <p className="leading-relaxed text-gray-400">{description}</p>
          </div>
        </div>

        <div className="pl-16">
          <MockCard type={mockType} delay={delay + 0.1} />
        </div>
      </div>
    </motion.div>
  );
}
