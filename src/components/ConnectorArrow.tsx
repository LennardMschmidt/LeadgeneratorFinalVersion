import { ArrowDown, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface ConnectorArrowProps {
  orientation?: 'horizontal' | 'vertical';
  delay?: number;
}

export function ConnectorArrow({
  orientation = 'horizontal',
  delay = 0,
}: ConnectorArrowProps) {
  const Icon = orientation === 'horizontal' ? ArrowRight : ArrowDown;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center justify-center"
      style={{ margin: orientation === 'horizontal' ? '0 16px' : '16px 0' }}
    >
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, rgba(59,130,246,0.20), rgba(168,85,247,0.20))',
            filter: 'blur(10px)',
          }}
        />
        <div
          className="relative flex items-center justify-center rounded-full border border-blue-500/30"
          style={{
            width: 40,
            height: 40,
            background:
              'linear-gradient(140deg, rgba(59,130,246,0.20), rgba(168,85,247,0.20))',
          }}
        >
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
      </div>
    </motion.div>
  );
}
