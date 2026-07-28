// Simple in-memory sliding-window rate limiter.
// Note: state is per server instance. In a horizontally scaled/serverless
// deployment this is a best-effort mitigation, not a hard global guarantee.
// For strict global limits, pair this with an edge/WAF rate-limit rule.

type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()

// Periodically evict expired buckets to bound memory usage.
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) store.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

/**
 * @param key      unique identifier for the caller+action (e.g. `report:<ip>`)
 * @param limit    max requests allowed within the window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  let bucket = store.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    store.set(key, bucket)
  }

  bucket.count += 1
  const remaining = Math.max(0, limit - bucket.count)
  const allowed = bucket.count <= limit

  return {
    allowed,
    limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

/** Extract a best-effort client IP from proxy headers. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

/** Standard headers to attach to a rate-limited response. */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(Math.ceil(r.resetAt / 1000)),
    ...(r.allowed ? {} : { 'Retry-After': String(r.retryAfterSeconds) }),
  }
}
