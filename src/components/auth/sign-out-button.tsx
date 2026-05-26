'use client';

import { useFormStatus } from 'react-dom';

import { signOut } from '@/actions/auth';

function ButtonInner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <ButtonInner />
    </form>
  );
}
