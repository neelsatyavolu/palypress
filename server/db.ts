import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Neon's HTTP driver sends each query as its own fetch, so it holds no
// sockets between requests. Cloudflare Workers require that.
export const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
