/**
 * Shared API client.
 *
 * Per the S3 New App Playbook (section 6, "React: one feature, one folder"),
 * every feature's `api.ts` calls through this client — not `fetch` directly.
 * That gives one place to attach the Entra bearer token, normalize errors,
 * and switch transports later if needed.
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

export async function apiFetch<T = unknown>(
  path: string,
  options: Options = {},
): Promise<T> {
  const { body, headers = {}, ...rest } = options;

  // CONFIGURE ME: once Entra OIDC is live, pull the bearer token from
  // wherever you store it (cookie, in-memory, session storage) and attach:
  //   headers["Authorization"] = `Bearer ${token}`;

  const init: RequestInit = {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(path, init);
  const text = await response.text();
  const parsed = text ? safeJson(text) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      parsed ?? text,
      `API ${response.status} on ${path}`,
    );
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
