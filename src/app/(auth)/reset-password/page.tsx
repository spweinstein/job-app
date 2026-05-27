'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { resetPassword } from '@/actions/auth-password';
import type { ActionResult } from '@/lib/errors';
import { resetPasswordSchema } from '@/lib/validations/auth';

type State = ActionResult<Record<string, never>> | null;

function errorField(state: State, field: string): string | undefined {
  if (!state || !('error' in state)) return undefined;
  return state.error.details?.[field]?.[0];
}

function formError(state: State): string | undefined {
  if (!state || !('error' in state) || state.error.details) return undefined;
  return state.error.message;
}

function SubmitButton({ offline }: { offline: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || offline}
      className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? 'Resetting…' : 'Reset password'}
    </button>
  );
}

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get('token_hash') ?? '';

  const [state, formAction] = useActionState(resetPassword, null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [password, setPassword] = useState('');
  const [matchError, setMatchError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const isExpiredError =
    state !== null &&
    'error' in state &&
    state.error.message === 'This reset link has expired. Request a new one.';

  if (!tokenHash || isExpiredError) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Reset password</h1>
        <p className="mb-4 text-sm text-red-600">This reset link has expired. Request a new one.</p>
        <Link
          href={'/forgot-password' as Route}
          className="text-sm font-medium text-slate-900 hover:underline"
        >
          Request a new reset link
        </Link>
      </>
    );
  }

  function handlePasswordBlur() {
    const result = resetPasswordSchema.shape.password.safeParse(password);
    if (!result.success) {
      setLocalErrors((prev) => ({ ...prev, password: result.error.errors[0]?.message ?? '' }));
    } else {
      setLocalErrors((prev) => ({ ...prev, password: '' }));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (password !== confirmPassword) {
      e.preventDefault();
      setMatchError('Passwords do not match.');
    } else {
      setMatchError('');
    }
  }

  function fieldError(field: string): string | undefined {
    return localErrors[field] || errorField(state, field);
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Reset password</h1>

      {!isOnline && (
        <p className="mb-4 rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          You appear to be offline.
        </p>
      )}

      <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="token_hash" value={tokenHash} />

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={handlePasswordBlur}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
          />
          {fieldError('password') && (
            <p className="mt-1 text-sm text-red-600">{fieldError('password')}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
          />
          {matchError && <p className="mt-1 text-sm text-red-600">{matchError}</p>}
        </div>

        {formError(state) && <p className="text-sm text-red-600">{formError(state)}</p>}

        <SubmitButton offline={!isOnline} />
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
