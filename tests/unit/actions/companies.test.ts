import { revalidatePath } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCompany, deleteCompany, updateCompany } from '@/actions/companies';
import { createClient } from '@/lib/supabase/server';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

// Reusable builder chain — each test resets terminal mock return values.
const chain = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
};
chain.select.mockReturnValue(chain);
chain.insert.mockReturnValue(chain);
chain.update.mockReturnValue(chain);
chain.delete.mockReturnValue(chain);
chain.eq.mockReturnValue(chain);

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn().mockReturnValue(chain),
};

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
});

afterEach(() => {
  vi.clearAllMocks();
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
});

// ─── createCompany ────────────────────────────────────────────────────────────

describe('createCompany', () => {
  it('returns VALIDATION_ERROR when name is empty', async () => {
    const result = await createCompany({ name: '' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns UNAUTHENTICATED when there is no session', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await createCompany({ name: 'Acme' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('returns INTERNAL_ERROR when the Supabase insert fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    chain.single.mockResolvedValue({ data: null, error: { message: 'DB error', code: '500' } });

    const result = await createCompany({ name: 'Acme' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.code).toBe('INTERNAL_ERROR');
    }
  });

  it('returns data.id and revalidates /companies on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    chain.single.mockResolvedValue({ data: { id: 'company-1' }, error: null });

    const result = await createCompany({ name: 'Acme' });
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.id).toBe('company-1');
    }
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/companies');
  });
});

// ─── updateCompany ────────────────────────────────────────────────────────────

describe('updateCompany', () => {
  const validId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('returns VALIDATION_ERROR when id is not a UUID', async () => {
    const result = await updateCompany({ id: 'not-a-uuid', name: 'Acme' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns UNAUTHENTICATED when there is no session', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await updateCompany({ id: validId, name: 'Acme' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('returns FORBIDDEN when Supabase returns PGRST116 (not found / wrong owner)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    chain.single.mockResolvedValue({
      data: null,
      error: { message: 'Row not found', code: 'PGRST116' },
    });

    const result = await updateCompany({ id: validId, name: 'Acme' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('returns INTERNAL_ERROR on other Supabase failures', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    chain.single.mockResolvedValue({ data: null, error: { message: 'DB error', code: '500' } });

    const result = await updateCompany({ id: validId, name: 'Acme' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.code).toBe('INTERNAL_ERROR');
    }
  });

  it('returns data.id and revalidates both paths on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    chain.single.mockResolvedValue({ data: { id: validId }, error: null });

    const result = await updateCompany({ id: validId, name: 'Acme Updated' });
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.id).toBe(validId);
    }
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/companies/${validId}`);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/companies');
  });
});

// ─── deleteCompany ────────────────────────────────────────────────────────────

describe('deleteCompany', () => {
  const validId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('returns VALIDATION_ERROR when id is not a UUID', async () => {
    const result = await deleteCompany({ id: 'not-a-uuid' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns UNAUTHENTICATED when there is no session', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await deleteCompany({ id: validId });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('returns INTERNAL_ERROR when the Supabase delete fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    // deleteCompany chains .delete().eq(id).eq(user_id); the second .eq() is awaited directly
    chain.eq
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce({ error: { message: 'DB error', code: '500' } });

    const result = await deleteCompany({ id: validId });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.code).toBe('INTERNAL_ERROR');
    }
  });

  it('returns data.id and revalidates /companies on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });

    const result = await deleteCompany({ id: validId });
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.id).toBe(validId);
    }
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/companies');
  });
});
