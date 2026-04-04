/**
 * src/index.js
 * Express application bootstrap.
 */
import express   from 'express';
import cors      from 'cors';
import dotenv    from 'dotenv';
import { initDb } from './db/index.js';
import urlRoutes  from './routes/urls.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 4000;

/* ── Middleware ── */
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Trust first proxy (for correct IP behind nginx/docker)
app.set('trust proxy', 1);

/* ── Health check ── */
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

/* ── URL shortener routes ── */
app.use('/', urlRoutes);

/* ── 404 catch-all ── */
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

/* ── Start ── */
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();