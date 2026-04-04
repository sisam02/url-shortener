/**
 * routes/urls.js
 * Express router for all URL shortener endpoints.
 */
import { Router } from 'express';
import { nanoid }  from 'nanoid';
import { pool }    from '../db/index.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validateUrl }  from '../utils/validate.js';

const router = Router();

/* ─────────────────────────────────────────────────────────
   POST /shorten
   Rate limited: 5 req/min/IP (fixed window)
   Body: { url: string }
   Returns: { alias, short_url, original_url, created_at }
───────────────────────────────────────────────────────── */
router.post('/shorten', rateLimiter, async (req, res) => {
  const { url } = req.body;

  // Validate input URL
  const { valid, message } = validateUrl(url);
  if (!valid) {
    return res.status(400).json({ error: message });
  }

  const originalUrl = url.trim();

  try {
    // Check if this URL was already shortened — return existing alias
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

    // Generate a unique 6-character alias (retry on collision)
    let alias;
    let attempts = 0;
    while (attempts < 5) {
      const candidate = nanoid(6);
      const check = await pool.query('SELECT 1 FROM urls WHERE alias = $1', [candidate]);
      if (check.rows.length === 0) {
        alias = candidate;
        break;
      }
      attempts++;
    }

    if (!alias) {
      return res.status(500).json({ error: 'Failed to generate unique alias. Please retry.' });
    }

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
   GET /urls
   Returns all shortened URLs with total click counts.
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
   GET /analytics/:alias
   Returns click counts grouped by date for the last 7 days.
───────────────────────────────────────────────────────── */
router.get('/analytics/:alias', async (req, res) => {
  const { alias } = req.params;

  try {
    // Verify alias exists
    const urlRow = await pool.query('SELECT original_url FROM urls WHERE alias = $1', [alias]);
    if (urlRow.rows.length === 0) {
      return res.status(404).json({ error: 'Alias not found.' });
    }

    // Generate a series of the last 7 days so dates with 0 clicks are included
    const result = await pool.query(`
      WITH date_series AS (
        SELECT generate_series(
          (NOW() AT TIME ZONE 'UTC')::date - INTERVAL '6 days',
          (NOW() AT TIME ZONE 'UTC')::date,
          INTERVAL '1 day'
        )::date AS day
      ),
      daily_clicks AS (
        SELECT
          (clicked_at AT TIME ZONE 'UTC')::date AS day,
          COUNT(*)::int AS clicks
        FROM clicks
        WHERE alias = $1
          AND clicked_at >= NOW() - INTERVAL '7 days'
        GROUP BY 1
      )
      SELECT
        ds.day::text AS date,
        COALESCE(dc.clicks, 0) AS clicks
      FROM date_series ds
      LEFT JOIN daily_clicks dc ON dc.day = ds.day
      ORDER BY ds.day ASC
    `, [alias]);

    return res.json({
      alias,
      original_url:  urlRow.rows[0].original_url,
      short_url:     buildShortUrl(req, alias),
      analytics:     result.rows,
      total_clicks:  result.rows.reduce((sum, r) => sum + r.clicks, 0),
    });
  } catch (err) {
    console.error('[GET /analytics/:alias]', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/* ─────────────────────────────────────────────────────────
   GET /:alias
   Redirects to the original URL and logs the click.
───────────────────────────────────────────────────────── */
router.get('/:alias', async (req, res) => {
  const { alias } = req.params;

  // Basic sanity check — aliases are alphanumeric, 6 chars
  if (!/^[A-Za-z0-9_-]{1,10}$/.test(alias)) {
    return res.status(400).json({ error: 'Invalid alias format.' });
  }

  try {
    const result = await pool.query(
      'SELECT original_url FROM urls WHERE alias = $1',
      [alias]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found.' });
    }

    // Log the click asynchronously — don't block the redirect
    pool.query('INSERT INTO clicks (alias) VALUES ($1)', [alias]).catch(err =>
      console.error('[click log]', err.message)
    );

    return res.redirect(301, result.rows[0].original_url);
  } catch (err) {
    console.error('[GET /:alias]', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/* ─── helpers ─── */

/**
 * Builds the full short URL from the request context.
 * @param {import('express').Request} req
 * @param {string} alias
 * @returns {string}
 */
function buildShortUrl(req, alias) {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/${alias}`;
}

export default router;