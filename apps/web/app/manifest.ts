import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AetherAgentAI",
    short_name: "AAA Terminal",
    description: "The Proof-of-Intelligence Network for validated AI task contributions.",
    start_url: "/terminal",
    display: "standalone",
    background_color: "#020305",
    theme_color: "#18f0ff",
    icons: []
  };
}
