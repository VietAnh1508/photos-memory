import { badRequest, jsonResponse } from "../_shared/http.ts";
import { verifySignedSessionCookie } from "../_shared/session.ts";
import { getTokenRecord, upsertTokenRecord } from "../_shared/store.ts";

const COOKIE_NAME = "pm_oauth_session";
const ALLOWED_ORIGIN = Deno.env.get("FRONTEND_URL");

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return header.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.trim().split("=");
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function corsHeaders(origin: string | null) {
  const allowOrigin =
    origin && ALLOWED_ORIGIN && origin.startsWith(ALLOWED_ORIGIN)
      ? origin
      : ALLOWED_ORIGIN ?? "";
  return allowOrigin
    ? {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      }
    : {};
}

async function refreshAccessToken({
  refreshToken,
  clientId,
  clientSecret,
}: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}) {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh access token: ${await response.text()}`);
  }

  return response.json() as Promise<{
    access_token: string;
    expires_in: number;
  }>;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const sessionSecret = Deno.env.get("SESSION_SECRET");
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!sessionSecret || !clientId || !clientSecret) {
    return badRequest("Missing server configuration.");
  }

  const cookies = parseCookies(req.headers.get("cookie"));
  const cookie = cookies[COOKIE_NAME];
  if (!cookie) {
    return jsonResponse(
      { error: "Not authenticated." },
      { status: 401, headers }
    );
  }

  const session = await verifySignedSessionCookie(cookie, sessionSecret);
  const googleUserId = session?.googleUserId as string | undefined;

  if (!googleUserId) {
    return jsonResponse(
      { error: "Invalid session." },
      { status: 401, headers }
    );
  }

  const record = await getTokenRecord(googleUserId);
  if (!record) {
    return jsonResponse(
      { error: "No stored credentials. Re-authenticate." },
      { status: 401, headers }
    );
  }

  try {
    const refreshed = await refreshAccessToken({
      refreshToken: record.refresh_token,
      clientId,
      clientSecret,
    });
    await upsertTokenRecord({
      google_user_id: googleUserId,
      refresh_token: record.refresh_token,
      access_token: refreshed.access_token,
      token_expires_at: new Date(
        Date.now() + refreshed.expires_in * 1000
      ).toISOString(),
      profile_email: record.profile_email,
    });

    return jsonResponse(
      { accessToken: refreshed.access_token, expiresIn: refreshed.expires_in },
      { headers }
    );
  } catch (refreshError) {
    console.error(refreshError);
    return jsonResponse(
      { error: "Failed to refresh access token." },
      { status: 500, headers }
    );
  }
});
