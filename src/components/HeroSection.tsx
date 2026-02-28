import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import { LeadCard } from './LeadCard';

interface HeroExampleLead {
  businessName: string;
  category: string;
  city: string;
  problems: string[];
  explanation: string;
  tier?: 'Most Valuable' | 'Probable';
  score?: number;
  contacts?: Array<{
    type: 'phone' | 'website' | 'maps';
    value: string;
  }>;
}

interface HeroSectionProps {
  onStartTrial: () => void;
}

export function HeroSection({ onStartTrial }: HeroSectionProps) {
  const { raw, t } = useI18n();
  const exampleLeads = raw<HeroExampleLead[]>('hero.exampleLeads');
  const loopLeads = [...exampleLeads, ...exampleLeads];
  const leftColumnRef = useRef<HTMLDivElement | null>(null);
  const [marqueeViewportHeight, setMarqueeViewportHeight] = useState(500);

  useEffect(() => {
    if (typeof window === 'undefined' || !leftColumnRef.current) {
      return;
    }

    const desktopQuery = window.matchMedia('(min-width: 1024px)');

    const updateViewportHeight = () => {
      const leftNode = leftColumnRef.current;
      if (!leftNode) {
        return;
      }

      if (!desktopQuery.matches) {
        setMarqueeViewportHeight(500);
        return;
      }

      const measured = Math.round(leftNode.getBoundingClientRect().height);
      setMarqueeViewportHeight(Math.max(320, measured));
    };

    updateViewportHeight();

    const resizeObserver = new ResizeObserver(updateViewportHeight);
    resizeObserver.observe(leftColumnRef.current);

    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', updateViewportHeight);
    } else {
      desktopQuery.addListener(updateViewportHeight);
    }

    window.addEventListener('resize', updateViewportHeight);

    return () => {
      resizeObserver.disconnect();
      if (desktopQuery.removeEventListener) {
        desktopQuery.removeEventListener('change', updateViewportHeight);
      } else {
        desktopQuery.removeListener(updateViewportHeight);
      }
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          ref={leftColumnRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
            {t('hero.titlePrefix')} —{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {t('hero.titleHighlight')}
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 leading-relaxed">{t('hero.description')}</p>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={onStartTrial}
              className="inline-flex px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
            >
              {t('hero.primaryCta')}
            </button>
            <a
              href="#how-it-works"
              className="inline-flex px-8 py-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
            >
              {t('hero.secondaryCta')}
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div
            className="pointer-events-none select-none relative rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-4 sm:p-5"
            style={{
              height: `${marqueeViewportHeight}px`,
              maxHeight: `${marqueeViewportHeight}px`,
              overflow: 'hidden',
              border: 'none',
            }}
          >
            <div
              className="hero-lead-marquee-track absolute left-4 right-4 top-4 flex flex-col gap-4 sm:left-5 sm:right-5 sm:top-5"
              style={{ willChange: 'transform' }}
            >
              {loopLeads.map((lead, index) => (
                <div key={`${lead.businessName}-${index}`} className="shrink-0">
                  <LeadCard lead={lead} compact />
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#050816] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#050816] to-transparent" />
          </div>

          <style>{`
            @keyframes heroLeadMarquee {
              0% {
                transform: translateY(0);
              }
              100% {
                transform: translateY(-50%);
              }
            }

            .hero-lead-marquee-track {
              animation: heroLeadMarquee 40s linear infinite;
              transform: translate3d(0, 0, 0);
              backface-visibility: hidden;
            }

            @media (prefers-reduced-motion: reduce) {
              .hero-lead-marquee-track {
                animation: none;
              }
            }
          `}</style>

          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl -z-10" />
        </motion.div>
      </div>
    </section>
  );
}
