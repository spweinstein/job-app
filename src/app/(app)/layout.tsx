import type { Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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
      <nav className="w-56 shrink-0 border-r p-4">
        <p className="mb-6 text-sm font-semibold">Job Tracker</p>
        <ul className="space-y-1">
          {(
            [
              { href: '/companies', label: 'Companies' },
              { href: '/applications', label: 'Applications' },
              { href: '/calendar', label: 'Calendar' },
              { href: '/automations', label: 'Automations' },
              { href: '/profile', label: 'Profile' },
            ] as { href: Route; label: string }[]
          ).map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="block rounded px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
