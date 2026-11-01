import assert from "node:assert/strict";

import { wpFetch } from "./wpFetch";

const calls: { url: string; init: RequestInit }[] = [];
globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
  calls.push({ url: String(url), init });
  return new Response("[]");
}) as typeof fetch;

async function main() {
  const target = "https://palyvoice.com/wp-json/wp/v2/comments?post=1&page=2";

  delete process.env.WP_PROXY_URL;
  delete process.env.WP_PROXY_KEY;
  await wpFetch(target, { headers: { Authorization: "Basic abc" } });
  assert.equal(calls[0].url, target, "without a relay configured, fetch WordPress directly");

  process.env.WP_PROXY_URL = "https://relay.example/api/wp";
  process.env.WP_PROXY_KEY = "secret";
  await wpFetch(target, {
    method: "POST",
    headers: { Authorization: "Basic abc", "Content-Type": "application/json" },
    body: "{}",
  });
  const relayed = calls[1];
  assert.equal(
    relayed.url,
    `https://relay.example/api/wp?url=${encodeURIComponent(target)}`,
    "with a relay configured, the full WordPress URL goes in the url parameter",
  );
  const headers = new Headers(relayed.init.headers);
  assert.equal(headers.get("x-wp-proxy-key"), "secret", "relay key is sent");
  assert.equal(headers.get("authorization"), "Basic abc", "WordPress auth is kept");
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(relayed.init.method, "POST", "method is kept");
  assert.equal(relayed.init.body, "{}", "body is kept");

  console.log("wpFetch tests passed");
}

main();
