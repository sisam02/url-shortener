# ✂ Snip — URL Shortener

A URL shortener with click analytics and rate limiting, built with Node.js, PostgreSQL, and React.

---

## Running the App

### With Docker (recommended)

```bash
git clone https://github.com/yourname/snip.git
cd snip
cp .env.example .env
docker compose up --build
```

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000  |
| Backend  | http://localhost:4000  |

### Without Docker

**Prerequisites:** Node.js 20+, PostgreSQL 14+

```bash
# 1. Create the database
psql -U postgres -c "CREATE DATABASE urlshortener;"

# 2. Start the backend
cd backend
cp .env.example .env      # edit DB credentials if needed
npm install
npm run dev               # runs on http://localhost:4000

# 3. Start the frontend (new terminal)
cd frontend
npm install
REACT_APP_API_URL=http://localhost:4000 npm start
```

---

## Rate Limiter — How It Works

The rate limiter is implemented from scratch in `backend/src/middleware/rateLimiter.js` using the **Fixed Window** algorithm — no external libraries.

### The idea

Time is divided into fixed 60-second windows. Each IP address gets a request counter that resets at the start of every new window. Once an IP exceeds **5 requests within a window**, all further requests are rejected with a `429` response until the window resets.

```
Window 1 (0s – 60s)        Window 2 (60s – 120s)
┌──────────────────────┐    ┌──────────────────────┐
│ req 1  ✓  count = 1  │    │ req 1  ✓  count = 1  │
│ req 2  ✓  count = 2  │    │ ...                  │
│ req 3  ✓  count = 3  │    └──────────────────────┘
│ req 4  ✓  count = 4  │
│ req 5  ✓  count = 5  │
│ req 6  ✗  429        │  ← blocked until window resets
└──────────────────────┘
```




The frontend reads `retry_after` from the 429 response and shows a live countdown, disabling the submit button until the window resets.

### Trade-off worth knowing

A client can send 5 requests at `t=59s` and 5 more at `t=61s` — both valid windows — effectively making 10 requests in 2 seconds. This **boundary burst** is the known weakness of fixed windows vs sliding windows. For a URL shortener it's an acceptable trade-off given the simplicity.