const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

const ACCESS_KEY = "arena_access";
const REFRESH_KEY = "arena_refresh";

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  form?: FormData;
  auth?: boolean;
  retry?: boolean;
};

async function parseError(response: Response): Promise<ApiError> {
  let detail = `Xatolik (${response.status})`;
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") detail = data.detail;
    else if (Array.isArray(data?.detail)) {
      detail = data.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(", ");
    }
  } catch {
    /* empty */
  }
  return new ApiError(response.status, detail);
}

async function refreshTokens(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  try {
    const response = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    tokenStore.set(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = "GET", body, form, auth = true } = options;
  const headers: Record<string, string> = {};
  if (auth && tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;
  if (!form && body !== undefined) headers["Content-Type"] = "application/json";

  return fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await rawRequest(path, options);

  if (response.status === 401 && options.auth !== false && options.retry !== false) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      response = await rawRequest(path, { ...options, retry: false });
    } else {
      tokenStore.clear();
      window.dispatchEvent(new Event("arena:unauthorized"));
    }
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return (await response.json()) as T;
  return (await response.text()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData, method = "POST") =>
    request<T>(path, { method, form }),
};

export async function fetchBlob(url: string): Promise<Blob> {
  const path = url.startsWith("/api") ? url.slice(4) : url;
  const response = await fetch(`${BASE}/api${path}`, {
    headers: tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {},
  });
  if (!response.ok) throw await parseError(response);
  return response.blob();
}

export const apiBase = BASE;

export function absoluteApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE}${path}`;
}
