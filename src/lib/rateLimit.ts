import { headers } from "next/headers";

interface Bucket {
  count: number;
  resetAt: number;
}

// Per-instance fixed-window limiter. On serverless this resets with the
// instance, which is fine for its purpose: blunting credential-stuffing and
// reset-code brute force on an internal app (codes also expire and die on use).
const buckets = new Map<string, Bucket>();

export async function rateLimitOk(
  scope: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${scope}:${ip}`;
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count++;
  if (buckets.size > 10_000) buckets.clear(); // pathological growth guard
  return bucket.count <= max;
}
