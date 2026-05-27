import { z } from 'zod';

const websiteField = z.preprocess(
  (val) => (val === '' || val == null ? null : val),
  z.string().url('Please enter a valid URL (e.g., https://example.com).').nullable(),
);

const notesField = z.preprocess(
  (val) => (val === '' || val == null ? null : val),
  z.string().max(2000, 'Notes must be 2000 characters or fewer.').nullable(),
);

export const createCompanySchema = z.object({
  name: z
    .string()
    .min(1, 'Company name is required.')
    .max(200, 'Company name must be 200 characters or fewer.'),
  website: websiteField,
  notes: notesField,
});

export const updateCompanySchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, 'Company name is required.')
    .max(200, 'Company name must be 200 characters or fewer.'),
  website: websiteField,
  notes: notesField,
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
