import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";

/**
 * Whether server-side persistence is configured.
 *
 * The app is deployable without a database — every persistence-backed route
 * degrades to a clear "not configured yet" response rather than a crash, and
 * the browser-only assessment keeps working untouched.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (see .env.local.example)."
    );
  }
  // Cached across invocations so a warm serverless instance reuses the
  // connection rather than rebuilding it per request.
  cached ??= drizzle(neon(url), { schema });
  return cached;
}
