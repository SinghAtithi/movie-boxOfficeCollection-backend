# Movie Box Office Stats — API Documentation

## Base URL
```
https://your-domain.com   (production, behind Cloudflare)
http://localhost:3000      (development)
```

---

## Endpoints

### `GET /api/v1/stats`

Returns the current interpolated box office statistics.

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalRevenue": 142587,
    "lastTwentyFourHourRevenue": 26341,
    "totalTicketSales": 5234,
    "_meta": {
      "lastUpdatedAt": "2026-03-18T15:00:00.000Z",
      "elapsedSeconds": 3600
    }
  },
  "timestamp": "2026-03-18T16:00:00.000Z"
}
```

| Field | Type | Description |
|---|---|---|
| `totalRevenue` | `number` | Current interpolated total revenue |
| `lastTwentyFourHourRevenue` | `number` | Current interpolated 24h revenue |
| `totalTicketSales` | `number` | Current interpolated ticket sales count |
| `_meta.lastUpdatedAt` | `string\|null` | When data was last set via POST |
| `_meta.elapsedSeconds` | `number` | Seconds elapsed since last POST |

**Caching**
- Browser: `max-age=1` (1 second)
- Cloudflare CDN: `s-maxage=5` (5 seconds)
- Stale-while-revalidate: 10 seconds

**Rate Limit**: 100 requests/minute per IP

---

### `POST /api/v1/mx9k7z3q8w2p`

Updates box office data. **This is a secret endpoint — do not expose publicly.**

**Headers** (required)
| Header | Value | Description |
|---|---|---|
| `Content-Type` | `application/json` | Required |
| `X-Ingest-Key` | `<your-secret>` | Must match `INGEST_SECRET` env var |

**Request Body**
```json
{
  "current": {
    "totalRevenue": 150000,
    "lastTwentyFourHourRevenue": 25000,
    "totalTicketSales": 5000
  },
  "next24Hours": {
    "totalRevenue": 200000,
    "lastTwentyFourHourRevenue": 35000,
    "totalTicketSales": 7500
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `current.totalRevenue` | `number` | ✅ | Starting total revenue right now |
| `current.lastTwentyFourHourRevenue` | `number` | ✅ | Starting 24h revenue |
| `current.totalTicketSales` | `number` | ✅ | Starting ticket count |
| `next24Hours.totalRevenue` | `number` | ✅ | Target total revenue in 24h |
| `next24Hours.lastTwentyFourHourRevenue` | `number` | ✅ | Target 24h revenue in 24h |
| `next24Hours.totalTicketSales` | `number` | ✅ | Target ticket count in 24h |

**Response** `200 OK`
```json
{
  "success": true,
  "message": "Data updated successfully. Interpolation will begin from current values toward next24Hours targets over the next 24 hours.",
  "updatedAt": "2026-03-18T15:00:00.000Z"
}
```

**Error Responses**
| Status | Reason |
|---|---|
| `401 Unauthorized` | Missing or invalid `X-Ingest-Key` header |
| `400 Bad Request` | Invalid request body (schema validation failure) |
| `429 Too Many Requests` | Rate limit exceeded (5 req/min for this endpoint) |

---

### `GET /health`

Health check endpoint.

```json
{
  "status": "ok",
  "uptime": 3600.5,
  "timestamp": "2026-03-18T16:00:00.000Z"
}
```

---

## How Interpolation Works

When you POST data, you provide two snapshots:
- **`current`**: The values to display right now
- **`next24Hours`**: The values to reach after 24 hours

The server calculates interpolated values **every 1 second** using linear interpolation:

```
displayValue = current + (next24Hours - current) × (elapsedSeconds / 86400)
```

This makes the GET endpoint return values that smoothly increase from `current` toward `next24Hours` over 24 hours — creating a live-counter effect.

**Example:**
- POST: `current.totalRevenue = 100,000` / `next24Hours.totalRevenue = 200,000`
- After 1 hour (3600s): `displayValue ≈ 100,000 + 100,000 × (3600/86400) ≈ 104,167`
- After 12 hours: `displayValue ≈ 150,000`
- After 24 hours: `displayValue = 200,000` (clamped)

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `NODE_ENV` | `development` | Environment (`production` / `development`) |
| `INGEST_SECRET` | `default-change-me-in-production` | Secret key for POST endpoint |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your secret key

# 3. Run server
npm run dev       # Development (with auto-reload)
npm run start     # Production

# 4. Test
curl http://localhost:3000/api/v1/stats
curl http://localhost:3000/health
```
