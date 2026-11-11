export class ApiError extends Error {
  constructor(status, error) {
    super(error?.message ?? 'The server could not complete this request.');
    this.status = status;
    this.code = error?.code;
    this.field = error?.field;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-Sweety-Request'] = '1';
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
    signal,
    credentials: 'same-origin',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    if (payload?.error?.code === 'UNAUTHENTICATED')
      window.dispatchEvent(new Event('sweety:session-expired'));
    throw new ApiError(response.status, payload?.error);
  }
  return payload.data;
}
