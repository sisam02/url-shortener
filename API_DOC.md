# Snip — API Documentation

Base URL: `http://localhost:4000`

---

## Endpoints

### 1. Shorten a URL
**POST** `/shorten`

Rate limited: 5 requests/minute per IP.

**Request**
```json
POST /shorten
Content-Type: application/json

{
  "url": "https://www.example.com/some/very/long/path"
}
```

**Response `201 Created`**
```json
{
  "alias": "aB3xYz",
  "short_url": "http://localhost:4000/aB3xYz",
  "original_url": "https://www.example.com/some/very/long/path",
  "created_at": "2024-04-05T10:30:00.000Z"
}
```

**Response `200 OK`** — same URL was already shortened, returns existing record.

**Response `400 Bad Request`**
```json
{
  "error": "URL must use http or https protocol."
}
```

**Response `429 Too Many Requests`**
```json
{
  "error": "Rate limit exceeded. Too many requests.",
  "retry_after": 42
}
```
```
Headers:
  X-RateLimit-Limit:     5
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset:     1712314260
  Retry-After:           42
```

---

### 2. Redirect to Original URL
**GET** `/:alias`

Redirects to the original URL and logs the click.

**Request**
```
GET /aB3xYz
```

**Response `302 Found`**
```
Location: https://www.example.com/some/very/long/path
```

**Response `404 Not Found`**
```json
{
  "error": "Short URL not found."
}
```

---

### 3. Get 7-Day Analytics
**GET** `/analytics/:alias`

Returns daily click counts for the last 7 days. Days with zero clicks are always included.

**Request**
```
GET /analytics/aB3xYz
```

**Response `200 OK`**
```json
{
  "alias": "aB3xYz",
  "short_url": "http://localhost:4000/aB3xYz",
  "original_url": "https://www.example.com/some/very/long/path",
  "total_clicks": 27,
  "analytics": [
    { "date": "2024-03-30", "clicks": 0 },
    { "date": "2024-03-31", "clicks": 4 },
    { "date": "2024-04-01", "clicks": 9 },
    { "date": "2024-04-02", "clicks": 3 },
    { "date": "2024-04-03", "clicks": 7 },
    { "date": "2024-04-04", "clicks": 2 },
    { "date": "2024-04-05", "clicks": 2 }
  ]
}
```

**Response `404 Not Found`**
```json
{
  "error": "Alias not found."
}
```

---

### 4. List All URLs
**GET** `/urls`

Returns all shortened URLs with their total click counts, newest first.

**Request**
```
GET /urls
```

**Response `200 OK`**
```json
[
  {
    "alias": "aB3xYz",
    "short_url": "http://localhost:4000/aB3xYz",
    "original_url": "https://www.example.com/some/very/long/path",
    "created_at": "2024-04-05T10:30:00.000Z",
    "total_clicks": 27
  },
  {
    "alias": "mK9pQr",
    "short_url": "http://localhost:4000/mK9pQr",
    "original_url": "https://github.com/someuser/somerepo",
    "created_at": "2024-04-04T08:15:00.000Z",
    "total_clicks": 5
  }
]
```

---

### 5. Health Check
**GET** `/health`

**Request**
```
GET /health
```

**Response `200 OK`**
```json
{
  "status": "ok",
  "ts": "2024-04-05T10:30:00.000Z"
}
```

---

## Error Reference

| Status | Meaning                              |
|--------|--------------------------------------|
| 400    | Invalid or missing URL               |
| 404    | Alias does not exist                 |
| 429    | Rate limit exceeded — check `retry_after` |
| 500    | Internal server error                |