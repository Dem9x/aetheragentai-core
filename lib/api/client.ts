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
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!payload.ok) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}
