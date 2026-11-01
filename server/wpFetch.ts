// Fetches a publication's WordPress REST API. The publication sites' Cloudflare
// bot protection challenges every request coming from Cloudflare Workers, so on
// the Worker these calls go through the Vercel relay in wp-proxy/ (set
// WP_PROXY_URL and WP_PROXY_KEY). Without those set, this is a plain fetch.
export function wpFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const proxyUrl = process.env.WP_PROXY_URL;
  const proxyKey = process.env.WP_PROXY_KEY;
  if (!proxyUrl || !proxyKey) return fetch(url, init);

  const headers = new Headers(init.headers);
  headers.set("x-wp-proxy-key", proxyKey);
  return fetch(`${proxyUrl}?url=${encodeURIComponent(url)}`, {
    ...init,
    headers,
  });
}
