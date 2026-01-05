const encoder = new TextEncoder();

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + pad);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

async function hmacSHA256(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64UrlEncode(signature);
}

export async function createSignedSessionCookie(payload: Record<string, unknown>, secret: string): Promise<string> {
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await hmacSHA256(body, secret);
  return `${body}.${signature}`;
}

export async function verifySignedSessionCookie(cookie: string, secret: string): Promise<Record<string, unknown> | null> {
  const [body, signature] = cookie.split('.');
  if (!body || !signature) {
    return null;
  }
  const expectedSignature = await hmacSHA256(body, secret);
  if (expectedSignature !== signature) {
    return null;
  }
  try {
    const decoded = new TextDecoder().decode(base64UrlDecode(body));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch (error) {
    console.error('Failed to parse session cookie', error);
    return null;
  }
}
