import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { StepBadge } from './StepBadge';

interface WorkflowCardProps {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export function WorkflowCard({
  step,
  icon: Icon,
  title,
  description,
  delay = 0,
}: WorkflowCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative group"
    >
      <div
        className="relative h-full p-8 rounded-2xl border border-white/10 backdrop-blur-sm transition-all duration-300 group-hover:border-blue-500/30"
        style={{
          background:
            'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        }}
      >
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              'linear-gradient(160deg, rgba(59,130,246,0.00), rgba(168,85,247,0.00))',
          }}
        />

        <div className="relative flex flex-col gap-5">
          <div className="flex w-full items-start justify-between" style={{ marginBottom: '20px' }}>
            <StepBadge number={step} />

            <div
              className="flex items-center justify-center rounded-xl border border-white/5"
              style={{
                width: 56,
                height: 56,
                background:
                  'linear-gradient(160deg, rgba(59,130,246,0.10), rgba(168,85,247,0.10))',
              }}
            >
              <Icon className="w-7 h-7 text-blue-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <p className="text-gray-400 leading-relaxed">{description}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
