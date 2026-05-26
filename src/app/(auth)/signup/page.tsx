'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { signUp } from '@/actions/auth';
import type { ActionResult } from '@/lib/errors';
import { signUpSchema } from '@/lib/validations/auth';

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
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  );
}

export default function SignUpPage() {
  const [state, formAction] = useActionState(signUp, null);
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

  const isSuccess = state !== null && 'data' in state;

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (name !== 'email' && name !== 'password') return;
    const result = signUpSchema.shape[name].safeParse(value);
    if (!result.success) {
      setLocalErrors((prev) => ({ ...prev, [name]: result.error.errors[0]?.message ?? '' }));
    } else {
      setLocalErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const password = String(formData.get('password') ?? '');
    const result = signUpSchema.shape.password.safeParse(password);
    if (!result.success) {
      e.preventDefault();
      setLocalErrors((prev) => ({
        ...prev,
        password:
          result.error.errors[0]?.message ??
          'Password must be at least 8 characters and include a number.',
      }));
    }
  }

  function fieldError(field: string): string | undefined {
    return localErrors[field] || errorField(state, field);
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Create account</h1>

      {isSuccess ? (
        <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          Check your email to confirm your account.
        </p>
      ) : (
        <>
          {!isOnline && (
            <p className="mb-4 rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
              You appear to be offline.
            </p>
          )}

          <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                onBlur={handleBlur}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
              {fieldError('email') && (
                <p className="mt-1 text-sm text-red-600">{fieldError('email')}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                onBlur={handleBlur}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
              {fieldError('password') && (
                <p className="mt-1 text-sm text-red-600">{fieldError('password')}</p>
              )}
            </div>

            {formError(state) && <p className="text-sm text-red-600">{formError(state)}</p>}

            <SubmitButton offline={!isOnline} />
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-slate-900 hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </>
  );
}
