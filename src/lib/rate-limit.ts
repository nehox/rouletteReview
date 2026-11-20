interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const store = globalThis as unknown as {
  __rouletteRateLimit?: Map<string, Bucket>;
};

const activeBuckets = store.__rouletteRateLimit ?? buckets;
store.__rouletteRateLimit = activeBuckets;

export function isRateLimited(key: string): boolean {
  const bucket = activeBuckets.get(key);
  if (!bucket) return false;
  if (bucket.resetAt < Date.now()) {
    activeBuckets.delete(key);
    return false;
  }
  return bucket.count >= MAX_ATTEMPTS;
}

export function registerFailure(key: string): void {
  const now = Date.now();
  const bucket = activeBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    activeBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function resetFailures(key: string): void {
  activeBuckets.delete(key);
}

export function retryAfterSeconds(key: string): number {
  const bucket = activeBuckets.get(key);
  if (!bucket) return 0;
  return Math.max(0, Math.ceil((bucket.resetAt - Date.now()) / 1000));
}
