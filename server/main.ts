import { Hono } from "@hono/hono";

export const app = new Hono().basePath("/api");

app.get("/health", (c) =>
  c.json({ status: "ok", serverZeit: new Date().toISOString() })
);

if (import.meta.main) {
  Deno.serve({ port: 8000 }, app.fetch);
}
