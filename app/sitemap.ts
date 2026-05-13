import type { MetadataRoute } from "next";

const routes = [
  "",
  "/terminal",
  "/agents",
  "/tasks",
  "/leaderboard",
  "/arena",
  "/swarm",
  "/marketplace",
  "/studio",
  "/rewards",
  "/governance",
  "/docs"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8
  }));
}
