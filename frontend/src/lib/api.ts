/**
 * Shared API client.
 *
 * Every feature's api.ts calls through this — never `fetch` directly. That
 * gives one place to handle auth redirects, attach CSRF tokens, and normalize
 * errors.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: Record<string, string>;
};

function getCsrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export async function apiFetch<T = unknown>(
  path: string,
  options: Options = {},
): Promise<T> {
  const { body, headers = {}, method = "GET", ...rest } = options;

  const needsCsrf = !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(needsCsrf ? { "X-CSRFToken": getCsrfToken() } : {}),
    ...headers,
  };

  const response = await fetch(path, {
    ...rest,
    method,
    headers: finalHeaders,
    credentials: "same-origin",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const parsed = text ? safeJson(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, parsed ?? text, `API ${response.status} on ${path}`);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); }
  catch { return text; }
}
