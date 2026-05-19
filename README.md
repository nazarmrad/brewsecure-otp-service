# brewsecure-otp-service

Standalone Node.js/Express microservice that generates and verifies one-time passwords (OTPs) for the **ElevenLabs conversational AI agent**. The agent — not a human browser — calls this service. All responses are JSON consumed by the LLM to route conversation flow.

## Architecture

```
ElevenLabs agent
      │  POST /otp/generate
      │  POST /otp/verify
      ▼
┌─────────────────────┐   private VLAN   ┌────────────────────────┐
│  brewsecure-otp-    │ ───────────────► │  brewsecure-backend    │
│  service  (eth0)    │  /internal/      │  (SQLite users table)  │
│  port 3000          │  user-lookup     │  port 3001             │
└─────────────────────┘                  └────────────────────────┘
      │
  Redis (127.0.0.1:6379, Docker)
```

- **eth0** — public, receives traffic from ElevenLabs
- **eth1** — private VLAN only, used for internal user-lookup calls to `brewsecure-backend`
- Redis stores OTPs in memory only; no database on this service

---

## Redis Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Start Redis bound to localhost only
docker run -d \
  --name redis \
  --restart always \
  -p 127.0.0.1:6379:6379 \
  redis:alpine

# Verify
docker exec redis redis-cli ping
# → PONG
```

---

## Environment Setup

```bash
cp .env.example .env
# Edit .env and fill in real values
```

| Variable | Description |
|---|---|
| `PORT` | Express port (default `3000`) |
| `API_KEY` | Secret header value for `X-API-Key` — strong random string |
| `REDIS_URL` | Redis connection string (default `redis://127.0.0.1:6379`) |
| `WEB_SERVER_INTERNAL_URL` | Full URL of the internal user-lookup endpoint on the VLAN |
| `INTERNAL_SECRET` | Shared secret sent as `X-Internal-Secret` to the web server |
| `WEBHOOK_URL` | Endpoint that receives `{ email, code }` to deliver the OTP |
| `OTP_TTL_SECONDS` | OTP expiry in seconds (default `300`) |
| `OTP_LENGTH` | Informational — code is always 6 digits |

---

## Start the Service

```bash
npm install
npm start
```

---

## API Reference

All requests require:
```
X-API-Key: <your API_KEY>
```

Missing or wrong key → `401 { "error": "Unauthorized" }`.

> **Design note:** All business-logic failures return **HTTP 200** with a `reason` field. Non-200 codes (`401`, `400`, `502`) signal infrastructure problems. This lets the ElevenLabs LLM branch purely on `reason` without special-casing HTTP status codes.

---

### POST /otp/generate

Verify the user exists, generate a 6-digit OTP, store it in Redis, deliver via webhook.

**Request**
```bash
curl -X POST http://localhost:3000/otp/generate \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com"}'
```

**Responses**

| Condition | HTTP | Body |
|---|---|---|
| Missing email and phone | 400 | `{"success":false,"reason":"missing_identifier"}` |
| Web server unreachable / 5xx | 502 | `{"success":false,"reason":"user_lookup_failed"}` |
| User not in database | 200 | `{"success":false,"reason":"user_not_found"}` |
| OTP sent successfully | 200 | `{"success":true,"message":"OTP sent"}` |

---

### POST /otp/verify

Validate the code the user spoke to the ElevenLabs agent.

**Request**
```bash
curl -X POST http://localhost:3000/otp/verify \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "code": "482910"}'
```

**Responses**

| Condition | HTTP | Body |
|---|---|---|
| Missing email and phone | 400 | `{"success":false,"reason":"missing_identifier"}` |
| Missing code | 400 | `{"success":false,"reason":"missing_code"}` |
| Key expired or never generated | 200 | `{"success":false,"reason":"otp_expired_or_not_found"}` |
| Code already used | 200 | `{"success":false,"reason":"otp_already_used"}` |
| Wrong code | 200 | `{"success":false,"reason":"otp_invalid"}` |
| Correct code | 200 | `{"success":true,"userId":3,"reason":"otp_verified"}` |

---

## Web Server — Internal Endpoint

Drop `backend/src/routes/internal.js` from this repo into `brewsecure-backend` and register it:

```js
// in app.js
app.use('/internal', require('./routes/internal'));
```

Bind the web server to the private VLAN interface so this route is unreachable from the public internet. The OTP service calls it over `eth1` with the `X-Internal-Secret` header.
