/**
 * middleware/rateLimiter.js
 *
 * Custom Fixed-Window Rate Limiter — NO external libraries used.
 *
 * Algorithm (Fixed Window):
 *   - Divide time into fixed windows of WINDOW_MS milliseconds.
 *   - Each IP gets a counter that resets at the start of each window.
 *   - If count exceeds LIMIT within the window → reject with 429.
 *
 * Trade-offs vs Sliding Window:
 *   + Simpler, lower memory overhead
 *   - Can allow ~2× the limit at window boundaries (e.g., 5 at 00:59 + 5 at 01:00)
 *
 * Storage: in-process Map (sufficient for single-instance; swap for Redis in multi-node).
 */

const WINDOW_MS = 60 * 1000; // 1 minute window
const LIMIT     = 5;          // max requests per window per IP

/**
 * Map<ip, { count: number, windowStart: number }>
 * Holds rate-limit state for each client IP.
 */
const store = new Map();

/**
 * Periodically clean up stale entries to prevent memory leaks.
 * Removes entries whose window has long since expired.
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      store.delete(ip);
    }
  }
}, WINDOW_MS * 2);

/**
 * Express middleware that applies fixed-window rate limiting.
 * Attaches rate-limit headers to every response.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function rateLimiter(req, res, next) {
  // Respect X-Forwarded-For when behind a reverse proxy
  const ip  = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  const now = Date.now();

  let entry = store.get(ip);

  // Initialize or reset window if expired
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    store.set(ip, entry);
  }

  entry.count += 1;

  const remaining   = Math.max(LIMIT - entry.count, 0);
  const windowEnds  = entry.windowStart + WINDOW_MS;
  const retryAfter  = Math.ceil((windowEnds - now) / 1000); // seconds

  // Set informational headers on every response
  res.set('X-RateLimit-Limit',     String(LIMIT));
  res.set('X-RateLimit-Remaining', String(remaining));
  res.set('X-RateLimit-Reset',     String(Math.ceil(windowEnds / 1000)));

  if (entry.count > LIMIT) {
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error:       'Rate limit exceeded. Too many requests.',
      retry_after: retryAfter,
    });
  }

  next();
}