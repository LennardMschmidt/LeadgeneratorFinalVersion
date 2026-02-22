import { FormEvent, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Mail, X } from 'lucide-react';
import { sendPasswordResetEmail } from '../lib/supabaseAuth';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onBack: () => void;
  defaultEmail?: string;
  onEmailChange?: (nextEmail: string) => void;
}

const EMAIL_REGEX = /.+@.+\..+/;
const CONTROL_HEIGHT_STYLE = { height: 'calc(var(--spacing) * 11)' };
const FIELD_WRAPPER_STYLE = { marginBottom: '20px' };
const FIELD_LABEL_STYLE = { display: 'block', marginBottom: '8px' };
const INPUT_CLASS_NAME =
  'w-full rounded-xl border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/35 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

const getAuthFailureMessage = (result: unknown): string => {
  if (
    result &&
    typeof result === 'object' &&
    'message' in result &&
    typeof (result as { message?: unknown }).message === 'string' &&
    (result as { message: string }).message.trim().length > 0
  ) {
    return (result as { message: string }).message;
  }

  return 'Could not send reset email right now. Please try again.';
};

export function ForgotPasswordModal({
  onClose,
  onBack,
  defaultEmail = '',
  onEmailChange,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const canSendReset = !isLoading && email.trim().length > 0;
  const canResendReset = !isLoading;

  const submitResetEmail = async (): Promise<void> => {
    const normalizedEmail = email.trim();
    onEmailChange?.(normalizedEmail);

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setStatusMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const result = await sendPasswordResetEmail(normalizedEmail, {
        redirectPath: '/reset-password',
      });
      if (!result.ok) {
        setStatusMessage(getAuthFailureMessage(result));
        return;
      }

      setIsSubmitted(true);
    } catch {
      setStatusMessage('Could not send reset email right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitResetEmail();
  };

  const handleBackToLogin = () => {
    setIsSubmitted(false);
    setStatusMessage(null);
    onBack();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      className="relative w-full max-w-md pointer-events-auto"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="absolute -top-20 -left-20 h-40 w-40 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgb(59, 130, 246), transparent)' }}
      />
      <div
        className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgb(34, 211, 238), transparent)' }}
      />

      <div
        className="relative rounded-3xl border p-8"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 transition-colors hover:text-white"
          style={{ right: '1.5rem', left: 'auto', top: '1.5rem' }}
          aria-label="Close forgot password form"
        >
          <X className="h-5 w-5" />
        </button>

        {!isSubmitted ? (
          <>
            <div className="mb-8" style={{ paddingTop: '10px' }}>
              <h2 className="mb-2 text-2xl text-white">Reset your password</h2>
              <p className="text-gray-400">Enter your email and we'll send you a reset link</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={FIELD_WRAPPER_STYLE}>
                <label htmlFor="reset-email" className="text-gray-300" style={FIELD_LABEL_STYLE}>
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setStatusMessage(null);
                  }}
                  placeholder="you@example.com"
                  className={INPUT_CLASS_NAME}
                  style={{
                    ...CONTROL_HEIGHT_STYLE,
                  }}
                  required
                  disabled={isLoading}
                />
              </div>

              {statusMessage ? (
                <p
                  className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-xs leading-relaxed text-blue-200"
                  style={{ marginBottom: '20px' }}
                >
                  {statusMessage}
                </p>
              ) : null}

              <div
                className="flex items-center gap-3"
                style={{
                  marginTop: statusMessage ? 0 : '4px',
                }}
              >
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="rounded-xl px-6 text-gray-300 transition hover:bg-white/5 hover:text-white"
                  style={CONTROL_HEIGHT_STYLE}
                  disabled={isLoading}
                >
                  <span className="inline-flex items-center">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </span>
                </button>

                <div className="flex-1" />

                <button
                  type="button"
                  onClick={() => {
                    if (!canSendReset) {
                      return;
                    }
                    void submitResetEmail();
                  }}
                  aria-disabled={!canSendReset}
                  className="relative overflow-hidden rounded-xl px-8 text-white transition"
                  style={{
                    ...CONTROL_HEIGHT_STYLE,
                    background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(168, 85, 247))',
                    border: 'none',
                    color: '#ffffff',
                    WebkitTextFillColor: '#ffffff',
                    opacity: 1,
                    cursor: canSendReset ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2" style={{ color: '#ffffff' }}>
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Mail className="h-4 w-4" style={{ color: '#ffffff' }} />
                        </motion.div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" style={{ color: '#ffffff' }} />
                        Send Reset Link
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 transition-opacity hover:opacity-20" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="py-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
              className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '2px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle2 className="h-8 w-8" stroke="rgb(45, 212, 191)" />
            </motion.div>

            <h2 className="mb-3 text-2xl text-white">Check your email</h2>
            <p className="mb-2 text-base" style={{ color: 'rgba(226, 232, 240, 0.72)' }}>
              We've sent a password reset link to
            </p>
            <p className="mb-8 font-medium" style={{ color: 'rgba(226, 232, 240, 0.96)' }}>
              {email.trim()}
            </p>

            <div
              className="mb-6 rounded-xl p-4 text-left text-sm"
              style={{
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
              }}
            >
              <p className="mb-2" style={{ color: 'rgb(96, 165, 250)' }}>
                <span className="font-medium">Didn't receive the email?</span>
              </p>
              <div style={{ color: 'rgba(203, 213, 225, 0.82)' }}>
                <p className="flex items-start gap-2">
                  <span style={{ color: 'rgba(203, 213, 225, 0.92)' }}>•</span>
                  <span>Check your spam folder</span>
                </p>
                <p className="mt-1 flex items-start gap-2">
                  <span style={{ color: 'rgba(203, 213, 225, 0.92)' }}>•</span>
                  <span>Make sure you entered the correct email</span>
                </p>
                <p className="mt-1 flex items-start gap-2">
                  <span style={{ color: 'rgba(203, 213, 225, 0.92)' }}>•</span>
                  <span>Wait a few minutes and check again</span>
                </p>
              </div>
            </div>

            {statusMessage ? (
              <p className="mb-3 rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-xs leading-relaxed text-blue-200">
                {statusMessage}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!canResendReset) {
                    return;
                  }
                  void submitResetEmail();
                }}
                aria-disabled={!canResendReset}
                className="relative w-full overflow-hidden rounded-xl text-white transition"
                style={{
                  ...CONTROL_HEIGHT_STYLE,
                  background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(168, 85, 247))',
                  border: 'none',
                  color: '#ffffff',
                  WebkitTextFillColor: '#ffffff',
                  opacity: 1,
                  cursor: canResendReset ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="relative z-10" style={{ color: '#ffffff', fontWeight: 600 }}>
                  {isLoading ? 'Sending...' : 'Resend Email'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 transition-opacity hover:opacity-20" />
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full rounded-xl text-gray-300 transition hover:bg-white/5 hover:text-white"
                style={{
                  ...CONTROL_HEIGHT_STYLE,
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="inline-flex items-center" style={{ color: 'rgba(203, 213, 225, 0.9)' }}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
