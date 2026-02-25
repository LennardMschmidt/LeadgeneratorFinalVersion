import { useI18n } from '../i18n';
import { ConnectorArrow } from './ConnectorArrow';
import { PracticeStepCard } from './PracticeStepCard';

export function DemoSection() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden px-6 py-20">
      <div className="relative max-w-6xl mx-auto">
        <div className="hidden items-start lg:flex">
          <div className="flex-1">
            <PracticeStepCard
              step={1}
              title={t('demo.step1Title')}
              description={t('demo.step1Description')}
              mockType="step1"
              delay={0.1}
            />
          </div>

          <div className="pt-48">
            <ConnectorArrow orientation="horizontal" delay={0.35} />
          </div>

          <div className="flex-1">
            <PracticeStepCard
              step={2}
              title={t('demo.step2Title')}
              description={t('demo.step2Description')}
              mockType="step2"
              delay={0.2}
            />
          </div>

          <div className="pt-48">
            <ConnectorArrow orientation="horizontal" delay={0.45} />
          </div>

          <div className="flex-1">
            <PracticeStepCard
              step={3}
              title={t('demo.step3Title')}
              description={t('demo.step3Description')}
              mockType="step3"
              delay={0.3}
            />
          </div>
        </div>

        <div className="mx-auto space-y-6 lg:hidden" style={{ maxWidth: 672 }}>
          <PracticeStepCard
            step={1}
            title={t('demo.step1Title')}
            description={t('demo.step1Description')}
            mockType="step1"
            delay={0.1}
          />

          <div className="flex justify-center">
            <ConnectorArrow orientation="vertical" delay={0.25} />
          </div>

          <PracticeStepCard
            step={2}
            title={t('demo.step2Title')}
            description={t('demo.step2Description')}
            mockType="step2"
            delay={0.2}
          />

          <div className="flex justify-center">
            <ConnectorArrow orientation="vertical" delay={0.35} />
          </div>

          <PracticeStepCard
            step={3}
            title={t('demo.step3Title')}
            description={t('demo.step3Description')}
            mockType="step3"
            delay={0.3}
          />
        </div>
      </div>
    </section>
  );
}
