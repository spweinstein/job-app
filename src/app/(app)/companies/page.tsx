import Link from 'next/link';

import { CompanyList } from '@/components/companies/company-list';
import { createClient } from '@/lib/supabase/server';

export default async function CompaniesPage() {
  const supabase = await createClient();

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name')
    .order('name');

  if (error) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Companies</h1>
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <p>Could not load companies. Check your connection and try again.</p>
          <Link href="/companies" className="mt-2 inline-block underline">
            Retry
          </Link>
        </div>
      </div>
    );
  }

  // Application counts are wired up in Phase 3 when the applications table is created.
  const companiesWithCounts = companies.map((c) => ({
    id: c.id,
    name: c.name,
    applicationCount: 0,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Companies</h1>
      <CompanyList companies={companiesWithCounts} />
    </div>
  );
}
