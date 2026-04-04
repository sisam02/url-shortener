/**
 * pages/ShortenPage.jsx
 * URL Shortener input page with rate-limit countdown.
 */
import { useState, useCallback } from 'react';
import { shortenUrl } from '../utils/api';
import { useCountdown } from '../hooks/useCountdown';

export default function ShortenPage() {
  const [inputUrl, setInputUrl]       = useState('');
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [loading, setLoading]         = useState(false);
  const [retryAfter, setRetryAfter]   = useState(null);
  const [copied, setCopied]           = useState(false);

  // Countdown ticks down from retryAfter → 0
  const countdown = useCountdown(retryAfter, () => setRetryAfter(null));

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!inputUrl.trim() || countdown) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const { data, error: apiError, status } = await shortenUrl(inputUrl.trim());

    setLoading(false);

    if (status === 429) {
      setRetryAfter(data?.retry_after || 60);
      setError(`Rate limit reached. Try again in ${data?.retry_after || 60}s.`);
      return;
    }

    if (apiError) {
      setError(apiError);
      return;
    }

    setResult(data);
    setInputUrl('');
  }, [inputUrl, countdown]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result.short_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const isDisabled = loading || !!countdown;

  return (
    <div className="page shorten-page">
      <div className="hero">
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-dot" />
          URL Shortener
        </div>
        <h1 className="hero-title">
          Long links,<br />
          <span className="accent">made tiny.</span>
        </h1>
        <p className="hero-sub">Paste any URL and get a crisp 6-character alias. Track every click with 7-day analytics.</p>
      </div>

      <div className="card shorten-card">
        <form onSubmit={handleSubmit} className="shorten-form" noValidate>
          <div className="input-row">
            <input
              type="url"
              className={`url-input ${error ? 'input-error' : ''}`}
              placeholder="https://your-very-long-url.com/goes/here"
              value={inputUrl}
              onChange={e => { setInputUrl(e.target.value); setError(null); }}
              disabled={isDisabled}
              autoFocus
              aria-label="URL to shorten"
            />
            <button
              type="submit"
              className={`btn-primary ${isDisabled ? 'btn-disabled' : ''}`}
              disabled={isDisabled}
            >
              {loading ? (
                <span className="spinner" aria-label="Loading" />
              ) : countdown ? (
                `Wait ${countdown}s`
              ) : (
                'Snip →'
              )}
            </button>
          </div>

          {/* Rate limit progress bar */}
          {countdown && (
            <div className="rate-limit-bar">
              <div
                className="rate-limit-fill"
                style={{ width: `${(countdown / retryAfter) * 100}%` }}
              />
            </div>
          )}
        </form>

        {/* Error message */}
        {error && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">⚠</span>
            {error}
          </div>
        )}

        {/* Success result */}
        {result && (
          <div className="result-box" role="status">
            <div className="result-label">Your short URL</div>
            <div className="result-url-row">
              <a
                href={result.short_url}
                className="result-url"
                target="_blank"
                rel="noopener noreferrer"
              >
                {result.short_url}
              </a>
              <button className="btn-copy" onClick={handleCopy} aria-label="Copy to clipboard">
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <div className="result-meta">
              Original: <span className="mono">{result.original_url.slice(0, 60)}{result.original_url.length > 60 ? '…' : ''}</span>
            </div>
          </div>
        )}
      </div>

      {/* Rate limit info */}
      <div className="info-strip">
        <span className="info-item">⚡ 5 requests / minute</span>
        <span className="info-dot">·</span>
        <span className="info-item">📊 7-day analytics</span>
        <span className="info-dot">·</span>
        <span className="info-item">🔗 301 redirect</span>
      </div>
    </div>
  );
}