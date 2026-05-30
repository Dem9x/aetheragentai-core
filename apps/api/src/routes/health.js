import { Router } from "express";
import mongoose from "mongoose";
import { config } from "../config.js";
import { ok } from "../utils/response.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  ok(res, {
    service: "aetheragentai-api",
    status: "ok",
    mode: config.mode,
    mongo: mongoose.connection.readyState === 1 ? "connected" : "not_connected",
    safety: "testnet-first; rewards are protocol-based and not guaranteed"
  });
});
