import { CompanyList } from '@/components/companies/company-list';
import { createClient } from '@/lib/supabase/server';

export default async function CompaniesPage() {
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name');

  // Application counts are wired up in Phase 3 when the applications table is created.
  const companiesWithCounts = (companies ?? []).map((c) => ({
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
