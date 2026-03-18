# Cloudflare Setup Guide

This guide covers deploying the Movie Backend behind Cloudflare for caching, DDoS protection, and performance.

---

## 1. DNS Setup

1. Add your domain to Cloudflare
2. Point your A record to your server IP
3. **Enable the orange cloud (proxy)** — this is critical for caching and DDoS protection

```
Type  | Name    | Content       | Proxy Status
A     | api     | 203.0.113.1   | Proxied ☁️
```

---

## 2. SSL/TLS

- Set SSL mode to **Full (Strict)**
- Enable **Always Use HTTPS**
- Enable **Automatic HTTPS Rewrites**

---

## 3. Cache Rules

Create a Cache Rule for the stats endpoint:

**Rule Name**: Cache Stats API

| Setting | Value |
|---|---|
| **When** | URI Path equals `/api/v1/stats` |
| **Cache eligibility** | Eligible for cache |
| **Edge TTL** | 5 seconds (override origin) |
| **Browser TTL** | 1 second |
| **Cache Key** | Ignore query string |

> **Why 5 seconds?** At 1000 req/s, a 5-second cache means Cloudflare serves ~4,995 requests from cache for every 1 that hits your origin server. This reduces origin load by **99.9%**.

---

## 4. DDoS Protection

### Under Attack Mode
- Available at: **Security → Settings**
- Enable temporarily during active attacks
- Shows a JavaScript challenge page to visitors

### Rate Limiting (WAF)
Create custom rules:

**Rule 1: Global Rate Limit**
| Setting | Value |
|---|---|
| **When** | URI Path starts with `/api/` |
| **Rate** | 200 requests per 10 seconds |
| **Action** | Block for 60 seconds |

**Rule 2: Block POST Discovery**
| Setting | Value |
|---|---|
| **When** | Request Method equals `POST` AND URI Path does NOT equal `/api/v1/mx9k7z3q8w2p` |
| **Action** | Block |

### Bot Management
- Enable **Bot Fight Mode** (free tier)
- Consider **Super Bot Fight Mode** (Pro plan) for advanced detection

---

## 5. Page Rules (Optional)

| URL Pattern | Setting |
|---|---|
| `api.yourdomain.com/api/v1/stats` | Cache Level: Cache Everything, Edge TTL: 5s |
| `api.yourdomain.com/api/v1/mx*` | Cache Level: Bypass, Security Level: High |
| `api.yourdomain.com/health` | Cache Level: Bypass |

---

## 6. Firewall Rules

**Block non-API traffic:**
```
(not http.request.uri.path starts_with "/api/" and not http.request.uri.path eq "/health")
→ Block
```

**Geographic restrictions (optional):**
```
(ip.geoip.country ne "IN" and http.request.method eq "POST")
→ Challenge (JS Challenge)
```

---

## 7. Security Headers (Cloudflare Transform Rules)

Add response headers via **Rules → Transform Rules → Modify Response Header**:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

---

## 8. Performance Tips

1. **Enable Brotli compression** (Speed → Optimization)
2. **Enable HTTP/2** and **HTTP/3 (QUIC)**
3. **Argo Smart Routing** (paid, reduces latency by ~30%)
4. **Tiered Caching** (reduces origin requests further)

---

## Architecture Overview

```
Client Request
      │
      ▼
 ┌─────────────┐
 │  Cloudflare  │  ← DDoS protection, WAF, Bot detection
 │    Edge      │  ← Cache (serves 99%+ of GET /stats)
 │   Network    │  ← Rate limiting (200 req/10s)
 └──────┬───────┘
        │  (only cache misses reach origin)
        ▼
 ┌─────────────┐
 │   Origin     │  ← Fastify server
 │   Server     │  ← In-memory store
 │  (your VPS)  │  ← Application rate limiting (100 req/min)
 └─────────────┘
```

With this setup, your origin server handles approximately **0.1% of total traffic** — making it trivially easy to handle 1000+ req/s.
