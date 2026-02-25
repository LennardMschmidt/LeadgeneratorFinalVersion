import { motion } from 'motion/react';

interface SectionHeadingProps {
  eyebrow: string;
  heading: string;
  description?: string;
}

export function SectionHeading({ eyebrow, heading, description }: SectionHeadingProps) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 mb-6"
        style={{
          background:
            'linear-gradient(90deg, rgba(59, 130, 246, 0.10), rgba(168, 85, 247, 0.10))',
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: 8,
            height: 8,
            background:
              'linear-gradient(90deg, rgba(96, 165, 250, 1), rgba(196, 181, 253, 1))',
          }}
        />
        <span className="text-sm font-medium text-blue-300">{eyebrow}</span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
        style={{
          background:
            'linear-gradient(160deg, rgba(255,255,255,1), rgba(209,213,219,1))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {heading}
      </motion.h2>

      {description ? (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-gray-400 leading-relaxed"
        >
          {description}
        </motion.p>
      ) : null}
    </div>
  );
}
