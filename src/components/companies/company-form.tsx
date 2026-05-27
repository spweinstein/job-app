'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createCompany, updateCompany } from '@/actions/companies';

interface CompanyFormProps {
  mode: 'create' | 'edit';
  initialValues?: {
    id: string;
    name: string;
    website: string | null;
    notes: string | null;
  };
}

interface FieldErrors {
  name?: string[];
  website?: string[];
  notes?: string[];
}

export function CompanyForm({ mode, initialValues }: CompanyFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [website, setWebsite] = useState(initialValues?.website ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError(null);
    setIsPending(true);

    const input =
      mode === 'create'
        ? { name, website, notes }
        : { id: initialValues!.id, name, website, notes };

    const result = mode === 'create' ? await createCompany(input) : await updateCompany(input);

    setIsPending(false);

    if ('error' in result) {
      if (result.error.code === 'VALIDATION_ERROR') {
        setFieldErrors((result.error.details as FieldErrors) ?? {});
      } else {
        setGlobalError(result.error.message);
      }
      return;
    }

    router.push(`/companies/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {globalError && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {globalError}
        </p>
      )}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Company name <span aria-hidden="true">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-400 focus:outline-none"
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
        />
        {fieldErrors.name && (
          <p id="name-error" role="alert" className="mt-1 text-sm text-red-600">
            {fieldErrors.name[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="website" className="mb-1 block text-sm font-medium">
          Website
        </label>
        <input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.com"
          className="w-full rounded border px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-400 focus:outline-none"
          aria-describedby={fieldErrors.website ? 'website-error' : undefined}
        />
        {fieldErrors.website && (
          <p id="website-error" role="alert" className="mt-1 text-sm text-red-600">
            {fieldErrors.website[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded border px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-400 focus:outline-none"
          aria-describedby={fieldErrors.notes ? 'notes-error' : undefined}
        />
        {fieldErrors.notes && (
          <p id="notes-error" role="alert" className="mt-1 text-sm text-red-600">
            {fieldErrors.notes[0]}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded border px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
