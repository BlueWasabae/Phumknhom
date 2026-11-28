import type { NextFunction, Request, Response } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  label: string;
}

/**
 * Update 3.0 — Zero-Dependency Sliding-Window API Rate Limiter
 * Protects sensitive economy endpoints (/api/save, /api/auction/*, /api/trade/*,
 * /api/promo/*, /api/checkout/*, /api/krom/*) against spam & double-click duping.
 */
export function createSlidingWindowRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, label } = options;
  const buckets = new Map<string, number[]>();
  let lastSweepAt = Date.now();

  const resolveKey = (req: Request): string => {
    const fwd = req.headers['x-forwarded-for'];
    const ip =
      typeof fwd === 'string' && fwd.trim()
        ? fwd.split(',')[0].trim()
        : req.ip || req.socket?.remoteAddress || 'unknown';
    const auth = req.headers.authorization;
    const tokenSuffix = typeof auth === 'string' && auth.length > 16 ? auth.slice(-16) : '';
    return `${label}:${ip}:${tokenSuffix}`;
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const cutoff = now - windowMs;

    // Periodic memory sweep so idle buckets never grow unbounded
    if (now - lastSweepAt > 60_000) {
      lastSweepAt = now;
      for (const [k, stamps] of buckets.entries()) {
        const active = stamps.filter((t) => t > cutoff);
        if (active.length === 0) buckets.delete(k);
        else buckets.set(k, active);
      }
    }

    const key = resolveKey(req);
    const existing = (buckets.get(key) ?? []).filter((t) => t > cutoff);

    if (existing.length >= maxRequests) {
      const oldest = existing[0] ?? now;
      const retrySec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.status(429).json({
        ok: false,
        error: `Rate limit exceeded on ${label}. Please wait ${retrySec}s and try again.`,
        retryAfterSec: retrySec,
      });
      return;
    }

    existing.push(now);
    buckets.set(key, existing);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - existing.length)));
    next();
  };
}
