import { NextResponse } from "next/server";

type ApiMeta = {
  requestId: string;
  timestamp: string;
  version: string;
};

type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta: ApiMeta;
};

type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
};

function createMeta(): ApiMeta {
  return {
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    version: "2026-05-mvp"
  };
}

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  const payload: ApiSuccess<T> = {
    ok: true,
    data,
    meta: createMeta()
  };

  return NextResponse.json(toJsonSafe(payload), init);
}

export function apiError(code: string, message: string, status = 400, details?: unknown) {
  const payload: ApiFailure = {
    ok: false,
    error: {
      code,
      message,
      details
    },
    meta: createMeta()
  };

  return NextResponse.json(toJsonSafe(payload), { status });
}

export function validateString(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 80) : fallback;
}

function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (typeof item === "bigint") return item.toString();
      return item;
    })
  ) as T;
}
