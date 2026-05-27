'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CompanyCard } from '@/components/companies/company-card';

interface Company {
  id: string;
  name: string;
  applicationCount: number;
}

interface CompanyListProps {
  companies: Company[];
}

export function CompanyList({ companies }: CompanyListProps) {
  const [search, setSearch] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!window.navigator.onLine);
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <p className="py-8 text-center text-neutral-500">
        You appear to be offline. Companies will load when your connection is restored.
      </p>
    );
  }

  const filtered = companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <input
          type="search"
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded border px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-400 focus:outline-none"
          aria-label="Search companies"
        />
        <Link
          href="/companies/new"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Add company
        </Link>
      </div>

      {companies.length === 0 ? (
        <div className="py-12 text-center">
          <p className="mb-4 text-neutral-500">
            No companies yet. Add your first company to get started.
          </p>
          <Link
            href="/companies/new"
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Add company
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">No companies match your search.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((company) => (
            <li key={company.id}>
              <CompanyCard
                id={company.id}
                name={company.name}
                applicationCount={company.applicationCount}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
