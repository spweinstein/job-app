import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CompanyForm } from '@/components/companies/company-form';
import { createClient } from '@/lib/supabase/server';

interface EditCompanyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, website, notes')
    .eq('id', id)
    .single();

  if (!company) {
    notFound();
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link
          href={`/companies/${company.id}`}
          className="mb-2 block text-sm text-neutral-500 hover:underline"
        >
          ← {company.name}
        </Link>
        <h1 className="text-2xl font-bold">Edit company</h1>
      </div>
      <CompanyForm
        mode="edit"
        initialValues={{
          id: company.id,
          name: company.name,
          website: company.website,
          notes: company.notes,
        }}
      />
    </div>
  );
}
