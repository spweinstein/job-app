import { describe, expect, it } from 'vitest';

import { createCompanySchema, updateCompanySchema } from '@/lib/validations/companies';

describe('createCompanySchema', () => {
  it('accepts a valid name only', () => {
    const result = createCompanySchema.safeParse({ name: 'Acme Corp' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Acme Corp');
      expect(result.data.website).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it('accepts all fields with a valid URL', () => {
    const result = createCompanySchema.safeParse({
      name: 'Acme Corp',
      website: 'https://acme.example.com',
      notes: 'Good place to work.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBe('https://acme.example.com');
    }
  });

  it('treats empty string website as null', () => {
    const result = createCompanySchema.safeParse({ name: 'Acme', website: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBeNull();
    }
  });

  it('rejects missing name', () => {
    const result = createCompanySchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toContain('Company name is required.');
    }
  });

  it('rejects name longer than 200 chars', () => {
    const result = createCompanySchema.safeParse({ name: 'A'.repeat(201) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toContain(
        'Company name must be 200 characters or fewer.',
      );
    }
  });

  it('rejects an invalid URL', () => {
    const result = createCompanySchema.safeParse({ name: 'Acme', website: 'not-a-url' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.website).toContain(
        'Please enter a valid URL (e.g., https://example.com).',
      );
    }
  });

  it('rejects notes longer than 2000 chars', () => {
    const result = createCompanySchema.safeParse({ name: 'Acme', notes: 'x'.repeat(2001) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.notes).toContain(
        'Notes must be 2000 characters or fewer.',
      );
    }
  });

  it('accepts notes at exactly 2000 chars', () => {
    const result = createCompanySchema.safeParse({ name: 'Acme', notes: 'x'.repeat(2000) });
    expect(result.success).toBe(true);
  });

  it('accepts name at exactly 200 chars', () => {
    const result = createCompanySchema.safeParse({ name: 'A'.repeat(200) });
    expect(result.success).toBe(true);
  });
});

describe('updateCompanySchema', () => {
  it('requires a valid uuid id field', () => {
    const result = updateCompanySchema.safeParse({ id: 'not-a-uuid', name: 'Acme' });
    expect(result.success).toBe(false);
  });

  it('accepts valid update input', () => {
    const result = updateCompanySchema.safeParse({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Acme Corporation',
      website: 'https://acme.example.com',
    });
    expect(result.success).toBe(true);
  });
});
