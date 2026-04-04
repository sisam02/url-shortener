/**
 * components/Navbar.jsx
 * Top navigation bar with page switcher.
 */
export default function Navbar({ page, setPage }) {
  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => setPage('shorten')} role="button" tabIndex={0}>
        <span className="nav-logo">✂</span>
        <span className="nav-name">snip</span>
      </div>

      <div className="nav-links">
        <button
          className={`nav-link ${page === 'shorten' ? 'nav-link-active' : ''}`}
          onClick={() => setPage('shorten')}
        >
          Shorten
        </button>
        <button
          className={`nav-link ${page === 'dashboard' ? 'nav-link-active' : ''}`}
          onClick={() => setPage('dashboard')}
        >
          Dashboard
        </button>
      </div>
    </nav>
  );
}