import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type RateLimitKey = 'login' | 'signup' | 'forgotPassword';

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function checkRateLimit(key: RateLimitKey, ip: string): Promise<boolean> {
  const redis = createRedis();
  // Dev bypass: if Redis env vars are absent, rate limiting is disabled
  if (!redis) return true;

  let limiter: Ratelimit;

  switch (key) {
    case 'login':
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '15 m'),
        analytics: false,
      });
      break;
    case 'signup':
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 h'),
        analytics: false,
      });
      break;
    case 'forgotPassword':
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        analytics: false,
      });
      break;
  }

  const { success } = await limiter.limit(ip);
  return success;
}
