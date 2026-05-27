'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteCompany } from '@/actions/companies';

interface CompanyDeleteDialogProps {
  companyId: string;
  companyName: string;
  applicationCount: number;
}

export function CompanyDeleteDialog({
  companyId,
  companyName,
  applicationCount,
}: CompanyDeleteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setIsPending(true);
    const result = await deleteCompany({ id: companyId });
    setIsPending(false);

    if ('error' in result) {
      setError(result.error.message);
      return;
    }

    router.push('/companies');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
      >
        Delete company
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-neutral-900">
            <h2 id="delete-dialog-title" className="mb-2 text-base font-semibold">
              Delete {companyName}?
            </h2>
            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
              {applicationCount > 0
                ? `Deleting this company will also delete its ${applicationCount} application(s). This cannot be undone.`
                : 'This action cannot be undone.'}
            </p>

            {error && (
              <p role="alert" className="mb-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
