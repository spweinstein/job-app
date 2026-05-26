import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signIn, signOut, signUp } from '@/actions/auth';
import { resetPassword, sendPasswordResetEmail } from '@/actions/auth-password';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn() }));
vi.mock('@/lib/request', () => ({ getClientIp: vi.fn().mockResolvedValue('1.2.3.4') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

type SupabaseMock = {
  auth: {
    signUp: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    resetPasswordForEmail: ReturnType<typeof vi.fn>;
    verifyOtp: ReturnType<typeof vi.fn>;
    updateUser: ReturnType<typeof vi.fn>;
  };
};

function makeMock(): SupabaseMock {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({}),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkRateLimit).mockResolvedValue(true);
  vi.mocked(createClient).mockResolvedValue(makeMock() as unknown as Awaited<ReturnType<typeof createClient>>);
});

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------

describe('signUp', () => {
  it('returns VALIDATION_ERROR for invalid email', async () => {
    const fd = new FormData();
    fd.set('email', 'not-an-email');
    fd.set('password', 'Password1!');
    const result = await signUp(null, fd);
    expect(result).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns VALIDATION_ERROR for weak password', async () => {
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'weak');
    const result = await signUp(null, fd);
    expect(result).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns RATE_LIMITED when checkRateLimit returns false', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'Password1!');
    const result = await signUp(null, fd);
    expect(result).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });

  it('returns CONFLICT when supabase reports already registered', async () => {
    const mock = makeMock();
    mock.auth.signUp.mockResolvedValue({ error: { message: 'User already registered', code: null } });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);
    const fd = new FormData();
    fd.set('email', 'exists@example.com');
    fd.set('password', 'Password1!');
    const result = await signUp(null, fd);
    expect(result).toMatchObject({
      error: { code: 'CONFLICT', message: 'An account with this email already exists.' },
    });
  });

  it('returns CONFLICT via error.code user_already_exists', async () => {
    const mock = makeMock();
    mock.auth.signUp.mockResolvedValue({ error: { message: 'other', code: 'user_already_exists' } });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);
    const fd = new FormData();
    fd.set('email', 'exists@example.com');
    fd.set('password', 'Password1!');
    const result = await signUp(null, fd);
    expect(result).toMatchObject({ error: { code: 'CONFLICT' } });
  });

  it('returns INTERNAL_ERROR on unexpected supabase error', async () => {
    const mock = makeMock();
    mock.auth.signUp.mockResolvedValue({ error: { message: 'server error', code: 'unexpected' } });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'Password1!');
    const result = await signUp(null, fd);
    expect(result).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
  });

  it('returns { data: {} } on success', async () => {
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'Password1!');
    const result = await signUp(null, fd);
    expect(result).toEqual({ data: {} });
  });
});

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------

describe('signIn', () => {
  it('returns VALIDATION_ERROR for empty email', async () => {
    const fd = new FormData();
    fd.set('email', '');
    fd.set('password', 'Password1!');
    const result = await signIn(null, fd);
    expect(result).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns VALIDATION_ERROR for empty password', async () => {
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', '');
    const result = await signIn(null, fd);
    expect(result).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns RATE_LIMITED when checkRateLimit returns false', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'Password1!');
    const result = await signIn(null, fd);
    expect(result).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });

  it('returns UNAUTHENTICATED on wrong credentials', async () => {
    const mock = makeMock();
    mock.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'WrongPass1!');
    const result = await signIn(null, fd);
    expect(result).toMatchObject({
      error: { code: 'UNAUTHENTICATED', message: 'Invalid email or password.' },
    });
  });

  it('calls redirect to /dashboard on success', async () => {
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'Password1!');
    await signIn(null, fd);
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('calls redirect to safe redirectTo path on success', async () => {
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'Password1!');
    fd.set('redirectTo', '/applications');
    await signIn(null, fd);
    expect(redirect).toHaveBeenCalledWith('/applications');
  });

  it('ignores redirectTo that does not start with /', async () => {
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'Password1!');
    fd.set('redirectTo', 'https://evil.com');
    await signIn(null, fd);
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

describe('signOut', () => {
  it('calls supabase signOut and redirects to /login', async () => {
    const mock = makeMock();
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);
    await signOut();
    expect(mock.auth.signOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});

// ---------------------------------------------------------------------------
// sendPasswordResetEmail
// ---------------------------------------------------------------------------

describe('sendPasswordResetEmail', () => {
  it('returns VALIDATION_ERROR for invalid email', async () => {
    const fd = new FormData();
    fd.set('email', 'notanemail');
    const result = await sendPasswordResetEmail(null, fd);
    expect(result).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns RATE_LIMITED when checkRateLimit returns false', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    const result = await sendPasswordResetEmail(null, fd);
    expect(result).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });

  it('returns { data: {} } for a valid email (prevents enumeration)', async () => {
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    const result = await sendPasswordResetEmail(null, fd);
    expect(result).toEqual({ data: {} });
  });

  it('returns { data: {} } even when supabase call fails (prevents enumeration)', async () => {
    const mock = makeMock();
    mock.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'User not found' } });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);
    const fd = new FormData();
    fd.set('email', 'unknown@example.com');
    const result = await sendPasswordResetEmail(null, fd);
    expect(result).toEqual({ data: {} });
  });
});

// ---------------------------------------------------------------------------
// resetPassword
// ---------------------------------------------------------------------------

describe('resetPassword', () => {
  it('returns VALIDATION_ERROR for missing token_hash', async () => {
    const fd = new FormData();
    fd.set('token_hash', '');
    fd.set('password', 'NewPass1!');
    const result = await resetPassword(null, fd);
    expect(result).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns VALIDATION_ERROR for weak password', async () => {
    const fd = new FormData();
    fd.set('token_hash', 'validtoken');
    fd.set('password', 'weak');
    const result = await resetPassword(null, fd);
    expect(result).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns VALIDATION_ERROR with expired message when verifyOtp fails', async () => {
    const mock = makeMock();
    mock.auth.verifyOtp.mockResolvedValue({ error: { message: 'Token expired' } });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);
    const fd = new FormData();
    fd.set('token_hash', 'expiredtoken');
    fd.set('password', 'NewPass1!');
    const result = await resetPassword(null, fd);
    expect(result).toMatchObject({
      error: { code: 'VALIDATION_ERROR', message: 'This reset link has expired. Request a new one.' },
    });
  });

  it('returns INTERNAL_ERROR when updateUser fails', async () => {
    const mock = makeMock();
    mock.auth.updateUser.mockResolvedValue({ error: { message: 'DB error' } });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);
    const fd = new FormData();
    fd.set('token_hash', 'validtoken');
    fd.set('password', 'NewPass1!');
    const result = await resetPassword(null, fd);
    expect(result).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
  });

  it('signs out and redirects to /login?reset=success on success', async () => {
    const mock = makeMock();
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);
    const fd = new FormData();
    fd.set('token_hash', 'validtoken');
    fd.set('password', 'NewPass1!');
    await resetPassword(null, fd);
    expect(mock.auth.signOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/login?reset=success');
  });
});
