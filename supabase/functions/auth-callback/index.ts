import { badRequest, jsonResponse } from '../_shared/http.ts';
import { verifySignedSessionCookie, createSignedSessionCookie } from '../_shared/session.ts';
import { upsertTokenRecord, getTokenRecord } from '../_shared/store.ts';

const COOKIE_NAME = 'pm_oauth_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.trim().split('=');
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function buildCookie(value: string, maxAgeSeconds = SESSION_MAX_AGE): string {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${maxAgeSeconds}`;
}

async function exchangeCode({
  code,
  codeVerifier,
  clientId,
  clientSecret,
  redirectUri,
}: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const body = new URLSearchParams({
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${await response.text()}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
  }>;
}

async function fetchUserInfo(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${await response.text()}`);
  }

  return response.json() as Promise<{ sub: string; email?: string }>; // minimal fields needed
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return badRequest(`Google OAuth error: ${error}`);
  }

  if (!code || !state) {
    return badRequest('Missing code or state parameter.');
  }

  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const cookie = cookies[COOKIE_NAME];
  const sessionSecret = Deno.env.get('SESSION_SECRET');

  if (!sessionSecret) {
    return badRequest('Missing SESSION_SECRET.');
  }

  if (!cookie) {
    return badRequest('Missing OAuth session cookie.');
  }

  const session = await verifySignedSessionCookie(cookie, sessionSecret);

  if (!session || session.state !== state) {
    return badRequest('Invalid OAuth session.');
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

  if (!clientId || !clientSecret || !redirectUri) {
    return badRequest('Missing Google OAuth configuration.');
  }

  try {
    const tokenResponse = await exchangeCode({ code, codeVerifier: String(session.codeVerifier), clientId, clientSecret, redirectUri });
    const userInfo = await fetchUserInfo(tokenResponse.access_token);
    const existing = await getTokenRecord(userInfo.sub);
    const refreshToken = tokenResponse.refresh_token ?? existing?.refresh_token;

    if (!refreshToken) {
      return jsonResponse({ error: 'Missing refresh token; please re-consent.' }, { status: 401 });
    }

    await upsertTokenRecord({
      google_user_id: userInfo.sub,
      refresh_token: refreshToken,
      access_token: tokenResponse.access_token,
      token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
      profile_email: userInfo.email,
    });

    const newSessionCookie = await createSignedSessionCookie(
      {
        state: crypto.randomUUID(),
        codeVerifier: session.codeVerifier,
        redirectTo: session.redirectTo,
        issuedAt: Date.now(),
        googleUserId: userInfo.sub,
      },
      sessionSecret,
    );

    const location = String(session.redirectTo ?? '/');
    return new Response(null, {
      status: 302,
      headers: {
        Location: location,
        'Set-Cookie': buildCookie(newSessionCookie, SESSION_MAX_AGE),
      },
    });
  } catch (callbackError) {
    console.error(callbackError);
    return jsonResponse({ error: 'OAuth callback failed.' }, { status: 500 });
  }
});
