import { Sparkles, Target, TrendingUp } from 'lucide-react';
import { Fragment } from 'react';
import { useI18n } from '../i18n';
import { ConnectorArrow } from './ConnectorArrow';
import { SectionHeading } from './SectionHeading';
import { WorkflowCard } from './WorkflowCard';
import './PersonalLeadGeneratorSection.css';

interface PersonalLeadWorkflowStep {
  title: string;
  description: string;
}

const STEP_ICONS = [Target, TrendingUp, Sparkles] as const;

export function PersonalLeadGeneratorSection() {
  const { raw, t } = useI18n();
  const workflowSteps = raw<PersonalLeadWorkflowStep[]>('personalLead.workflowSteps');

  return (
    <section id="how-it-works" className="relative overflow-hidden px-6 py-24">
      <div className="relative max-w-6xl mx-auto">
        <SectionHeading
          heading={t('howItWorks.title')}
          description={t('personalLead.subtitle')}
        />

        <div className="personal-workflow">
          {workflowSteps.slice(0, 3).map((step, index) => {
            const Icon = STEP_ICONS[index] ?? Target;

            return (
              <Fragment key={`desktop-step-${index}`}>
                <div className="personal-workflow-card">
                  <WorkflowCard
                    step={index + 1}
                    icon={Icon}
                    title={step.title}
                    description={step.description}
                    delay={0.1 + index * 0.1}
                  />
                </div>

                {index < 2 ? (
                  <>
                    <div className="personal-workflow-arrow-row">
                      <ConnectorArrow orientation="horizontal" delay={0.3 + index * 0.1} />
                    </div>
                    <div className="personal-workflow-arrow-column">
                      <ConnectorArrow orientation="vertical" delay={0.25 + index * 0.1} />
                    </div>
                  </>
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
