const encoder = new TextEncoder();

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateCodeVerifier(length = 64): string {
  const validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
  let result = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < randomValues.length; i += 1) {
    result += validChars[randomValues[i] % validChars.length];
  }
  return result;
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}
