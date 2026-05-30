import { createApp } from "./app.js";
import { config } from "./config.js";
import { connectMongo } from "./db.js";

await connectMongo();

const app = createApp();
app.listen(config.port, () => {
  console.log(`AetherAgentAI API listening on http://localhost:${config.port} (${config.mode})`);
});
