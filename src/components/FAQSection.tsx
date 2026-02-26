import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useI18n } from '../i18n';

interface FaqItem {
  question: string;
  answer: string;
}

export function FAQSection() {
  const { raw, t } = useI18n();
  const items = raw<FaqItem[]>('faq.items');
  const [openItem, setOpenItem] = useState('item-1');

  return (
    <section className="max-w-6xl mx-auto px-6 py-24 border-t border-white/5">
      <div className="text-center space-y-4 mb-16">
        <p className="text-sm uppercase tracking-wide text-blue-400 font-medium">{t('faq.eyebrow')}</p>
        <h2 className="text-4xl md:text-5xl font-bold text-white">{t('faq.title')}</h2>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const itemId = `item-${index + 1}`;
          const isOpen = openItem === itemId;

          return (
            <div
              key={itemId}
              className="rounded-xl border border-white/10 px-6 transition-colors duration-300 hover:border-blue-400/30"
              style={{
                background:
                  'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
              }}
            >
              <button
                type="button"
                onClick={() => setOpenItem((current) => (current === itemId ? '' : itemId))}
                className="flex w-full items-start justify-between gap-4 py-4 text-left text-sm font-medium text-white transition-colors hover:text-blue-400"
              >
                <span>{item.question}</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-gray-400"
                  style={{
                    transition: 'transform 200ms ease',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p className="text-sm text-gray-300" style={{ paddingBottom: '10px' }}>
                      {item.answer}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-300">
          {t('faq.supportLine')}{' '}
          <a href="mailto:support@leadgenerator.app" className="text-blue-400 underline transition-colors hover:text-blue-300">
            {t('faq.supportLink')}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
