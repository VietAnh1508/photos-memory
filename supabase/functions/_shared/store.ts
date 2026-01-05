const tableUrl = (() => {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) {
    throw new Error('Missing SUPABASE_URL environment variable.');
  }
  return `${url.replace(/\/$/, '')}/rest/v1/photos_tokens`;
})();

const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
}

type TokenRecord = {
  google_user_id: string;
  refresh_token: string;
  access_token?: string;
  token_expires_at?: string;
  profile_email?: string;
};

async function supabaseFetch(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${tableUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

export async function upsertTokenRecord(record: TokenRecord): Promise<void> {
  const response = await supabaseFetch('', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to upsert token record: ${message}`);
  }
}

export async function getTokenRecord(googleUserId: string): Promise<TokenRecord | null> {
  const response = await supabaseFetch(`?google_user_id=eq.${encodeURIComponent(googleUserId)}&limit=1`, {
    method: 'GET',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to fetch token record: ${message}`);
  }

  const data = (await response.json()) as TokenRecord[];
  return data[0] ?? null;
}
