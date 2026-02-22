import { FormEvent, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { signOutFromSupabase, updateSupabasePassword } from '../lib/supabaseAuth';

interface ResetPasswordPageProps {
  onBackHome: () => void;
  onBackToLogin: () => void;
}

const CONTROL_HEIGHT_STYLE = { height: 'calc(var(--spacing) * 11)' };
const FIELD_LABEL_STYLE = { display: 'block', marginBottom: '8px' };
const FIELD_WRAPPER_STYLE = { marginBottom: '20px' };
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

  return 'Could not update password. Please try again.';
};

export function ResetPasswordPage({ onBackHome, onBackToLogin }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const canUpdatePassword = !isLoading;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    if (password.length < 8) {
      setStatusMessage('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setStatusMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const result = await updateSupabasePassword(password);
      if (!result.ok) {
        setStatusMessage(getAuthFailureMessage(result));
        return;
      }

      await signOutFromSupabase();
      setPassword('');
      setConfirmPassword('');
      setIsDone(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className="pointer-events-none absolute -left-32 top-12 h-64 w-64 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgb(59, 130, 246), transparent)' }}
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-10 h-64 w-64 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgb(34, 211, 238), transparent)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-3xl border p-8"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {!isDone ? (
          <>
            <div className="mb-8">
              <h1 className="mb-2 text-2xl text-white">Set a new password</h1>
              <p className="text-gray-400">
                Choose a new password for your account and save it.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={FIELD_WRAPPER_STYLE}>
                <label htmlFor="new-password" className="text-gray-300" style={FIELD_LABEL_STYLE}>
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setStatusMessage(null);
                  }}
                  placeholder="At least 8 characters"
                  className={INPUT_CLASS_NAME}
                  style={{
                    ...CONTROL_HEIGHT_STYLE,
                  }}
                  minLength={8}
                  required
                  disabled={isLoading}
                />
              </div>

              <div style={FIELD_WRAPPER_STYLE}>
                <label
                  htmlFor="confirm-new-password"
                  className="text-gray-300"
                  style={FIELD_LABEL_STYLE}
                >
                  Confirm password
                </label>
                <input
                  id="confirm-new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setStatusMessage(null);
                  }}
                  placeholder="Repeat your new password"
                  className={INPUT_CLASS_NAME}
                  style={{
                    ...CONTROL_HEIGHT_STYLE,
                  }}
                  minLength={8}
                  required
                  disabled={isLoading}
                />
              </div>

              {statusMessage ? (
                <p className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-xs leading-relaxed text-blue-200">
                  {statusMessage}
                </p>
              ) : null}

              <button
                type="submit"
                aria-disabled={!canUpdatePassword}
                className="flex w-full items-center justify-center gap-2 rounded-xl text-white transition"
                style={{
                  ...CONTROL_HEIGHT_STYLE,
                  background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(168, 85, 247))',
                  color: '#ffffff',
                  WebkitTextFillColor: '#ffffff',
                  opacity: 1,
                  cursor: canUpdatePassword ? 'pointer' : 'not-allowed',
                }}
              >
                <Lock className="h-4 w-4" style={{ color: '#ffffff' }} />
                <span style={{ color: '#ffffff', fontWeight: 500 }}>
                  {isLoading ? 'Updating...' : 'Update password'}
                </span>
              </button>
            </form>

            <button
              type="button"
              onClick={onBackHome}
              className="mt-5 inline-flex items-center rounded-xl px-3 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
              style={CONTROL_HEIGHT_STYLE}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="py-4 text-center"
          >
            <div
              className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '2px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="mb-2 text-2xl text-white">Password updated</h2>
            <p className="mb-6 text-gray-400">
              Your password has been changed. You can now log in with your new password.
            </p>
            <button
              type="button"
              onClick={onBackToLogin}
              className="flex w-full items-center justify-center gap-2 rounded-xl text-white"
              style={{
                ...CONTROL_HEIGHT_STYLE,
                background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(168, 85, 247))',
                color: '#ffffff',
              }}
            >
              <ArrowLeft className="h-4 w-4" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff', fontWeight: 500 }}>Back to login</span>
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
