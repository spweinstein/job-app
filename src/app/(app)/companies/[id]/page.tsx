import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CompanyDeleteDialog } from '@/components/companies/company-delete-dialog';
import { createClient } from '@/lib/supabase/server';

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, website, notes, created_at')
    .eq('id', id)
    .single();

  if (!company) {
    notFound();
  }

  // Application count is wired up in Phase 3 when the applications table is created.
  const applicationCount = 0;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/companies" className="mb-2 block text-sm text-neutral-500 hover:underline">
            ← Companies
          </Link>
          <h1 className="text-2xl font-bold">{company.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/companies/${company.id}/edit`}
            className="rounded border px-3 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Edit
          </Link>
          <CompanyDeleteDialog
            companyId={company.id}
            companyName={company.name}
            applicationCount={applicationCount}
          />
        </div>
      </div>

      <dl className="space-y-4">
        <div>
          <dt className="text-sm font-medium text-neutral-500">Applications</dt>
          <dd className="mt-1">{applicationCount}</dd>
        </div>

        {company.website && (
          <div>
            <dt className="text-sm font-medium text-neutral-500">Website</dt>
            <dd className="mt-1">
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {company.website}
              </a>
            </dd>
          </div>
        )}

        {company.notes && (
          <div>
            <dt className="text-sm font-medium text-neutral-500">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm">{company.notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
