import { describe, it, expect } from 'vitest';

import { ErrorCode, makeError, isAppError, HTTP_STATUS } from '@/lib/errors';

describe('makeError', () => {
  it('creates an AppError with the given code and message', () => {
    const err = makeError(ErrorCode.NOT_FOUND, 'Resource not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
    expect(err.details).toBeUndefined();
  });

  it('includes details when provided', () => {
    const err = makeError(ErrorCode.VALIDATION_ERROR, 'Invalid input', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('isAppError', () => {
  it('returns true for a valid AppError', () => {
    expect(isAppError({ code: 'NOT_FOUND', message: 'not found' })).toBe(true);
  });

  it('returns false for a plain Error', () => {
    expect(isAppError(new Error('oops'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAppError(null)).toBe(false);
  });

  it('returns false for missing message', () => {
    expect(isAppError({ code: 'NOT_FOUND' })).toBe(false);
  });
});

describe('HTTP_STATUS', () => {
  it('maps every ErrorCode to an HTTP status code', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });
});
