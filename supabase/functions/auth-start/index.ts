import { badRequest } from "../_shared/http.ts";
import {
  generateCodeChallenge,
  generateCodeVerifier,
} from "../_shared/pkce.ts";
import { createSignedSessionCookie } from "../_shared/session.ts";

const COOKIE_NAME = "pm_oauth_session";
const DEFAULT_SCOPE =
  "openid email profile https://www.googleapis.com/auth/photospicker.mediaitems.readonly";

function buildCookie(value: string, maxAgeSeconds = 600): string {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${maxAgeSeconds}`;
}

Deno.serve(async (req) => {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");
  const sessionSecret = Deno.env.get("SESSION_SECRET");
  const scope = Deno.env.get("GOOGLE_PHOTOS_SCOPE") ?? DEFAULT_SCOPE;
  const fallbackRedirect = Deno.env.get("FRONTEND_URL");

  if (!clientId || !redirectUri || !sessionSecret || !fallbackRedirect) {
    return badRequest("Missing required environment variables.");
  }

  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirect_to") ?? fallbackRedirect;

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  const sessionPayload = {
    state,
    codeVerifier,
    redirectTo,
    issuedAt: Date.now(),
  };

  const cookieValue = await createSignedSessionCookie(
    sessionPayload,
    sessionSecret
  );
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    include_granted_scopes: "true",
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: googleAuthUrl,
      "Set-Cookie": buildCookie(cookieValue),
    },
  });
});
