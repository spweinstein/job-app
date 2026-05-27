import { CompanyForm } from '@/components/companies/company-form';

export default function NewCompanyPage() {
  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Add company</h1>
      <CompanyForm mode="create" />
    </div>
  );
}
