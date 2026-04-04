import { useState } from 'react';
import Navbar        from './components/Navbar';
import ShortenPage   from './pages/ShortenPage';
import DashboardPage from './pages/DashboardPage';
import './styles.css';

export default function App() {
  const [page, setPage] = useState('shorten');

  return (
    <div className="app">
      <Navbar page={page} setPage={setPage} />
      <main className="main-content">
        {page === 'shorten'   && <ShortenPage />}
        {page === 'dashboard' && <DashboardPage />}
      </main>
      <footer className="footer">
        <span className="mono">snip</span> — URL Shortener with Analytics
      </footer>
    </div>
  );
}