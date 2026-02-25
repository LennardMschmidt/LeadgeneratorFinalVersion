import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface SummaryCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export function SummaryCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative group"
    >
      <div
        className="relative h-full p-6 rounded-xl border border-white/10 backdrop-blur-sm transition-all duration-300 group-hover:border-purple-500/30"
        style={{
          background:
            'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        }}
      >
        <div className="relative flex flex-col items-center text-center gap-4">
          <div
            className="flex items-center justify-center rounded-lg border border-white/5"
            style={{
              width: 48,
              height: 48,
              background:
                'linear-gradient(160deg, rgba(168,85,247,0.10), rgba(59,130,246,0.10))',
            }}
          >
            <Icon className="w-6 h-6 text-purple-400" />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
