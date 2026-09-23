const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:6398/api/v1';

const TOKEN_KEY = 'ghm.token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string[]>;
  raw?: unknown;

  constructor(status: number, message: string, code?: string, fields?: Record<string, string[]>, raw?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.raw = raw;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query) {
  const fullPath = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const url = new URL(fullPath, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

type RequestOptions = {
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  raw?: boolean;
};

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;

  if (opts.raw) return res as unknown as T;

  const text = await res.text();
  const data = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; fields?: Record<string, string[]> } })?.error;
    const message = err?.message || res.statusText || `HTTP ${res.status}`;
    throw new ApiError(res.status, message, err?.code, err?.fields, data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  del: <T>(path: string) => request<T>('DELETE', path),
  download: async (path: string, query?: Query, filename?: string) => {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(buildUrl(path, query), { headers });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || extractFilename(res) || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

function extractFilename(res: Response): string | null {
  const cd = res.headers.get('Content-Disposition');
  if (!cd) return null;
  const m = /filename="?([^"]+)"?/.exec(cd);
  return m?.[1] ?? null;
}

export type Paginated<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
};
