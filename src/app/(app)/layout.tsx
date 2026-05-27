import type { Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-5">
          <p className="text-base font-semibold text-slate-900">Job Tracker</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {(
            [
              { href: '/companies', label: 'Companies' },
              { href: '/applications', label: 'Applications' },
              { href: '/calendar', label: 'Calendar' },
              { href: '/automations', label: 'Automations' },
              { href: '/profile', label: 'Profile' },
            ] as { href: Route; label: string }[]
          ).map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block rounded px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
