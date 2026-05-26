import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockLimit = vi.fn();
const mockSlidingWindow = vi.fn().mockReturnValue('window-config');

vi.mock('@upstash/ratelimit', () => {
  const Ratelimit = vi.fn().mockImplementation(() => ({ limit: mockLimit }));
  (Ratelimit as unknown as { slidingWindow: typeof mockSlidingWindow }).slidingWindow =
    mockSlidingWindow;
  return { Ratelimit };
});

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({})),
}));

const { checkRateLimit } = await import('@/lib/rate-limit');
const { Ratelimit } = await import('@upstash/ratelimit');

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSlidingWindow.mockReturnValue('window-config');
    // Ensure env vars are absent by default
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true (dev bypass) when env vars are absent', async () => {
    const result = await checkRateLimit('login', '1.2.3.4');
    expect(result).toBe(true);
    expect(Ratelimit).not.toHaveBeenCalled();
  });

  it('returns true when rate limit allows the request', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token123');
    mockLimit.mockResolvedValue({ success: true });
    const result = await checkRateLimit('login', '1.2.3.4');
    expect(result).toBe(true);
  });

  it('returns false when rate limit is exceeded', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token123');
    mockLimit.mockResolvedValue({ success: false });
    const result = await checkRateLimit('login', '1.2.3.4');
    expect(result).toBe(false);
  });

  it('configures login as 10 per 15 minutes', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token123');
    mockLimit.mockResolvedValue({ success: true });
    await checkRateLimit('login', '1.2.3.4');
    expect(mockSlidingWindow).toHaveBeenCalledWith(10, '15 m');
  });

  it('configures signup as 5 per hour', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token123');
    mockLimit.mockResolvedValue({ success: true });
    await checkRateLimit('signup', '1.2.3.4');
    expect(mockSlidingWindow).toHaveBeenCalledWith(5, '1 h');
  });

  it('configures forgotPassword as 3 per hour', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token123');
    mockLimit.mockResolvedValue({ success: true });
    await checkRateLimit('forgotPassword', '1.2.3.4');
    expect(mockSlidingWindow).toHaveBeenCalledWith(3, '1 h');
  });
});
