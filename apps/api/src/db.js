import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectMongo() {
  if (!config.mongoUri) {
    throw new Error("MONGODB_URI is required for apps/api. Use MongoDB Atlas or a local MongoDB instance.");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri, {
    autoIndex: true
  });
}
