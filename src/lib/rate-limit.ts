// Fixed-window in-memory rate limiter. Suitable for a single application instance;
// use a shared store (e.g. Redis) when running several instances behind a load balancer.

type Bucket = { count: number; resetAt: number };
const globalStore = globalThis as unknown as { __rpRateLimit?: Map<string, Bucket> };
const buckets = (globalStore.__rpRateLimit ??= new Map<string, Bucket>());

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (buckets.size > 10_000) sweep(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  bucket.count++;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

function sweep(now: number) {
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}
