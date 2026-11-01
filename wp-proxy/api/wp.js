// Relays WordPress REST requests for the palypress Worker.
// The publication sites' Cloudflare bot protection challenges every request
// that comes from Cloudflare Workers, so the Worker sends its WordPress calls
// here (Vercel, AWS egress) instead. Only the publication hosts and /wp-json/
// paths are allowed, and every request must carry the shared key.
import { timingSafeEqual } from "node:crypto";

const ALLOWED_HOSTS = new Set([
  "anthromagazine.org",
  "cmagazine.org",
  "infocusnews.tv",
  "inkliterarymag.org",
  "palyveritas.com",
  "palyvoice.com",
  "thecampanile.org",
  "verdemagazine.com",
  "vikingsportsmag.com",
]);
const FORWARDED_REQUEST_HEADERS = ["authorization", "content-type", "accept"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "x-wp-total", "x-wp-totalpages"];
const USER_AGENT = "PalyJournalismApp/1.0 (+https://palymac.org/incubator/)";

function keyMatches(given) {
  const expected = process.env.WP_PROXY_KEY || "";
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseTarget(request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return null;
  try {
    const target = new URL(raw);
    const allowed =
      target.protocol === "https:" &&
      ALLOWED_HOSTS.has(target.hostname) &&
      target.pathname.startsWith("/wp-json/");
    return allowed ? target : null;
  } catch {
    return null;
  }
}

async function handler(request) {
  if (!keyMatches(request.headers.get("x-wp-proxy-key"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const target = parseTarget(request);
  if (!target) {
    return new Response("Target not allowed", { status: 400 });
  }

  const headers = { "User-Agent": USER_AGENT };
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  const hasBody = !["GET", "HEAD"].includes(request.method);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "follow",
    });
    const responseHeaders = new Headers({ "cache-control": "no-store" });
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("WordPress relay failed", target.hostname, error);
    return new Response("Upstream request failed", { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
