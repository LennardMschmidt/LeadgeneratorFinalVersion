import { motion } from 'motion/react';
import { Mail, MessageSquare, Target } from 'lucide-react';
import { useI18n } from '../i18n';

interface ValuePoint {
  title: string;
  description: string;
}

const ICONS = [Target, Mail, MessageSquare] as const;

export function ValuePropSection() {
  const { raw, t } = useI18n();
  const valuePoints = raw<ValuePoint[]>('valueProp.points');

  return (
    <section className="max-w-6xl mx-auto px-6 py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl font-bold mb-4">{t('valueProp.title')}</h2>
        <p className="text-xl text-gray-400">{t('valueProp.subtitle')}</p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {valuePoints.map((point, index) => {
          const Icon = ICONS[index] ?? Target;

          return (
            <motion.div
              key={`${point.title}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-blue-500/30 transition-all group"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform">
                <Icon className="w-7 h-7 text-blue-400" />
              </div>

              <h3 className="text-xl font-semibold mb-3">{point.title}</h3>
              <p className="text-gray-400 leading-relaxed">{point.description}</p>
            </motion.div>
          );
        })}
      </div>

    </section>
  );
}
