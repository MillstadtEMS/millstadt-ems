/**
 * Single Neon serverless client factory. Use this everywhere instead of
 * re-declaring the same `function sql() { ... }` in each module.
 */
import { neon } from "@neondatabase/serverless";

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}
