# Photos Memory

Vite + React SPA for picking a curated set of Google Photos, caching the selected `mediaItems`, and showing one random photo fullscreen on each visit. Auth and token refresh run on Supabase Edge Functions; the SPA never holds refresh tokens.

## Prerequisites

1. **Google Cloud project** with the Google Photos Picker API enabled.
2. **OAuth client (Web application)** configured with:
   - Authorized JavaScript origins: your Vercel domain (e.g., `https://photos-memory-dvx.vercel.app`) and `http://localhost:5173` for dev.
   - Authorized redirect URI: your Vercel `/api/auth-callback` (e.g., `https://photos-memory-dvx.vercel.app/api/auth-callback`) and `http://localhost:54321/functions/v1/auth-callback` for local Supabase.
3. **API key + OAuth Client ID** in the SPA `.env`, and **OAuth client secret + service role key** stored as Supabase secrets.

Create an `.env` file from the provided template:

```bash
cp .env.example .env
```

Then edit the values:

```
VITE_GOOGLE_CLIENT_ID=your-client.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSy...
VITE_PHOTOS_MAX_ITEM_COUNT=50
VITE_SUPABASE_FUNCTION_URL=https://your-frontend-domain/api
```

## Installation

Install dependencies (needs network):
```bash
npm install
```

## Development

1) Start Supabase locally:
```bash
supabase start
```
2) Run the app:
```bash
npm run dev
```
Dev server: `http://localhost:5173` (functions proxied through `http://localhost:54321/functions/v1` when `VITE_SUPABASE_FUNCTION_URL` points there).

## Production Build

```bash
npm run build
npm run preview
```

## How It Works

- Opens the Google Photos Picker in a popup, polls until media are selected, saves them in `localStorage`, and picks a random one on each load. Adjust `VITE_PHOTOS_MAX_ITEM_COUNT` to limit selections per session.
- Fullscreen display with a contextual memory caption (“On this day…” when applicable) and controls to select, shuffle, or clear.

### Authentication flow (SPA ↔ Supabase Edge ↔ Google)
1. SPA calls `/api/auth-start` (rewritten to Supabase `auth-start`); edge issues PKCE state, sets `pm_oauth_session` cookie, and redirects to Google.
2. Google redirects to `/api/auth-callback`; edge verifies state/cookie, exchanges the code for tokens, stores the refresh token in Supabase, and sets a long-lived session cookie tied to the Google user ID.
3. SPA calls `/api/photos-token` with `credentials: 'include'`; edge refreshes (or reuses) the access token and returns a short-lived access token.
4. SPA uses that access token to call Google Photos Picker endpoints and to fetch the selected photo blob for display.

## Next Steps

- Improve error surfaces (quota exceeded, popup blocked) with richer UI states.
- Add responsive previews or a grid of recent pulls beneath the fullscreen hero.
- Optional: switch to a custom domain for Supabase functions if you don’t want middleware rewrites.
