/**
 * routes/urls.js
 * All URL shortener API routes.
 *
 * IMPORTANT — route order matters:
 *   /health, /shorten, /urls, /analytics/:alias  must all be declared
 *   BEFORE the catch-all  /:alias  redirect route.
 */
import { Router } from 'express';
import { nanoid }  from 'nanoid';
import { pool }    from '../db/index.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validateUrl }  from '../utils/validate.js';

const router = Router();

/* ─────────────────────────────────────────────────────────
   POST /shorten  — create a short URL
   Rate limited: 5 req/min/IP
───────────────────────────────────────────────────────── */
router.post('/shorten', rateLimiter, async (req, res) => {
  const { url } = req.body;

  const { valid, message } = validateUrl(url);
  if (!valid) return res.status(400).json({ error: message });

  const originalUrl = url.trim();

  try {
    // Return existing alias if this URL was already shortened
    const existing = await pool.query(
      'SELECT alias, original_url, created_at FROM urls WHERE original_url = $1 LIMIT 1',
      [originalUrl]
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      return res.status(200).json({
        alias:        row.alias,
        short_url:    buildShortUrl(req, row.alias),
        original_url: row.original_url,
        created_at:   row.created_at,
      });
    }

    // Generate unique 6-char alias
    let alias;
    for (let i = 0; i < 5; i++) {
      const candidate = nanoid(6);
      const check = await pool.query('SELECT 1 FROM urls WHERE alias = $1', [candidate]);
      if (check.rows.length === 0) { alias = candidate; break; }
    }
    if (!alias) return res.status(500).json({ error: 'Failed to generate unique alias.' });

    const result = await pool.query(
      'INSERT INTO urls (alias, original_url) VALUES ($1, $2) RETURNING alias, original_url, created_at',
      [alias, originalUrl]
    );

    const row = result.rows[0];
    return res.status(201).json({
      alias:        row.alias,
      short_url:    buildShortUrl(req, row.alias),
      original_url: row.original_url,
      created_at:   row.created_at,
    });
  } catch (err) {
    console.error('[POST /shorten]', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/* ─────────────────────────────────────────────────────────
   GET /urls  — list all URLs with total click counts
───────────────────────────────────────────────────────── */
router.get('/urls', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.alias,
        u.original_url,
        u.created_at,
        COUNT(c.id)::int AS total_clicks
      FROM urls u
      LEFT JOIN clicks c ON c.alias = u.alias
      GROUP BY u.id, u.alias, u.original_url, u.created_at
      ORDER BY u.created_at DESC
    `);
    return res.json(result.rows.map(row => ({
      ...row,
      short_url: buildShortUrl(req, row.alias),
    })));
  } catch (err) {
    console.error('[GET /urls]', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/* ─────────────────────────────────────────────────────────
   GET /analytics/:alias  — 7-day click counts grouped by date
───────────────────────────────────────────────────────── */
router.get('/analytics/:alias', async (req, res) => {
  const { alias } = req.params;

  try {
    const urlRow = await pool.query(
      'SELECT original_url FROM urls WHERE alias = $1', [alias]
    );
    if (urlRow.rows.length === 0) {
      return res.status(404).json({ error: 'Alias not found.' });
    }

    /*
     * Generate a 7-day series and LEFT JOIN actual click counts.
     * - clicked_at is stored as TIMESTAMPTZ (UTC in Postgres default)
     * - We cast to date directly — no timezone gymnastics needed
     *   because CURRENT_DATE in Postgres is the server's local date,
     *   and the cast of TIMESTAMPTZ → date also uses the server timezone.
     *   Both sides of the join use the same timezone so dates always match.
     * - COUNT(*) counts ALL rows for that alias+date combination.
     */
    const result = await pool.query(`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - 6,
          CURRENT_DATE,
          '1 day'::interval
        )::date AS day
      ),
      daily_clicks AS (
        SELECT
          clicked_at::date AS day,
          COUNT(*)::int    AS clicks
        FROM clicks
        WHERE alias = $1
          AND clicked_at >= CURRENT_DATE - 6
        GROUP BY clicked_at::date
      )
      SELECT
        to_char(ds.day, 'YYYY-MM-DD') AS date,
        COALESCE(dc.clicks, 0)        AS clicks
      FROM date_series  ds
      LEFT JOIN daily_clicks dc ON dc.day = ds.day
      ORDER BY ds.day ASC
    `, [alias]);

    const total = result.rows.reduce((sum, r) => sum + Number(r.clicks), 0);

    return res.json({
      alias,
      original_url: urlRow.rows[0].original_url,
      short_url:    buildShortUrl(req, alias),
      analytics:    result.rows,
      total_clicks: total,
    });
  } catch (err) {
    console.error('[GET /analytics/:alias]', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/* ─────────────────────────────────────────────────────────
   GET /:alias  — redirect to original URL + log the click
   ⚠  MUST be the LAST route — it matches anything
───────────────────────────────────────────────────────── */
router.get('/:alias', async (req, res) => {
  const { alias } = req.params;

  if (!/^[A-Za-z0-9_-]{1,10}$/.test(alias)) {
    return res.status(400).json({ error: 'Invalid alias format.' });
  }

  try {
    const result = await pool.query(
      'SELECT original_url FROM urls WHERE alias = $1', [alias]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found.' });
    }

    /*
     * INSERT the click BEFORE redirecting so it is always recorded.
     * Using 302 (temporary) instead of 301 (permanent) so browsers
     * never cache the redirect — every click hits the server and is counted.
     */
    await pool.query(
      'INSERT INTO clicks (alias, clicked_at) VALUES ($1, NOW())',
      [alias]
    );

    // 302 = temporary redirect — browsers will NOT cache this
    return res.redirect(302, result.rows[0].original_url);
  } catch (err) {
    console.error('[GET /:alias]', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/* ── helper ── */
function buildShortUrl(req, alias) {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/${alias}`;
}

export default router;