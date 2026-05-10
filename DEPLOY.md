# SkyHistory Production Deployment

This project is split into:

- React frontend on Netlify
- API server on Render/Railway
- Queue worker on Render/Railway
- Postgres + Redis

## 1) Local smoke test

```bash
npm install
cp .env.example .env

# terminal 1
npm run dev:server

# terminal 2
npm run dev:worker

# terminal 3
npm run dev
```

Open `http://localhost:5173`.

## 2) Netlify frontend

1. Import repository to Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add env var:
   - `VITE_API_BASE_URL=https://<your-api-domain>`
5. Deploy.

`netlify.toml` already includes SPA redirect rules.

## 3) Render backend + worker + data

Use `render.yaml` for one-click blueprint deploy, or create services manually:

- `skyhistory-api` (`npm run start:api`)
- `skyhistory-worker` (`npm run start:worker`)
- Postgres instance
- Redis instance

Set API/worker env vars:

- `NODE_ENV=production`
- `FRONTEND_ORIGIN=https://<your-netlify-domain>`
- `CORS_ORIGINS=https://<your-netlify-domain>`
- `APP_JWT_SECRET=<long-random-secret>`
- `DATABASE_URL=<managed-postgres-url>`
- `REDIS_URL=<managed-redis-url>`
- `GOOGLE_CLIENT_ID=<from-google-cloud>`
- `GOOGLE_CLIENT_SECRET=<from-google-cloud>`
- `GOOGLE_REDIRECT_URI=https://<your-api-domain>/api/auth/google/callback`
- `GEMINI_API_KEY=<optional-but-recommended>`
- `INLINE_WORKER=false` (API service only)

## 4) Google OAuth setup

In Google Cloud Console:

1. Enable Gmail API.
2. Configure OAuth consent screen.
3. Create OAuth Client (Web Application).
4. Add Authorized redirect URI:

`https://<your-api-domain>/api/auth/google/callback`

If testing users are restricted, add your Gmail account as test user.

## 5) First production test

1. Open Netlify app.
2. Click Gmail and complete OAuth.
3. Verify `/scan` page receives SSE progress.
4. Ensure dashboard shows parsed flights.
5. Test iCloud with an App Password.

## 6) Operational notes

- Worker must stay running; API enqueues parse jobs.
- Redis is used for queue + airport cache + temporary iCloud sessions.
- Flights are deduplicated by `(user_id, source, message_hash)`.
- If Gemini key is missing, parser falls back to heuristic extraction.
