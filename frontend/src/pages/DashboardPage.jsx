/**
 * pages/DashboardPage.jsx
 * Dashboard: lists all URLs, shows click analytics chart on select.
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchAllUrls, fetchAnalytics } from '../utils/api';
import ClickChart from '../components/ClickChart';

export default function DashboardPage() {
  const [urls, setUrls]               = useState([]);
  const [urlsLoading, setUrlsLoading] = useState(true);
  const [urlsError, setUrlsError]     = useState(null);

  const [selected, setSelected]             = useState(null);   // selected alias
  const [analytics, setAnalytics]           = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  /* ── Fetch all URLs ── */
  const loadUrls = useCallback(async () => {
    setUrlsLoading(true);
    setUrlsError(null);
    const { data, error } = await fetchAllUrls();
    setUrlsLoading(false);
    if (error) { setUrlsError(error); return; }
    setUrls(data || []);
  }, []);

  useEffect(() => { loadUrls(); }, [loadUrls]);

  /* ── Fetch analytics for selected alias ── */
  const loadAnalytics = useCallback(async (alias) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    setAnalytics(null);
    const { data, error } = await fetchAnalytics(alias);
    setAnalyticsLoading(false);
    if (error) { setAnalyticsError(error); return; }
    setAnalytics(data);
  }, []);

  const handleSelect = useCallback((alias) => {
    if (selected === alias) return; // already selected
    setSelected(alias);
    loadAnalytics(alias);
  }, [selected, loadAnalytics]);

  const handleRefresh = useCallback(() => {
    loadUrls();
    if (selected) loadAnalytics(selected);
  }, [loadUrls, selected, loadAnalytics]);

  const totalClicks = urls.reduce((sum, u) => sum + u.total_clicks, 0);

  return (
    <div className="page dashboard-page">
      <div className="dash-header">
        <div>
          <div className="hero-badge">ANALYTICS</div>
          <h1 className="dash-title">Link Dashboard</h1>
        </div>
        <button className="btn-refresh" onClick={handleRefresh} aria-label="Refresh data">
          <span className="refresh-icon">↻</span> Refresh
        </button>
      </div>

      {/* Stats strip */}
      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-value">{urls.length}</div>
          <div className="stat-label">Total Links</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalClicks}</div>
          <div className="stat-label">Total Clicks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {urls.length ? Math.round(totalClicks / urls.length) : 0}
          </div>
          <div className="stat-label">Avg Clicks / Link</div>
        </div>
      </div>

      <div className="dash-body">
        {/* Left: URL list */}
        <div className="url-list-panel">
          <div className="panel-header">All URLs</div>

          {urlsLoading && (
            <div className="loading-state">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton-row" />
              ))}
            </div>
          )}

          {urlsError && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠</span> {urlsError}
            </div>
          )}

          {!urlsLoading && !urlsError && urls.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔗</div>
              <div>No links yet. Go shorten something!</div>
            </div>
          )}

          <ul className="url-list">
            {urls.map(url => (
              <li
                key={url.alias}
                className={`url-item ${selected === url.alias ? 'url-item-active' : ''}`}
                onClick={() => handleSelect(url.alias)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleSelect(url.alias)}
                aria-pressed={selected === url.alias}
              >
                <div className="url-item-top">
                  <span className="url-alias mono">/{url.alias}</span>
                  <span className="url-clicks">{url.total_clicks} click{url.total_clicks !== 1 ? 's' : ''}</span>
                </div>
                <div className="url-original" title={url.original_url}>
                  {url.original_url}
                </div>
                <div className="url-date">
                  {new Date(url.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Analytics chart */}
        <div className="analytics-panel">
          <div className="panel-header">
            {selected ? (
              <>7-Day Analytics — <span className="mono accent">/{selected}</span></>
            ) : (
              'Select a link to view analytics'
            )}
          </div>

          {!selected && (
            <div className="empty-state analytics-empty">
              <div className="empty-icon">📊</div>
              <div>Click any link on the left to see its click chart</div>
            </div>
          )}

          {analyticsLoading && (
            <div className="chart-loading">
              <div className="spinner-lg" />
              <div>Loading analytics…</div>
            </div>
          )}

          {analyticsError && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠</span> {analyticsError}
            </div>
          )}

          {analytics && !analyticsLoading && (
            <>
              <div className="analytics-meta">
                <div className="meta-item">
                  <div className="meta-label">Short URL</div>
                  <a href={analytics.short_url} target="_blank" rel="noopener noreferrer" className="meta-value mono">
                    {analytics.short_url}
                  </a>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Total (7d)</div>
                  <div className="meta-value accent">{analytics.total_clicks} clicks</div>
                </div>
              </div>
              <ClickChart analytics={analytics.analytics} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}