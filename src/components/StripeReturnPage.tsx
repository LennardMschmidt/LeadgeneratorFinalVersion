import { CheckCircle2, CreditCard, XCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import type { ReactNode } from 'react';

type StripeReturnVariant = 'success' | 'cancel' | 'portal';

interface StripeReturnPageProps {
  variant: StripeReturnVariant;
  isAuthenticated: boolean;
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateBilling: () => void;
  onOpenLogin: () => void;
}

type VariantTheme = {
  route: string;
  accentA: string;
  accentB: string;
  icon: ReactNode;
  statusBorder: string;
  statusBackground: string;
};

const VARIANT_THEMES: Record<StripeReturnVariant, VariantTheme> = {
  success: {
    route: '/billing/success',
    accentA: 'rgba(34, 197, 94, 0.95)',
    accentB: 'rgba(16, 185, 129, 0.9)',
    icon: <CheckCircle2 size={30} color="rgb(167, 243, 208)" strokeWidth={2.2} />,
    statusBorder: '1px solid rgba(16, 185, 129, 0.45)',
    statusBackground: 'linear-gradient(135deg, rgba(6, 78, 59, 0.5), rgba(16, 185, 129, 0.18))',
  },
  cancel: {
    route: '/billing/cancel',
    accentA: 'rgba(239, 68, 68, 0.95)',
    accentB: 'rgba(249, 115, 22, 0.85)',
    icon: <XCircle size={30} color="rgb(253, 164, 175)" strokeWidth={2.2} />,
    statusBorder: '1px solid rgba(239, 68, 68, 0.45)',
    statusBackground: 'linear-gradient(135deg, rgba(127, 29, 29, 0.55), rgba(249, 115, 22, 0.18))',
  },
  portal: {
    route: '/billing/portal-return',
    accentA: 'rgba(56, 189, 248, 0.95)',
    accentB: 'rgba(139, 92, 246, 0.85)',
    icon: <CreditCard size={30} color="rgb(186, 230, 253)" strokeWidth={2.2} />,
    statusBorder: '1px solid rgba(56, 189, 248, 0.45)',
    statusBackground: 'linear-gradient(135deg, rgba(30, 64, 175, 0.45), rgba(139, 92, 246, 0.2))',
  },
};

const FALLBACK_STEPS: Record<StripeReturnVariant, string[]> = {
  success: [
    'Your Stripe checkout is complete.',
    'Subscription data syncs to your account within a few seconds.',
    'Open Billing to confirm plan and renewal details.',
  ],
  cancel: [
    'No subscription changes were applied.',
    'Your existing plan and access remain unchanged.',
    'Return to Billing to retry checkout anytime.',
  ],
  portal: [
    'Billing Portal updates are saved in Stripe.',
    'Subscription and payment method syncs back to your account.',
    'Review Billing to verify the latest status.',
  ],
};

export function StripeReturnPage({
  variant,
  isAuthenticated,
  onNavigateHome,
  onNavigateDashboard,
  onNavigateBilling,
  onOpenLogin,
}: StripeReturnPageProps) {
  const { t, raw } = useI18n();
  const routeKey = `stripeReturn.${variant}`;
  const theme = VARIANT_THEMES[variant];
  const steps =
    raw<string[] | undefined>(`${routeKey}.steps`) ?? FALLBACK_STEPS[variant];

  return (
    <main
      style={{
        position: 'relative',
        margin: '0 auto',
        maxWidth: 1120,
        minHeight: '74vh',
        padding: '72px 24px 112px',
        overflow: 'hidden',
      }}
    >
      <section
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: 28,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background:
            'linear-gradient(155deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow:
            '0 30px 80px rgba(2, 6, 23, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          padding: 28,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              borderRadius: 9999,
              padding: '7px 14px',
              border: theme.statusBorder,
              background: theme.statusBackground,
              color: 'rgb(241, 245, 249)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            {t('stripeReturn.badge')}
          </div>

          <div
            style={{
              borderRadius: 9999,
              border: '1px solid rgba(148, 163, 184, 0.42)',
              background: 'rgba(2, 6, 23, 0.45)',
              color: 'rgb(148, 163, 184)',
              fontSize: 12,
              letterSpacing: 0.2,
              padding: '6px 12px',
            }}
          >
            {theme.route}
          </div>
        </div>

        <div className="stripe-return-layout">
          <div
            style={{
              borderRadius: 22,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(2, 6, 23, 0.35)',
              padding: 24,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                display: 'grid',
                placeItems: 'center',
                marginBottom: 18,
                border: '1px solid rgba(255, 255, 255, 0.18)',
                background: `linear-gradient(135deg, ${theme.accentA}, ${theme.accentB})`,
                boxShadow: `0 12px 30px ${theme.accentB.replace('0.85', '0.25')}`,
              }}
            >
              {theme.icon}
            </div>

            <h1
              style={{
                marginBottom: 12,
                fontSize: 'clamp(1.65rem, 3vw, 2.4rem)',
                lineHeight: 1.15,
                color: 'rgb(248, 250, 252)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              {t(`${routeKey}.title`)}
            </h1>
            <p
              style={{
                marginBottom: 14,
                color: 'rgb(203, 213, 225)',
                fontSize: 16,
                lineHeight: 1.55,
              }}
            >
              {t(`${routeKey}.description`)}
            </p>
            <p style={{ color: 'rgb(148, 163, 184)', fontSize: 14, lineHeight: 1.55 }}>
              {isAuthenticated
                ? t('stripeReturn.authenticatedHint')
                : t('stripeReturn.unauthenticatedHint')}
            </p>
          </div>

          <div
            style={{
              borderRadius: 22,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background:
                'linear-gradient(180deg, rgba(2, 6, 23, 0.5), rgba(2, 6, 23, 0.28))',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h2
              style={{
                margin: 0,
                color: 'rgb(226, 232, 240)',
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: 0.2,
              }}
            >
              {t('stripeReturn.nextTitle')}
            </h2>

            <ol style={{ display: 'grid', gap: 10, margin: 0, padding: 0 }}>
              {steps.map((step, index) => (
                <li
                  key={`${variant}-step-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '26px 1fr',
                    gap: 10,
                    alignItems: 'start',
                    borderRadius: 12,
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.55)',
                    padding: '10px 12px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-grid',
                      placeItems: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'white',
                      background: `linear-gradient(135deg, ${theme.accentA}, ${theme.accentB})`,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span
                    style={{
                      color: 'rgb(203, 213, 225)',
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={onNavigateBilling}
                className="stripe-return-btn stripe-return-btn-primary"
                style={{
                  background: `linear-gradient(135deg, ${theme.accentA}, ${theme.accentB})`,
                }}
              >
                {t('stripeReturn.actions.goBilling')}
              </button>
              <button
                type="button"
                onClick={onNavigateDashboard}
                className="stripe-return-btn stripe-return-btn-secondary"
              >
                {t('stripeReturn.actions.goDashboard')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="stripe-return-btn stripe-return-btn-primary"
              style={{
                background: `linear-gradient(135deg, ${theme.accentA}, ${theme.accentB})`,
              }}
            >
              {t('stripeReturn.actions.openLogin')}
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateHome}
            className="stripe-return-btn stripe-return-btn-tertiary"
          >
            {t('stripeReturn.actions.goHome')}
          </button>
        </div>
      </section>

      <style>{`
        .stripe-return-layout {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 16px;
        }

        .stripe-return-btn {
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          color: rgb(248, 250, 252);
          font-size: 14px;
          font-weight: 600;
          padding: 10px 16px;
          min-height: 42px;
          transition: transform 120ms ease, filter 120ms ease, background-color 120ms ease;
        }

        .stripe-return-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.06);
        }

        .stripe-return-btn-primary {
          border-color: rgba(255, 255, 255, 0.22);
        }

        .stripe-return-btn-secondary {
          background: rgba(255, 255, 255, 0.08);
        }

        .stripe-return-btn-tertiary {
          background: rgba(255, 255, 255, 0.03);
        }

        @media (max-width: 920px) {
          .stripe-return-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
