type ApiEnvelope<T> =
  | {
      ok: true;
      data: T;
      meta: { requestId: string; timestamp: string; version: string };
    }
  | {
      ok: false;
      error: { code: string; message: string; details?: unknown };
      meta: { requestId: string; timestamp: string; version: string };
    };

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  const raw = await response.text();
  if (!raw) {
    throw new Error(`Empty response from ${url} (${response.status})`);
  }

  let payload: ApiEnvelope<T>;
  try {
    payload = JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    throw new Error(`Non-JSON response from ${url} (${response.status}): ${raw.slice(0, 180)}`);
  }

  if (!payload.ok) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}
