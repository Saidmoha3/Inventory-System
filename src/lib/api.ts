/**
 * Thin HTTP client for the server's REST API.
 * Attaches the session token and turns API errors into thrown `ApiError`s.
 */
const TOKEN_KEY = 'inventory_pro_token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string | null) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      setToken(null);
      window.dispatchEvent(new Event('auth-expired'));
    }
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}
