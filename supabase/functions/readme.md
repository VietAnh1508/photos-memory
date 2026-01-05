# Supabase Edge Functions for Photos Memory

This folder contains Supabase edge functions that implement an OAuth 2.0 authorization-code flow with PKCE for Google Photos Picker, store refresh tokens securely in Supabase Postgres, and expose a token-refresh endpoint to the frontend.

## Functions

- `auth-start`: begins the Google OAuth flow, generating PKCE verifier/challenge, storing temporary state in a signed cookie, and redirecting users to the Google consent screen.
- `auth-callback`: handles Google's redirect, exchanges the authorization code for access + refresh tokens, stores the refresh token, and issues a persistent session cookie tied to the Google user ID.
- `photos-token`: validates the session cookie, refreshes the Google access token using the stored refresh token, and returns a fresh access token to the frontend.

## Quick Start

1. Install the Supabase CLI and log in:
   ```bash
   npm install -g supabase
   supabase login
   ```
2. Initialize and link your project (if not already done):
   ```bash
   supabase init
   supabase link --project-ref <project-ref>
   ```
3. Copy environment variables:
   ```bash
   cd supabase
   cp .env.example .env
   ```
   Fill in the placeholders (Google client ID/secret, Supabase URL, service-role key, session secret, etc.).
4. Run the local stack:
   ```bash
   supabase start
   ```
   This spins up Postgres, Studio, and the edge runtime.
5. Deploy the edge functions:
   ```bash
   supabase functions deploy auth-start --no-verify-jwt
   supabase functions deploy auth-callback --no-verify-jwt
   supabase functions deploy photos-token --no-verify-jwt
   ```
6. Set production secrets (examples):
   ```bash
   supabase secrets set \
     GOOGLE_CLIENT_ID=... \
     GOOGLE_CLIENT_SECRET=... \
     GOOGLE_REDIRECT_URI=https://<frontend-domain>/api/auth-callback \
     GOOGLE_PHOTOS_SCOPE="openid email profile https://www.googleapis.com/auth/photospicker.mediaitems.readonly" \
     SUPABASE_URL=https://<project-ref>.supabase.co \
     SUPABASE_SERVICE_ROLE_KEY=... \
     SUPABASE_FRONTEND_URL=https://<frontend-domain> \
     SESSION_SECRET=$(openssl rand -hex 32)
   ```

## Frontend Integration

- Keep functions first-party by proxying `/api/*` on your frontend domain to the Supabase function host (e.g., via Vercel middleware/rewrites). Set `VITE_SUPABASE_FUNCTION_URL=https://<frontend-domain>/api`.
- If you call `*.functions.supabase.co` directly from the SPA, browsers may block the session cookie (third-party), breaking the state check in `auth-callback`.
- SPA flow: `/api/auth-start?redirect_to=<current-url>` → Google → `/api/auth-callback` sets `pm_oauth_session` → `/api/photos-token` returns a short-lived access token for Google Photos Picker REST calls.

## Storage

`supabase/migrations/20260104000000_photos_tokens.sql` creates the `photos_tokens` table. Run migrations locally with `supabase db reset` or via `supabase db push` to apply them to your project.

## TODO / Enhancements

- Encrypt refresh tokens at rest (e.g., using pgcrypto or Supabase Vault).
- Add rate limiting / abuse protection around the edge functions.
- Implement logout (delete the refresh token row and clear cookies).
