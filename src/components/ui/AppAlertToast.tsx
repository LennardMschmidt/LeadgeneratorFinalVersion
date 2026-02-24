import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type AppAlertVariant = 'error' | 'success' | 'info';

interface AppAlertToastProps {
  message: string | null;
  onClose: () => void;
  variant?: AppAlertVariant;
  durationMs?: number;
  title?: string;
}

const getVariantStyles = (variant: AppAlertVariant) => {
  if (variant === 'success') {
    return {
      icon: CheckCircle2,
      iconColor: 'rgb(110, 231, 183)',
      titleColor: 'rgb(209, 250, 229)',
      border: '1px solid rgba(16, 185, 129, 0.38)',
      background:
        'linear-gradient(155deg, rgba(9, 24, 24, 0.97), rgba(9, 18, 31, 0.98))',
      progress: 'linear-gradient(90deg, rgba(16, 185, 129, 0.95), rgba(34, 211, 238, 0.95))',
      shadow:
        '0 16px 48px rgba(2, 6, 23, 0.45), 0 0 0 1px rgba(16, 185, 129, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    };
  }

  if (variant === 'info') {
    return {
      icon: Info,
      iconColor: 'rgb(147, 197, 253)',
      titleColor: 'rgb(219, 234, 254)',
      border: '1px solid rgba(96, 165, 250, 0.38)',
      background:
        'linear-gradient(155deg, rgba(12, 18, 34, 0.97), rgba(18, 13, 31, 0.98))',
      progress: 'linear-gradient(90deg, rgba(59, 130, 246, 0.95), rgba(168, 85, 247, 0.95))',
      shadow:
        '0 16px 48px rgba(2, 6, 23, 0.45), 0 0 0 1px rgba(96, 165, 250, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    };
  }

  return {
    icon: AlertTriangle,
    iconColor: 'rgb(252, 165, 165)',
    titleColor: 'rgb(254, 226, 226)',
    border: '1px solid rgba(248, 113, 113, 0.45)',
    background:
      'linear-gradient(155deg, rgba(25, 14, 19, 0.97), rgba(14, 16, 29, 0.98))',
    progress: 'linear-gradient(90deg, rgba(239, 68, 68, 0.95), rgba(249, 115, 22, 0.95))',
    shadow:
      '0 16px 48px rgba(2, 6, 23, 0.45), 0 0 0 1px rgba(248, 113, 113, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  };
};

export function AppAlertToast({
  message,
  onClose,
  variant = 'error',
  durationMs = 5000,
  title,
}: AppAlertToastProps) {
  const [progressWidth, setProgressWidth] = useState(100);
  const onCloseRef = useRef(onClose);

  const visual = useMemo(() => getVariantStyles(variant), [variant]);
  const Icon = visual.icon;
  const computedTitle =
    title ??
    (variant === 'success'
      ? 'Done'
      : variant === 'info'
        ? 'Notice'
        : 'Oh no, something went wrong');

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!message) {
      return;
    }

    setProgressWidth(100);
    let secondFrameId: number | null = null;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setProgressWidth(0);
      });
    });
    const timeoutId = window.setTimeout(() => {
      onCloseRef.current();
    }, durationMs);

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) {
        window.cancelAnimationFrame(secondFrameId);
      }
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, message]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 88,
        right: 24,
        width: 'min(500px, calc(100vw - 1.5rem))',
        zIndex: 9999,
        borderRadius: 18,
        overflow: 'hidden',
        border: visual.border,
        background: visual.background,
        boxShadow: visual.shadow,
      }}
    >
      <div style={{ padding: '15px 18px 12px 18px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 11 }}>
            <Icon
              style={{
                width: 20,
                height: 20,
                marginTop: 1,
                color: visual.iconColor,
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  color: visual.titleColor,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 0.2,
                }}
              >
                {computedTitle}
              </p>
              <p
                style={{
                  margin: '2px 0 0 0',
                  color: 'rgb(226, 232, 240)',
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              >
                {message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close alert"
            style={{
              border: '1px solid rgba(148, 163, 184, 0.35)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'rgb(226, 232, 240)',
              width: 26,
              height: 26,
              borderRadius: 9999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      <div
        style={{
          height: 4,
          width: '100%',
          background: 'rgba(148, 163, 184, 0.25)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressWidth}%`,
            background: visual.progress,
            transition: `width ${durationMs}ms linear`,
          }}
        />
      </div>
    </div>
  );
}

export type { AppAlertVariant };
