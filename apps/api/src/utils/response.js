export function ok(res, data, status = 200) {
  return res.status(status).json({
    ok: true,
    data,
    meta: {
      requestId: res.locals.requestId,
      timestamp: new Date().toISOString(),
      version: "express-mongoose-mvp"
    }
  });
}

export function fail(res, error) {
  return res.status(error.status || 500).json({
    ok: false,
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "Unexpected API error",
      details: error.details
    },
    meta: {
      requestId: res.locals.requestId,
      timestamp: new Date().toISOString(),
      version: "express-mongoose-mvp"
    }
  });
}
