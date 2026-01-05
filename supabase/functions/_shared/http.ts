export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
    ...init,
  });
}

export function redirectResponse(url: string, init: ResponseInit = {}): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      ...(init.headers ?? {}),
    },
    ...init,
  });
}

export function badRequest(message: string, status = 400): Response {
  return jsonResponse({ error: message }, { status });
}
