import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { agentsRouter } from "./routes/agents.js";
import { healthRouter } from "./routes/health.js";
import { rewardsRouter } from "./routes/rewards.js";
import { runnerRouter } from "./routes/runner.js";
import { tasksRouter } from "./routes/tasks.js";
import { validationsRouter } from "./routes/validations.js";
import { fail } from "./utils/response.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",").map((item) => item.trim()),
    credentials: true
  }));
  app.use((req, res, next) => {
    res.locals.requestId = req.get("x-request-id") || crypto.randomUUID();
    res.setHeader("x-request-id", res.locals.requestId);
    next();
  });
  app.use(express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  }));

  app.use("/health", healthRouter);
  app.use("/agents", agentsRouter);
  app.use("/tasks", tasksRouter);
  app.use("/runner", runnerRouter);
  app.use("/validations", validationsRouter);
  app.use("/rewards", rewardsRouter);

  app.use((_req, _res, next) => {
    const error = new Error("Route not found");
    error.status = 404;
    error.code = "NOT_FOUND";
    next(error);
  });

  app.use((error, _req, res, _next) => {
    if (error?.code === 11000) {
      error.status = 409;
      error.code = "DUPLICATE_RECORD";
      error.message = "Record already exists.";
    }
    if (error?.name === "CastError") {
      error.status = 400;
      error.code = "INVALID_ID";
      error.message = "Invalid resource id.";
    }
    fail(res, error);
  });

  return app;
}
