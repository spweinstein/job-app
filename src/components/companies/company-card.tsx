import Link from 'next/link';

import { cn } from '@/lib/utils';

interface CompanyCardProps {
  id: string;
  name: string;
  applicationCount: number;
  className?: string;
}

export function CompanyCard({ id, name, applicationCount, className }: CompanyCardProps) {
  return (
    <div className={cn('flex items-center justify-between rounded-lg border p-4', className)}>
      <div>
        <Link href={`/companies/${id}`} className="font-medium hover:underline">
          {name}
        </Link>
        <p className="text-sm text-neutral-500">
          {applicationCount} application{applicationCount !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/companies/${id}/edit`}
          className="rounded px-3 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}
