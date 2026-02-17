import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';

export function DemoSection() {
  const { raw, t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const dropdownSelectClass =
    'w-full appearance-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 pr-10 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-all hover:border-white/25 focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20';

  const loadingSteps = raw<string[]>('demo.loadingSteps');
  const businessCategories = raw<string[]>('demo.businessCategories');
  const problemSignals = raw<string[]>('demo.problemSignals');

  const handleGenerate = () => {
    setIsLoading(true);
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev >= loadingSteps.length - 1) {
          clearInterval(interval);
          setTimeout(() => setIsLoading(false), 1000);
          return prev;
        }

        return prev + 1;
      });
    }, 1500);
  };

  return (
    <section className="max-w-4xl mx-auto px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl font-bold mb-4">{t('demo.title')}</h2>
        <p className="text-xl text-gray-400">{t('demo.subtitle')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-sm rounded-3xl p-8 border border-white/10 relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">{t('demo.businessCategoryLabel')}</label>
            <div className="relative">
              <select className={dropdownSelectClass}>
                {businessCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">{t('demo.locationLabel')}</label>
            <input
              type="text"
              placeholder={t('demo.locationPlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3 text-gray-300">{t('demo.problemSignalsLabel')}</label>
            <div className="space-y-3">
              {problemSignals.map((problemSignal, index) => (
                <label key={problemSignal} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded bg-white/5 border-2 border-white/20 checked:bg-blue-500 checked:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    defaultChecked={index === 0}
                  />
                  <span className="text-gray-300 group-hover:text-white transition-colors">{problemSignal}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            {isLoading ? t('demo.analyzing') : t('demo.generateLeads')}
          </button>

          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-4"
              >
                {loadingSteps.map((step, index) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{
                      opacity: index <= loadingStep ? 1 : 0.3,
                      x: 0,
                    }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        index <= loadingStep ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'
                      }`}
                    />
                    <span className={index <= loadingStep ? 'text-blue-400' : 'text-gray-500'}>{step}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}
