/**
 * utils/api.js
 * Centralized API client for all backend calls.
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

/**
 * Generic fetch wrapper that always returns { data, error, status }.
 */
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    const data = await res.json();
    return { data, error: res.ok ? null : data.error, status: res.status };
  } catch (err) {
    return { data: null, error: 'Network error — is the server running?', status: 0 };
  }
}

/** Shorten a URL. Returns { data, error, status } where status 429 = rate limited. */
export async function shortenUrl(url) {
  return apiFetch('/shorten', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

/** Fetch all URLs with click totals. */
export async function fetchAllUrls() {
  return apiFetch('/urls');
}

/** Fetch 7-day analytics for a specific alias. */
export async function fetchAnalytics(alias) {
  return apiFetch(`/analytics/${alias}`);
}